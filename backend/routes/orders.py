"""Order routes.

Purchaser:
  POST   /orders/checkout                place an order from the cart
  GET    /orders                         list own orders
  GET    /orders/<id>                    order detail
  POST   /orders/<id>/reorder            clone an order's items into cart
  POST   /orders/<id>/cancel_request     request cancellation (after seller accepts)
  GET    /orders/<id>/events             status / cancel-request timeline
  GET    /orders/<id>/messages           order chat thread (channel=order|courier)
  POST   /orders/<id>/messages           append to thread (body, channel)
  POST   /orders/<id>/courier_reply      trigger a scripted courier reply (demo helper)
  POST   /orders/<id>/rating             leave a 1-5 star rating (delivered only)
  POST   /orders/<id>/tip                tip the courier (mocked; no real payment)

Seller:
  GET    /orders/incoming                orders for this seller's merchant
  PATCH  /orders/<id>/status             advance status (auto-assigns mock courier on out_for_delivery)
  POST   /orders/<id>/cancel_response    approve or deny purchaser cancellation request
  POST   /orders/<id>/delivery_photo     attach a delivery photo URL (mocked)

Admin:
  GET    /orders/all                     every order
  PATCH  /orders/<id>/status             can set any status incl. cancelled

Status transitions:
  pending → accepted → preparing → out_for_delivery → delivered
  pending → cancelled (purchaser direct, while still pending)
  accepted/preparing → cancelled (via cancel_request approved by seller, or admin force)
  any → cancelled (admin)
"""

import hashlib
import json
import random
from datetime import date, datetime

from flask import Blueprint, g, jsonify, request

from auth import login_required, role_required
from db import execute, get_connection, query_all, query_one


ALL_STATUSES = (
    "pending", "pending_review", "awaiting_customer",
    "accepted", "preparing", "out_for_delivery", "delivered", "cancelled",
)

# Allowed delivery_window strings for scheduled orders (1-hour slots, 09–21).
# Backend accepts these literal strings; anything else is treated as freeform
# (no rejection — schema only constrains length).
SCHEDULED_SLOTS = [f"{h:02d}:00–{h+1:02d}:00" for h in range(9, 21)]
URGENT_SLOT = "ASAP (1–2h)"


# ── Pass 3: mocked courier / delivery-photo / scripted-reply data ──────────

COURIER_NAMES = [
    ("Khun Nat",  "+66 89 555 0142"),
    ("Khun Pim",  "+66 89 555 0187"),
    ("Khun Boom", "+66 89 555 0219"),
    ("Khun Earth","+66 89 555 0274"),
    ("Khun June", "+66 89 555 0301"),
]

# Stylised Bangkok-ish origin (Sukhumvit 31). Destinations are deterministic
# per-order so the SVG map dots stay stable across reloads.
ORIGIN_LAT_LNG = (13.7411820, 100.5670400)

# Preset delivery photos (Unsplash CDN — same pattern as curated images).
# `source.unsplash.com/featured/?q=...` was deprecated Oct 2024 and returns 503 —
# these direct `images.unsplash.com/photo-<id>` URLs are stable.
DELIVERY_PHOTO_PRESETS = [
    "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80",  # bouquet at doorstep
    "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=900&q=80",  # wrapped bouquet
    "https://images.unsplash.com/photo-1508610048659-a06b669e3321?auto=format&fit=crop&w=900&q=80",  # bouquet on table
    "https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?auto=format&fit=crop&w=900&q=80",  # bouquet at reception
]

# Two-line scripted courier reply pairs. _pick_courier_reply rotates by message
# count so the demo can fire one tap to advance the conversation.
COURIER_SCRIPT = [
    "On my way — about 12 min out.",
    "I'm at the gate now. Will leave it with reception if no one answers.",
    "Just dropped it off — left at reception. Have a great day!",
    "Thanks for tipping — appreciated!",
]


def _seed_for_order(order_id):
    h = hashlib.md5(str(order_id).encode()).hexdigest()
    return int(h[:8], 16)


def _dest_for_order(order_id):
    """Deterministic destination ~3km from origin so the map line looks reasonable."""
    rnd = random.Random(_seed_for_order(order_id))
    dlat = (rnd.random() - 0.5) * 0.04   # ~ ±2.2 km lat
    dlng = (rnd.random() - 0.5) * 0.04
    return (round(ORIGIN_LAT_LNG[0] + dlat, 7), round(ORIGIN_LAT_LNG[1] + dlng, 7))


def _pick_courier(order_id):
    return COURIER_NAMES[_seed_for_order(order_id) % len(COURIER_NAMES)]


bp = Blueprint("orders", __name__)


SELLER_NEXT = {
    "pending": "accepted",
    # pending_review / awaiting_customer use the concierge_* endpoints, not
    # the generic status PATCH. They are intentionally absent here.
    "accepted": "preparing",
    "preparing": "out_for_delivery",
    "out_for_delivery": "delivered",
}


# ── helpers ─────────────────────────────────────────────────────────────────

def _serialize_order(o):
    if "delivery_date" in o and o["delivery_date"] is not None:
        o["delivery_date"] = str(o["delivery_date"])
    if o.get("created_at"):
        o["created_at"] = str(o["created_at"])
    # MySQL JSON column → object for frontend
    if o.get("concierge_brief") and isinstance(o["concierge_brief"], str):
        try:
            o["concierge_brief"] = json.loads(o["concierge_brief"])
        except (TypeError, ValueError):
            o["concierge_brief"] = None
    if o.get("dispatched_at"):
        o["dispatched_at"] = str(o["dispatched_at"])
    if o.get("delivery_photo_at"):
        o["delivery_photo_at"] = str(o["delivery_photo_at"])
    if o.get("tip_at"):
        o["tip_at"] = str(o["tip_at"])
    # DECIMAL columns come back as Decimal — JSON-serialise as float.
    for k in ("courier_lat", "courier_lng", "dest_lat", "dest_lng"):
        if k in o and o[k] is not None:
            try:
                o[k] = float(o[k])
            except (TypeError, ValueError):
                pass
    return o


def _hydrate_items(order_id: int):
    items = query_all(
        """SELECT id, item_type, curated_bouquet_id, curated_name, custom_label,
                  intent_occasion, intent_recipient, intent_message,
                  unit_price_thb, quantity
           FROM order_items WHERE order_id = %s ORDER BY id""",
        (order_id,),
    )
    if not items:
        return []
    ids = tuple(i["id"] for i in items)
    placeholders = ",".join(["%s"] * len(ids))
    flowers = query_all(
        f"""SELECT order_item_id, flower_id, name_snapshot, color_snapshot,
                   unit_price_snapshot, quantity
            FROM order_item_flowers WHERE order_item_id IN ({placeholders})""",
        ids,
    )
    by_item = {}
    for f in flowers:
        by_item.setdefault(f["order_item_id"], []).append({
            "flower_id":           f["flower_id"],
            "name":                f["name_snapshot"],
            "color":               f["color_snapshot"],
            "unit_price_thb":      f["unit_price_snapshot"],
            "quantity":            f["quantity"],
        })
    for i in items:
        i["flowers"] = by_item.get(i["id"], [])
        i["line_total_thb"] = i["unit_price_thb"] * i["quantity"]
    return items


def _emit_event(order_id, event_type, *, from_status=None, to_status=None,
                actor_id=None, actor_role=None, note=None):
    execute(
        """INSERT INTO order_events
             (order_id, event_type, from_status, to_status, actor_id, actor_role, note)
           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
        (order_id, event_type, from_status, to_status, actor_id, actor_role, note),
    )


def _notify(user_id, kind, title, body=None, href=None, order_id=None):
    if not user_id:
        return
    execute(
        """INSERT INTO notifications (user_id, kind, title, body, href, order_id)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (user_id, kind, title, body, href, order_id),
    )


def _seller_user_for_merchant(merchant_id: int):
    row = query_one("SELECT user_id FROM merchants WHERE id = %s", (merchant_id,))
    return row["user_id"] if row else None


def _apply_voucher(code, subtotal):
    """Returns (discount_thb, error_str). discount_thb is 0 if no/invalid code."""
    if not code:
        return 0, None
    v = query_one("SELECT * FROM vouchers WHERE code = %s AND active = 1", (code.upper(),))
    if not v:
        return 0, "Voucher code not recognised."
    if v["expires_at"] and v["expires_at"] < date.today():
        return 0, "This voucher has expired."
    if subtotal < (v["min_subtotal"] or 0):
        return 0, f"Voucher needs a subtotal of at least ฿{v['min_subtotal']}."
    if v["percent_off"]:
        return int(round(subtotal * v["percent_off"] / 100)), None
    if v["flat_off_thb"]:
        return min(v["flat_off_thb"], subtotal), None
    return 0, None


# ── checkout ───────────────────────────────────────────────────────────────

@bp.post("/checkout")
@role_required("purchaser")
def checkout():
    data = request.get_json(silent=True) or {}
    delivery_date_str = (data.get("delivery_date") or "").strip()
    delivery_window   = (data.get("delivery_window") or "").strip() or None
    delivery_mode     = (data.get("delivery_mode") or "scheduled").strip().lower()
    delivery_address  = (data.get("delivery_address") or "").strip()
    delivery_district = (data.get("delivery_district") or "").strip() or None
    recipient_name    = (data.get("recipient_name") or "").strip()
    recipient_phone   = (data.get("recipient_phone") or "").strip() or None
    recipient_message = (data.get("recipient_message") or "").strip() or None
    voucher_code      = (data.get("voucher_code") or "").strip().upper() or None

    if delivery_mode not in ("scheduled", "urgent"):
        delivery_mode = "scheduled"

    if not delivery_date_str or not delivery_address or not recipient_name:
        return jsonify({"error": "delivery_date, delivery_address, recipient_name required"}), 400
    try:
        delivery_date = datetime.strptime(delivery_date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "delivery_date must be YYYY-MM-DD"}), 400
    if delivery_date < date.today():
        return jsonify({"error": "delivery_date cannot be in the past"}), 400
    if delivery_mode == "urgent":
        # Urgent always = today + ASAP slot, regardless of what the client sent.
        delivery_date = date.today()
        delivery_window = URGENT_SLOT
    elif not delivery_window:
        # Default a sensible scheduled slot if the client omitted one.
        delivery_window = SCHEDULED_SLOTS[2]  # 11:00–12:00

    cart = query_one("SELECT id FROM carts WHERE user_id = %s", (g.user["id"],))
    if not cart:
        return jsonify({"error": "no cart"}), 400
    items = query_all(
        """SELECT id, item_type, curated_bouquet_id, custom_label,
                  intent_occasion, intent_recipient, intent_message,
                  concierge_brief, unit_price_thb, quantity
           FROM cart_items WHERE cart_id = %s""",
        (cart["id"],),
    )
    if not items:
        return jsonify({"error": "cart is empty"}), 400

    merchant_row = query_one("SELECT id FROM merchants ORDER BY id LIMIT 1")
    if not merchant_row:
        return jsonify({"error": "no merchant configured"}), 500
    merchant_id = merchant_row["id"]

    subtotal = sum(i["unit_price_thb"] * i["quantity"] for i in items)
    # Urgent delivery surcharge — added at checkout, not stored on cart items.
    if delivery_mode == "urgent":
        subtotal += 150
    discount, voucher_error = _apply_voucher(voucher_code, subtotal)
    if voucher_error:
        return jsonify({"error": voucher_error}), 400
    total = max(0, subtotal - discount)

    # Order-level concierge brief = the first concierge cart item's brief.
    # (Multi-concierge carts are rare; we surface the first one for review.)
    order_brief = None
    order_preview_url = None
    for it in items:
        raw_brief = it.get("concierge_brief")
        if raw_brief:
            if isinstance(raw_brief, str):
                try:
                    parsed = json.loads(raw_brief)
                except (TypeError, ValueError):
                    parsed = None
            else:
                parsed = raw_brief
            if parsed:
                order_brief = parsed
                order_preview_url = parsed.get("preview_url")
                break

    # Concierge orders enter pending_review so the merchant reads the brief
    # before confirming. Non-concierge orders stay on the old pending flow.
    initial_status = "pending_review" if order_brief else "pending"

    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            """INSERT INTO orders
                 (user_id, merchant_id, subtotal_thb, discount_thb, voucher_code, total_thb,
                  delivery_date, delivery_window, delivery_mode,
                  delivery_address, delivery_district,
                  recipient_name, recipient_phone, recipient_message,
                  concierge_brief, preview_url, status)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (g.user["id"], merchant_id, subtotal, discount, voucher_code, total,
             delivery_date, delivery_window, delivery_mode,
             delivery_address, delivery_district,
             recipient_name, recipient_phone, recipient_message,
             json.dumps(order_brief) if order_brief else None,
             order_preview_url,
             initial_status),
        )
        order_id = cur.lastrowid

        for it in items:
            curated_name = None
            if it["curated_bouquet_id"]:
                cur.execute(
                    "SELECT name FROM curated_bouquets WHERE id = %s",
                    (it["curated_bouquet_id"],),
                )
                row = cur.fetchone()
                if row:
                    curated_name = row["name"]
            cur.execute(
                """INSERT INTO order_items
                     (order_id, item_type, curated_bouquet_id, curated_name,
                      custom_label, intent_occasion, intent_recipient,
                      intent_message, unit_price_thb, quantity)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (
                    order_id, it["item_type"], it["curated_bouquet_id"], curated_name,
                    it["custom_label"], it["intent_occasion"],
                    it["intent_recipient"], it["intent_message"],
                    it["unit_price_thb"], it["quantity"],
                ),
            )
            order_item_id = cur.lastrowid

            cur.execute(
                """SELECT cif.flower_id, cif.quantity, f.name, f.color, f.price_thb
                   FROM cart_item_flowers cif JOIN flowers f ON f.id = cif.flower_id
                   WHERE cif.cart_item_id = %s""",
                (it["id"],),
            )
            stems = cur.fetchall()
            for s in stems:
                cur.execute(
                    """INSERT INTO order_item_flowers
                         (order_item_id, flower_id, name_snapshot, color_snapshot,
                          unit_price_snapshot, quantity)
                       VALUES (%s, %s, %s, %s, %s, %s)""",
                    (
                        order_item_id, s["flower_id"], s["name"], s["color"],
                        s["price_thb"], s["quantity"],
                    ),
                )

        # Drain the cart
        cur.execute("DELETE FROM cart_items WHERE cart_id = %s", (cart["id"],))

        # Seed the timeline + notify the seller of the new order
        seed_note = "Concierge brief submitted" if order_brief else "Order placed"
        cur.execute(
            """INSERT INTO order_events (order_id, event_type, to_status, actor_id, actor_role, note)
               VALUES (%s, 'status', %s, %s, 'purchaser', %s)""",
            (order_id, initial_status, g.user["id"], seed_note),
        )
        seller_user = _seller_user_for_merchant(merchant_id)
        if seller_user:
            if order_brief:
                seller_title = "Concierge brief — please review"
                seller_body  = (
                    f"For {recipient_name} · {delivery_mode} · "
                    f"{delivery_window or 'TBD'} on {delivery_date}"
                )
            else:
                seller_title = "New order received"
                seller_body  = (
                    f"For {recipient_name} — {delivery_window or 'scheduled'} "
                    f"on {delivery_date}"
                )
            cur.execute(
                """INSERT INTO notifications (user_id, kind, title, body, href, order_id)
                   VALUES (%s, 'order.status', %s, %s, %s, %s)""",
                (
                    seller_user,
                    seller_title,
                    seller_body,
                    f"/(seller)/orders/{order_id}",
                    order_id,
                ),
            )

        conn.commit()
        cur.close()
    finally:
        conn.close()

    return jsonify({
        "order_id":     order_id,
        "subtotal_thb": subtotal,
        "discount_thb": discount,
        "total_thb":    total,
        "status":       initial_status,
    }), 201


# ── purchaser views ────────────────────────────────────────────────────────

@bp.get("")
@role_required("purchaser")
def list_my_orders():
    orders = query_all(
        """SELECT o.id, o.subtotal_thb, o.discount_thb, o.voucher_code, o.total_thb,
                  o.delivery_date, o.delivery_window, o.delivery_mode,
                  o.delivery_address, o.recipient_name,
                  o.recipient_message, o.status, o.cancel_request, o.created_at,
                  o.courier_name, o.tip_thb, o.delivery_photo_url,
                  o.concierge_brief, o.preview_url,
                  r.stars AS rating_stars
           FROM orders o
           LEFT JOIN order_ratings r ON r.order_id = o.id
           WHERE o.user_id = %s
           ORDER BY o.created_at DESC""",
        (g.user["id"],),
    )
    return jsonify([_serialize_order(o) for o in orders])


@bp.get("/<int:order_id>")
@login_required
def order_detail(order_id: int):
    user = g.user
    o = query_one(
        """SELECT o.*, m.shop_name, u.name AS purchaser_name, u.email AS purchaser_email,
                  r.stars AS rating_stars, r.comment AS rating_comment
           FROM orders o
           JOIN users     u ON u.id = o.user_id
           JOIN merchants m ON m.id = o.merchant_id
           LEFT JOIN order_ratings r ON r.order_id = o.id
           WHERE o.id = %s""",
        (order_id,),
    )
    if not o:
        return jsonify({"error": "not found"}), 404

    if user["role"] == "purchaser" and o["user_id"] != user["id"]:
        return jsonify({"error": "forbidden"}), 403
    if user["role"] == "seller":
        m = query_one("SELECT id FROM merchants WHERE user_id = %s", (user["id"],))
        if not m or m["id"] != o["merchant_id"]:
            return jsonify({"error": "forbidden"}), 403

    o["items"] = _hydrate_items(order_id)
    return jsonify(_serialize_order(o))


# ── events / timeline ──────────────────────────────────────────────────────

@bp.get("/<int:order_id>/events")
@login_required
def list_events(order_id: int):
    user = g.user
    o = query_one("SELECT id, user_id, merchant_id FROM orders WHERE id = %s", (order_id,))
    if not o:
        return jsonify({"error": "not found"}), 404
    if user["role"] == "purchaser" and o["user_id"] != user["id"]:
        return jsonify({"error": "forbidden"}), 403
    if user["role"] == "seller":
        m = query_one("SELECT id FROM merchants WHERE user_id = %s", (user["id"],))
        if not m or m["id"] != o["merchant_id"]:
            return jsonify({"error": "forbidden"}), 403

    rows = query_all(
        """SELECT e.id, e.event_type, e.from_status, e.to_status,
                  e.actor_role, e.note, e.created_at,
                  u.name AS actor_name
           FROM order_events e
           LEFT JOIN users u ON u.id = e.actor_id
           WHERE e.order_id = %s
           ORDER BY e.created_at ASC, e.id ASC""",
        (order_id,),
    )
    for r in rows:
        if r.get("created_at"):
            r["created_at"] = str(r["created_at"])
    return jsonify(rows)


# ── messages ───────────────────────────────────────────────────────────────

def _ensure_message_access(order_id, user):
    o = query_one("SELECT id, user_id, merchant_id FROM orders WHERE id = %s", (order_id,))
    if not o:
        return None, ("not found", 404)
    if user["role"] == "purchaser" and o["user_id"] != user["id"]:
        return None, ("forbidden", 403)
    if user["role"] == "seller":
        m = query_one("SELECT id, user_id FROM merchants WHERE user_id = %s", (user["id"],))
        if not m or m["id"] != o["merchant_id"]:
            return None, ("forbidden", 403)
    return o, None


@bp.get("/<int:order_id>/messages")
@login_required
def list_messages(order_id: int):
    user = g.user
    o, err = _ensure_message_access(order_id, user)
    if err:
        return jsonify({"error": err[0]}), err[1]
    channel = (request.args.get("channel") or "order").strip().lower()
    if channel not in ("order", "courier"):
        channel = "order"
    rows = query_all(
        """SELECT m.id, m.sender_id, m.sender_role, m.channel, m.body,
                  m.read_at, m.created_at,
                  COALESCE(u.name, m.sender_name, 'Florière') AS sender_name
           FROM order_messages m
           LEFT JOIN users u ON u.id = m.sender_id
           WHERE m.order_id = %s AND m.channel = %s
           ORDER BY m.created_at ASC, m.id ASC""",
        (order_id, channel),
    )
    for r in rows:
        r["created_at"] = str(r["created_at"]) if r.get("created_at") else None
        r["read_at"] = str(r["read_at"]) if r.get("read_at") else None
    # Mark messages from *other* senders as read for this viewer (per channel).
    execute(
        """UPDATE order_messages
             SET read_at = NOW()
           WHERE order_id = %s AND channel = %s
             AND (sender_id IS NULL OR sender_id <> %s)
             AND read_at IS NULL""",
        (order_id, channel, user["id"]),
    )
    return jsonify(rows)


@bp.post("/<int:order_id>/messages")
@login_required
def send_message(order_id: int):
    user = g.user
    o, err = _ensure_message_access(order_id, user)
    if err:
        return jsonify({"error": err[0]}), err[1]
    data = request.get_json(silent=True) or {}
    body = (data.get("body") or "").strip()
    channel = (data.get("channel") or "order").strip().lower()
    if channel not in ("order", "courier"):
        channel = "order"
    if not body:
        return jsonify({"error": "message body required"}), 400
    if len(body) > 1000:
        body = body[:1000]
    msg_id, _ = execute(
        """INSERT INTO order_messages (order_id, sender_id, sender_role, channel, body)
           VALUES (%s, %s, %s, %s, %s)""",
        (order_id, user["id"], user["role"], channel, body),
    )

    if channel == "courier":
        # In the courier mini-thread the recipient is the (mocked) courier.
        # No real user — but we DO want to log the event and (for the demo)
        # auto-schedule a scripted reply so the purchaser sees a conversation.
        _emit_event(order_id, "message", actor_id=user["id"], actor_role=user["role"],
                    note=f"to courier · {body[:100]}")
        # Auto-script a reply on the very next read of the courier channel.
        # We just insert one delayed-feel reply right away — the demo cadence
        # is "send → reply within ~2s" which reads as authentic.
        reply_idx = query_one(
            """SELECT COUNT(*) AS c FROM order_messages
               WHERE order_id = %s AND channel = 'courier' AND sender_role = 'courier'""",
            (order_id,),
        )
        reply_count = int(reply_idx["c"]) if reply_idx and reply_idx.get("c") is not None else 0
        reply = COURIER_SCRIPT[min(reply_count, len(COURIER_SCRIPT) - 1)]
        courier_name = (query_one("SELECT courier_name FROM orders WHERE id = %s", (order_id,)) or {}).get("courier_name") or "Courier"
        execute(
            """INSERT INTO order_messages
                 (order_id, sender_id, sender_role, sender_name, channel, body)
               VALUES (%s, NULL, 'courier', %s, 'courier', %s)""",
            (order_id, courier_name, reply),
        )
        return jsonify({"id": msg_id}), 201

    _emit_event(order_id, "message", actor_id=user["id"], actor_role=user["role"],
                note=body[:120])

    # Notify the *other* party.
    if user["role"] == "purchaser":
        target = _seller_user_for_merchant(o["merchant_id"])
        title = f"New message from {user['name']}"
        href = f"/(seller)/orders/{order_id}"
    elif user["role"] == "seller":
        target = o["user_id"]
        title = "New message from Florière"
        href = f"/(purchaser)/orders/{order_id}"
    else:  # admin → ping the purchaser
        target = o["user_id"]
        title = "Florière admin sent a note"
        href = f"/(purchaser)/orders/{order_id}"
    _notify(target, "order.message", title, body=body[:160], href=href, order_id=order_id)

    return jsonify({"id": msg_id}), 201


@bp.post("/<int:order_id>/courier_reply")
@role_required("purchaser")
def courier_reply(order_id: int):
    """Demo helper — force the next scripted courier reply.

    Used by the UI's "wait for reply" affordance so the demo can show a
    conversation flowing without a real driver on the other end.
    """
    o = query_one("SELECT id, user_id, courier_name FROM orders WHERE id = %s", (order_id,))
    if not o or o["user_id"] != g.user["id"]:
        return jsonify({"error": "not found"}), 404
    if not o["courier_name"]:
        return jsonify({"error": "no courier assigned yet"}), 400
    reply_idx = query_one(
        """SELECT COUNT(*) AS c FROM order_messages
           WHERE order_id = %s AND channel = 'courier' AND sender_role = 'courier'""",
        (order_id,),
    )
    reply_count = int(reply_idx["c"]) if reply_idx and reply_idx.get("c") is not None else 0
    reply = COURIER_SCRIPT[min(reply_count, len(COURIER_SCRIPT) - 1)]
    execute(
        """INSERT INTO order_messages
             (order_id, sender_id, sender_role, sender_name, channel, body)
           VALUES (%s, NULL, 'courier', %s, 'courier', %s)""",
        (order_id, o["courier_name"], reply),
    )
    _notify(o["user_id"], "order.message",
            f"{o['courier_name']} sent you a message",
            body=reply[:160],
            href=f"/(purchaser)/orders/{order_id}",
            order_id=order_id)
    return jsonify({"ok": True, "reply": reply})


# ── status updates ─────────────────────────────────────────────────────────

@bp.patch("/<int:order_id>/status")
@login_required
def update_status(order_id: int):
    data = request.get_json(silent=True) or {}
    target = (data.get("status") or "").strip()
    note   = (data.get("note") or "").strip() or None
    user = g.user

    order = query_one(
        "SELECT id, user_id, merchant_id, status FROM orders WHERE id = %s",
        (order_id,),
    )
    if not order:
        return jsonify({"error": "not found"}), 404

    if user["role"] == "purchaser":
        if order["user_id"] != user["id"]:
            return jsonify({"error": "forbidden"}), 403
        if target != "cancelled" or order["status"] != "pending":
            return jsonify({"error": "purchaser can only cancel a pending order"}), 400
    elif user["role"] == "seller":
        m = query_one("SELECT id FROM merchants WHERE user_id = %s", (user["id"],))
        if not m or m["id"] != order["merchant_id"]:
            return jsonify({"error": "forbidden"}), 403
        expected_next = SELLER_NEXT.get(order["status"])
        if target == "cancelled" and order["status"] in ("pending", "accepted"):
            pass
        elif target != expected_next:
            return jsonify({
                "error": f"seller can move {order['status']} → {expected_next or 'nothing'}, not → {target}"
            }), 400
    elif user["role"] == "admin":
        if target not in ALL_STATUSES:
            return jsonify({"error": "invalid status"}), 400
    else:
        return jsonify({"error": "forbidden"}), 403

    execute("UPDATE orders SET status = %s WHERE id = %s", (target, order_id))
    _emit_event(order_id, "status",
                from_status=order["status"], to_status=target,
                actor_id=user["id"], actor_role=user["role"], note=note)

    # ── Pass 3: side-effects on certain transitions ──────────────────────
    extra_body = None
    if target == "out_for_delivery":
        # Auto-assign a mock courier when the order goes out for delivery.
        courier_name, courier_phone = _pick_courier(order_id)
        dest_lat, dest_lng = _dest_for_order(order_id)
        execute(
            """UPDATE orders SET
                 courier_name = %s, courier_phone = %s,
                 courier_lat = %s, courier_lng = %s,
                 dest_lat = %s, dest_lng = %s,
                 dispatched_at = NOW(), eta_minutes = 18
               WHERE id = %s AND (courier_name IS NULL OR courier_name = '')""",
            (courier_name, courier_phone,
             ORIGIN_LAT_LNG[0], ORIGIN_LAT_LNG[1],
             dest_lat, dest_lng,
             order_id),
        )
        # Auto-seed a friendly courier opener message in the courier channel.
        existing = query_one(
            "SELECT COUNT(*) AS c FROM order_messages WHERE order_id = %s AND channel = 'courier'",
            (order_id,),
        )
        if not existing or int(existing.get("c") or 0) == 0:
            execute(
                """INSERT INTO order_messages
                     (order_id, sender_id, sender_role, sender_name, channel, body)
                   VALUES (%s, NULL, 'courier', %s, 'courier', %s)""",
                (order_id, courier_name,
                 f"Hi! I have your Florière bouquet — heading over now."),
            )
        extra_body = f"{courier_name} is on the way · ETA ~18 min"

    # Notify the relevant counterparty.
    if user["role"] == "seller" or user["role"] == "admin":
        _notify(
            order["user_id"], "order.status",
            f"Your order is now {target.replace('_', ' ')}",
            body=extra_body or note, href=f"/(purchaser)/orders/{order_id}", order_id=order_id,
        )
    elif user["role"] == "purchaser":
        target_seller = _seller_user_for_merchant(order["merchant_id"])
        _notify(
            target_seller, "order.status",
            f"Order #{order_id} cancelled by purchaser",
            body=note, href=f"/(seller)/orders/{order_id}", order_id=order_id,
        )
    return jsonify({"order_id": order_id, "status": target})


# ── cancel request (purchaser-after-accepted) ──────────────────────────────

@bp.post("/<int:order_id>/cancel_request")
@role_required("purchaser")
def cancel_request(order_id: int):
    data = request.get_json(silent=True) or {}
    reason = (data.get("reason") or "").strip() or None
    o = query_one("SELECT id, user_id, merchant_id, status, cancel_request FROM orders WHERE id = %s",
                  (order_id,))
    if not o:
        return jsonify({"error": "not found"}), 404
    if o["user_id"] != g.user["id"]:
        return jsonify({"error": "forbidden"}), 403
    if o["status"] in ("delivered", "cancelled"):
        return jsonify({"error": "order is already finalised"}), 400
    if o["status"] == "pending":
        return jsonify({"error": "pending orders can be cancelled directly"}), 400
    if o["cancel_request"] == "requested":
        return jsonify({"error": "a cancellation request is already open"}), 400

    execute(
        "UPDATE orders SET cancel_request = 'requested', cancel_reason = %s WHERE id = %s",
        (reason, order_id),
    )
    _emit_event(order_id, "cancel_request", actor_id=g.user["id"], actor_role="purchaser", note=reason)
    target_seller = _seller_user_for_merchant(o["merchant_id"])
    _notify(
        target_seller, "order.cancel",
        f"Purchaser requested to cancel #{order_id}",
        body=reason or "No reason provided.",
        href=f"/(seller)/orders/{order_id}", order_id=order_id,
    )
    return jsonify({"ok": True, "cancel_request": "requested"})


@bp.post("/<int:order_id>/cancel_response")
@login_required
def cancel_response(order_id: int):
    """Seller (or admin) approves or denies a purchaser cancellation request."""
    user = g.user
    if user["role"] not in ("seller", "admin"):
        return jsonify({"error": "forbidden"}), 403
    data = request.get_json(silent=True) or {}
    decision = (data.get("decision") or "").strip().lower()  # 'approve' | 'deny'
    note     = (data.get("note") or "").strip() or None
    if decision not in ("approve", "deny"):
        return jsonify({"error": "decision must be approve|deny"}), 400

    o = query_one("SELECT id, user_id, merchant_id, status, cancel_request FROM orders WHERE id = %s",
                  (order_id,))
    if not o:
        return jsonify({"error": "not found"}), 404
    if user["role"] == "seller":
        m = query_one("SELECT id FROM merchants WHERE user_id = %s", (user["id"],))
        if not m or m["id"] != o["merchant_id"]:
            return jsonify({"error": "forbidden"}), 403
    if o["cancel_request"] != "requested":
        return jsonify({"error": "no open cancellation request"}), 400

    if decision == "approve":
        execute(
            "UPDATE orders SET cancel_request = 'approved', status = 'cancelled' WHERE id = %s",
            (order_id,),
        )
        _emit_event(order_id, "status", from_status=o["status"], to_status="cancelled",
                    actor_id=user["id"], actor_role=user["role"],
                    note=note or "Cancellation approved")
        _emit_event(order_id, "cancel_response", actor_id=user["id"], actor_role=user["role"],
                    note=f"approved · {note or ''}")
        _notify(o["user_id"], "order.cancel", f"Order #{order_id} cancellation approved",
                body=note, href=f"/(purchaser)/orders/{order_id}", order_id=order_id)
    else:
        execute("UPDATE orders SET cancel_request = 'denied' WHERE id = %s", (order_id,))
        _emit_event(order_id, "cancel_response", actor_id=user["id"], actor_role=user["role"],
                    note=f"denied · {note or ''}")
        _notify(o["user_id"], "order.cancel", f"Order #{order_id} cancellation denied",
                body=note, href=f"/(purchaser)/orders/{order_id}", order_id=order_id)

    return jsonify({"ok": True, "decision": decision})


# ── reorder ────────────────────────────────────────────────────────────────

@bp.post("/<int:order_id>/reorder")
@role_required("purchaser")
def reorder(order_id: int):
    """Clone an order's items into the purchaser's cart."""
    o = query_one(
        "SELECT id, user_id, concierge_brief FROM orders WHERE id = %s",
        (order_id,),
    )
    if not o or o["user_id"] != g.user["id"]:
        return jsonify({"error": "not found"}), 404

    items = query_all(
        """SELECT id, item_type, curated_bouquet_id, custom_label,
                  intent_occasion, intent_recipient, intent_message,
                  unit_price_thb, quantity
           FROM order_items WHERE order_id = %s""",
        (order_id,),
    )
    if not items:
        return jsonify({"error": "nothing to reorder"}), 400

    # Concierge brief lives on the orders row, not order_items — fetch the raw
    # JSON string once and reuse it for every concierge line item in the clone.
    concierge_brief_json = o.get("concierge_brief")
    if concierge_brief_json is not None and not isinstance(concierge_brief_json, str):
        concierge_brief_json = json.dumps(concierge_brief_json)

    cart = query_one("SELECT id FROM carts WHERE user_id = %s", (g.user["id"],))
    if not cart:
        cart_id, _ = execute("INSERT INTO carts (user_id) VALUES (%s)", (g.user["id"],))
    else:
        cart_id = cart["id"]

    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        for it in items:
            brief = concierge_brief_json if it["item_type"] == "concierge" else None
            cur.execute(
                """INSERT INTO cart_items
                     (cart_id, item_type, curated_bouquet_id, custom_label,
                      intent_occasion, intent_recipient, intent_message,
                      concierge_brief, unit_price_thb, quantity)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (cart_id, it["item_type"], it["curated_bouquet_id"], it["custom_label"],
                 it["intent_occasion"], it["intent_recipient"], it["intent_message"],
                 brief, it["unit_price_thb"], it["quantity"]),
            )
            new_item_id = cur.lastrowid
            cur.execute(
                """SELECT oif.flower_id, oif.quantity
                   FROM order_item_flowers oif
                   WHERE oif.order_item_id = %s AND oif.flower_id IS NOT NULL""",
                (it["id"],),
            )
            for s in cur.fetchall():
                cur.execute(
                    """INSERT INTO cart_item_flowers (cart_item_id, flower_id, quantity)
                       VALUES (%s, %s, %s)
                       ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)""",
                    (new_item_id, s["flower_id"], s["quantity"]),
                )
        conn.commit()
        cur.close()
    finally:
        conn.close()

    return jsonify({"ok": True, "cart_id": cart_id}), 201


# ── rating ─────────────────────────────────────────────────────────────────

@bp.post("/<int:order_id>/rating")
@role_required("purchaser")
def rate_order(order_id: int):
    data = request.get_json(silent=True) or {}
    try:
        stars = int(data.get("stars") or 0)
    except (TypeError, ValueError):
        stars = 0
    if stars < 1 or stars > 5:
        return jsonify({"error": "stars must be 1..5"}), 400
    comment = (data.get("comment") or "").strip() or None
    if comment and len(comment) > 500:
        comment = comment[:500]

    o = query_one("SELECT id, user_id, merchant_id, status FROM orders WHERE id = %s", (order_id,))
    if not o or o["user_id"] != g.user["id"]:
        return jsonify({"error": "not found"}), 404
    if o["status"] != "delivered":
        return jsonify({"error": "you can only rate a delivered order"}), 400

    execute(
        """INSERT INTO order_ratings (order_id, stars, comment)
           VALUES (%s, %s, %s)
           ON DUPLICATE KEY UPDATE stars = VALUES(stars), comment = VALUES(comment)""",
        (order_id, stars, comment),
    )
    _emit_event(order_id, "note", actor_id=g.user["id"], actor_role="purchaser",
                note=f"{stars}/5 · {comment or ''}")
    target_seller = _seller_user_for_merchant(o["merchant_id"])
    _notify(
        target_seller, "order.rating",
        f"Order #{order_id} received {stars}/5",
        body=comment, href=f"/(seller)/orders/{order_id}", order_id=order_id,
    )
    return jsonify({"ok": True, "stars": stars})


# ── tip the courier (Pass 3, mocked — no real payment) ────────────────────

@bp.post("/<int:order_id>/tip")
@role_required("purchaser")
def tip_courier(order_id: int):
    data = request.get_json(silent=True) or {}
    try:
        amount = int(data.get("amount_thb") or 0)
    except (TypeError, ValueError):
        amount = 0
    note = (data.get("note") or "").strip() or None
    if amount < 0 or amount > 5000:
        return jsonify({"error": "tip must be between ฿0 and ฿5,000"}), 400
    if note and len(note) > 255:
        note = note[:255]

    o = query_one("SELECT id, user_id, courier_name FROM orders WHERE id = %s", (order_id,))
    if not o or o["user_id"] != g.user["id"]:
        return jsonify({"error": "not found"}), 404
    if not o["courier_name"]:
        return jsonify({"error": "no courier on this order yet"}), 400

    execute(
        "UPDATE orders SET tip_thb = %s, tip_note = %s, tip_at = NOW() WHERE id = %s",
        (amount, note, order_id),
    )
    _emit_event(order_id, "note", actor_id=g.user["id"], actor_role="purchaser",
                note=f"tip ฿{amount} to {o['courier_name']}")
    merchant_row = query_one("SELECT merchant_id FROM orders WHERE id = %s", (order_id,))
    target_seller = (
        _seller_user_for_merchant(merchant_row["merchant_id"])
        if merchant_row else None
    )
    _notify(target_seller, "order.tip",
            f"Tip ฿{amount} sent for #{order_id}",
            body=f"For {o['courier_name']}.",
            href=f"/(seller)/orders/{order_id}", order_id=order_id)
    return jsonify({"ok": True, "tip_thb": amount})


# ── delivery photo (Pass 3, mocked — picks from preset URLs) ──────────────

@bp.get("/photo_presets")
@login_required
def photo_presets():
    return jsonify({"presets": DELIVERY_PHOTO_PRESETS})


@bp.post("/<int:order_id>/delivery_photo")
@login_required
def set_delivery_photo(order_id: int):
    """Seller (or admin) attaches a delivery photo when the order is delivered."""
    user = g.user
    if user["role"] not in ("seller", "admin"):
        return jsonify({"error": "forbidden"}), 403
    o = query_one("SELECT id, user_id, merchant_id, status FROM orders WHERE id = %s", (order_id,))
    if not o:
        return jsonify({"error": "not found"}), 404
    if user["role"] == "seller":
        m = query_one("SELECT id FROM merchants WHERE user_id = %s", (user["id"],))
        if not m or m["id"] != o["merchant_id"]:
            return jsonify({"error": "forbidden"}), 403

    data = request.get_json(silent=True) or {}
    url = (data.get("url") or "").strip()
    if not url:
        return jsonify({"error": "url required"}), 400
    if len(url) > 500:
        url = url[:500]

    execute(
        "UPDATE orders SET delivery_photo_url = %s, delivery_photo_at = NOW() WHERE id = %s",
        (url, order_id),
    )
    _emit_event(order_id, "note", actor_id=user["id"], actor_role=user["role"],
                note="Delivery photo attached")
    _notify(o["user_id"], "order.status",
            "Your gift has been delivered",
            body="A delivery photo is on your order.",
            href=f"/(purchaser)/orders/{order_id}", order_id=order_id)
    return jsonify({"ok": True})


# ── courier dispatch info (Pass 3) ─────────────────────────────────────────

@bp.get("/<int:order_id>/courier")
@login_required
def courier_info(order_id: int):
    """Returns the mock courier state for an order, including a freshly-computed
    progress ratio (0..1) so the frontend doesn't have to do the math itself."""
    user = g.user
    o = query_one(
        """SELECT id, user_id, merchant_id, status,
                  courier_name, courier_phone,
                  courier_lat, courier_lng, dest_lat, dest_lng,
                  dispatched_at, eta_minutes
           FROM orders WHERE id = %s""",
        (order_id,),
    )
    if not o:
        return jsonify({"error": "not found"}), 404
    if user["role"] == "purchaser" and o["user_id"] != user["id"]:
        return jsonify({"error": "forbidden"}), 403
    if user["role"] == "seller":
        m = query_one("SELECT id FROM merchants WHERE user_id = %s", (user["id"],))
        if not m or m["id"] != o["merchant_id"]:
            return jsonify({"error": "forbidden"}), 403

    progress = 0.0
    remaining_minutes = None
    if o["dispatched_at"] and o["eta_minutes"]:
        elapsed_min = (datetime.now() - o["dispatched_at"]).total_seconds() / 60.0
        progress = max(0.0, min(1.0, elapsed_min / float(o["eta_minutes"])))
        remaining_minutes = max(0, int(round(o["eta_minutes"] - elapsed_min)))

    def f(x):
        return float(x) if x is not None else None

    return jsonify({
        "courier_name":   o["courier_name"],
        "courier_phone":  o["courier_phone"],
        "origin":         {"lat": f(o["courier_lat"]), "lng": f(o["courier_lng"])},
        "destination":    {"lat": f(o["dest_lat"]),    "lng": f(o["dest_lng"])},
        "dispatched_at":  str(o["dispatched_at"]) if o["dispatched_at"] else None,
        "eta_minutes":    o["eta_minutes"],
        "progress":       progress,
        "remaining_minutes": remaining_minutes,
        "status":         o["status"],
    })


# ── concierge review (seller / customer) ──────────────────────────────────

def _load_concierge_order(order_id, allowed_statuses):
    o = query_one(
        "SELECT id, user_id, merchant_id, status, concierge_brief FROM orders WHERE id = %s",
        (order_id,),
    )
    if not o:
        return None, ("not found", 404)
    if not o["concierge_brief"]:
        return None, ("not a concierge order", 400)
    if o["status"] not in allowed_statuses:
        return None, (f"cannot act on status {o['status']}", 400)
    return o, None


def _seller_owns(order, user):
    m = query_one("SELECT id FROM merchants WHERE user_id = %s", (user["id"],))
    return bool(m and m["id"] == order["merchant_id"])


@bp.post("/<int:order_id>/concierge_accept")
@role_required("seller")
def concierge_accept(order_id: int):
    """Merchant approves a concierge brief — pending_review|awaiting_customer → accepted."""
    user = g.user
    o, err = _load_concierge_order(order_id, ("pending_review", "awaiting_customer"))
    if err:
        return jsonify({"error": err[0]}), err[1]
    if not _seller_owns(o, user):
        return jsonify({"error": "forbidden"}), 403

    execute("UPDATE orders SET status = 'accepted' WHERE id = %s", (order_id,))
    _emit_event(order_id, "status",
                from_status=o["status"], to_status="accepted",
                actor_id=user["id"], actor_role="seller",
                note="Brief accepted as-is")
    _emit_event(order_id, "concierge", actor_id=user["id"], actor_role="seller",
                note="accept")
    _notify(o["user_id"], "order.status",
            "Florist accepted your bouquet brief",
            body="They're starting to prepare your order.",
            href=f"/(purchaser)/orders/{order_id}", order_id=order_id)
    return jsonify({"order_id": order_id, "status": "accepted"})


@bp.post("/<int:order_id>/concierge_ask")
@role_required("seller")
def concierge_ask(order_id: int):
    """Merchant asks a clarifying question — pending_review → awaiting_customer.
    Body: { question: str }. Posts the question to the order chat thread and
    transitions the order so the customer is prompted to reply."""
    user = g.user
    data = request.get_json(silent=True) or {}
    question = (data.get("question") or "").strip()
    if not question:
        return jsonify({"error": "question required"}), 400
    if len(question) > 1000:
        question = question[:1000]

    o, err = _load_concierge_order(order_id, ("pending_review", "awaiting_customer"))
    if err:
        return jsonify({"error": err[0]}), err[1]
    if not _seller_owns(o, user):
        return jsonify({"error": "forbidden"}), 403

    execute("UPDATE orders SET status = 'awaiting_customer' WHERE id = %s", (order_id,))
    # Log the question into the order chat so it appears in the existing thread.
    execute(
        """INSERT INTO order_messages (order_id, sender_id, sender_role, channel, body)
           VALUES (%s, %s, 'seller', 'order', %s)""",
        (order_id, user["id"], question),
    )
    _emit_event(order_id, "status",
                from_status=o["status"], to_status="awaiting_customer",
                actor_id=user["id"], actor_role="seller",
                note="Question asked: " + question[:120])
    _emit_event(order_id, "concierge", actor_id=user["id"], actor_role="seller",
                note=f"ask · {question[:120]}")
    _notify(o["user_id"], "order.message",
            "Florist has a question",
            body=question[:160],
            href=f"/(purchaser)/orders/{order_id}", order_id=order_id)
    return jsonify({"order_id": order_id, "status": "awaiting_customer"})


@bp.post("/<int:order_id>/concierge_decline")
@role_required("seller")
def concierge_decline(order_id: int):
    """Merchant declines a concierge brief — pending_review|awaiting_customer → cancelled.
    Body: { reason?: str }."""
    user = g.user
    data = request.get_json(silent=True) or {}
    reason = (data.get("reason") or "").strip() or None

    o, err = _load_concierge_order(order_id, ("pending_review", "awaiting_customer"))
    if err:
        return jsonify({"error": err[0]}), err[1]
    if not _seller_owns(o, user):
        return jsonify({"error": "forbidden"}), 403

    execute("UPDATE orders SET status = 'cancelled' WHERE id = %s", (order_id,))
    _emit_event(order_id, "status",
                from_status=o["status"], to_status="cancelled",
                actor_id=user["id"], actor_role="seller",
                note=reason or "Brief declined by florist")
    _emit_event(order_id, "concierge", actor_id=user["id"], actor_role="seller",
                note=f"decline · {reason or ''}")
    _notify(o["user_id"], "order.cancel",
            "Florist couldn't take your brief",
            body=reason or "Refund will follow in production.",
            href=f"/(purchaser)/orders/{order_id}", order_id=order_id)
    return jsonify({"order_id": order_id, "status": "cancelled"})


@bp.post("/<int:order_id>/concierge_confirm")
@role_required("purchaser")
def concierge_confirm(order_id: int):
    """Customer confirms the florist's substitution / question — awaiting_customer → pending_review.
    Body: { reply?: str }. Re-routes the brief back to the florist with an
    extra acceptance note in the chat thread."""
    user = g.user
    data = request.get_json(silent=True) or {}
    reply = (data.get("reply") or "").strip() or "Sounds good — please proceed."
    if len(reply) > 1000:
        reply = reply[:1000]

    o = query_one("SELECT id, user_id, merchant_id, status FROM orders WHERE id = %s",
                  (order_id,))
    if not o:
        return jsonify({"error": "not found"}), 404
    if o["user_id"] != user["id"]:
        return jsonify({"error": "forbidden"}), 403
    if o["status"] != "awaiting_customer":
        return jsonify({"error": f"cannot confirm from status {o['status']}"}), 400

    execute("UPDATE orders SET status = 'pending_review' WHERE id = %s", (order_id,))
    execute(
        """INSERT INTO order_messages (order_id, sender_id, sender_role, channel, body)
           VALUES (%s, %s, 'purchaser', 'order', %s)""",
        (order_id, user["id"], reply),
    )
    _emit_event(order_id, "status",
                from_status="awaiting_customer", to_status="pending_review",
                actor_id=user["id"], actor_role="purchaser",
                note="Customer confirmed: " + reply[:120])
    _emit_event(order_id, "concierge", actor_id=user["id"], actor_role="purchaser",
                note=f"confirm · {reply[:120]}")
    seller_user = _seller_user_for_merchant(o["merchant_id"])
    _notify(seller_user, "order.message",
            "Customer confirmed your substitution",
            body=reply[:160],
            href=f"/(seller)/orders/{order_id}", order_id=order_id)
    return jsonify({"order_id": order_id, "status": "pending_review"})


# ── seller / admin views ───────────────────────────────────────────────────

@bp.get("/incoming")
@role_required("seller")
def seller_incoming():
    m = query_one("SELECT id FROM merchants WHERE user_id = %s", (g.user["id"],))
    if not m:
        return jsonify([])
    orders = query_all(
        """SELECT o.id, o.subtotal_thb, o.discount_thb, o.total_thb,
                  o.delivery_date, o.delivery_window, o.delivery_mode,
                  o.delivery_address,
                  o.recipient_name, o.recipient_phone, o.recipient_message,
                  o.status, o.cancel_request, o.created_at,
                  o.courier_name, o.tip_thb, o.delivery_photo_url,
                  o.concierge_brief, o.preview_url,
                  u.name AS purchaser_name, u.email AS purchaser_email
           FROM orders o JOIN users u ON u.id = o.user_id
           WHERE o.merchant_id = %s ORDER BY o.created_at DESC""",
        (m["id"],),
    )
    return jsonify([_serialize_order(o) for o in orders])


@bp.get("/all")
@role_required("admin")
def admin_list_all():
    orders = query_all(
        """SELECT o.id, o.user_id, o.merchant_id, o.subtotal_thb, o.discount_thb, o.total_thb,
                  o.delivery_date, o.delivery_window, o.delivery_mode,
                  o.delivery_address, o.recipient_name,
                  o.status, o.cancel_request, o.created_at, o.tip_thb,
                  o.concierge_brief, o.preview_url,
                  u.name AS purchaser_name, m.shop_name
           FROM orders o
           JOIN users u     ON u.id = o.user_id
           JOIN merchants m ON m.id = o.merchant_id
           ORDER BY o.created_at DESC"""
    )
    return jsonify([_serialize_order(o) for o in orders])

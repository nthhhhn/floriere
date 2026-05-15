"""Cart routes — purchaser-only.

A cart row exists per purchaser (created on register).  Cart items can be
curated (refers to curated_bouquets), custom (DIY: pick stems), intent (a
suggested bouquet from Intent Mode + a generated message card), or concierge
(the guided quiz flow — includes a brief blob with image, mood tags, message,
format, and anything-else notes).
"""

import json

from flask import Blueprint, g, jsonify, request

from auth import role_required
from db import execute, get_connection, query_all, query_one


bp = Blueprint("cart", __name__)


def _ensure_cart(user_id: int) -> int:
    cart = query_one("SELECT id FROM carts WHERE user_id = %s", (user_id,))
    if cart:
        return cart["id"]
    cart_id, _ = execute("INSERT INTO carts (user_id) VALUES (%s)", (user_id,))
    return cart_id


def _read_cart(cart_id: int) -> dict:
    items = query_all(
        """SELECT id, item_type, curated_bouquet_id, custom_label,
                  intent_occasion, intent_recipient, intent_message,
                  concierge_brief, unit_price_thb, quantity, created_at
           FROM cart_items WHERE cart_id = %s ORDER BY created_at DESC""",
        (cart_id,),
    )
    if not items:
        return {"items": [], "subtotal_thb": 0}

    ids = tuple(i["id"] for i in items)
    placeholders = ",".join(["%s"] * len(ids))
    flowers = query_all(
        f"""SELECT cif.cart_item_id, cif.flower_id, cif.quantity,
                   f.name, f.color, f.price_thb
            FROM cart_item_flowers cif JOIN flowers f ON f.id = cif.flower_id
            WHERE cif.cart_item_id IN ({placeholders})""",
        ids,
    )
    bouquet_ids = [i["curated_bouquet_id"] for i in items if i["curated_bouquet_id"]]
    curated_names = {}
    if bouquet_ids:
        placeholders_b = ",".join(["%s"] * len(bouquet_ids))
        for row in query_all(
            f"SELECT id, name FROM curated_bouquets WHERE id IN ({placeholders_b})",
            tuple(bouquet_ids),
        ):
            curated_names[row["id"]] = row["name"]

    by_item = {}
    for f in flowers:
        by_item.setdefault(f["cart_item_id"], []).append({
            "flower_id": f["flower_id"],
            "name":      f["name"],
            "color":     f["color"],
            "quantity":  f["quantity"],
            "price_thb": f["price_thb"],
        })

    subtotal = 0
    for item in items:
        item["flowers"] = by_item.get(item["id"], [])
        item["curated_name"] = (
            curated_names.get(item["curated_bouquet_id"])
            if item["curated_bouquet_id"] else None
        )
        item["line_total_thb"] = item["unit_price_thb"] * item["quantity"]
        subtotal += item["line_total_thb"]
        if item.get("created_at"):
            item["created_at"] = str(item["created_at"])
        # MySQL JSON columns come back as str — parse so frontend sees an object.
        if item.get("concierge_brief") and isinstance(item["concierge_brief"], str):
            try:
                item["concierge_brief"] = json.loads(item["concierge_brief"])
            except (TypeError, ValueError):
                item["concierge_brief"] = None

    return {"items": items, "subtotal_thb": subtotal}


@bp.get("")
@role_required("purchaser")
def get_cart():
    cart_id = _ensure_cart(g.user["id"])
    return jsonify({"cart_id": cart_id, **_read_cart(cart_id)})


@bp.post("/items")
@role_required("purchaser")
def add_item():
    """Body:
      { item_type: 'curated', curated_bouquet_id, quantity? }
      { item_type: 'custom',  custom_label, flowers: [{flower_id, quantity}] }
      { item_type: 'intent',  intent_occasion, intent_recipient, intent_message,
                              curated_bouquet_id?, flowers?: [...] }
    """
    data = request.get_json(silent=True) or {}
    item_type = data.get("item_type")
    qty       = max(1, int(data.get("quantity") or 1))

    if item_type not in ("curated", "custom", "intent", "concierge"):
        return jsonify({"error": "item_type must be curated|custom|intent|concierge"}), 400

    cart_id = _ensure_cart(g.user["id"])
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        unit_price = 0
        curated_bouquet_id = data.get("curated_bouquet_id")
        flowers_in = data.get("flowers") or []
        concierge_brief = data.get("concierge_brief")
        if concierge_brief is not None and not isinstance(concierge_brief, dict):
            return jsonify({"error": "concierge_brief must be an object"}), 400
        brief_json = json.dumps(concierge_brief) if concierge_brief else None

        if item_type == "curated":
            if not curated_bouquet_id:
                return jsonify({"error": "curated_bouquet_id required"}), 400
            cur.execute(
                "SELECT base_price_thb FROM curated_bouquets WHERE id = %s AND active = 1",
                (curated_bouquet_id,),
            )
            row = cur.fetchone()
            if not row:
                return jsonify({"error": "curated bouquet not found"}), 404
            unit_price = row["base_price_thb"]

        elif item_type == "custom":
            if not flowers_in:
                return jsonify({"error": "custom bouquet needs flowers[]"}), 400
            ids = tuple({int(f["flower_id"]) for f in flowers_in})
            placeholders = ",".join(["%s"] * len(ids))
            cur.execute(
                f"SELECT id, price_thb FROM flowers WHERE id IN ({placeholders}) AND active = 1",
                ids,
            )
            price_lookup = {r["id"]: r["price_thb"] for r in cur.fetchall()}
            for f in flowers_in:
                fid = int(f["flower_id"])
                if fid not in price_lookup:
                    return jsonify({"error": f"flower {fid} not available"}), 400
                unit_price += price_lookup[fid] * max(1, int(f["quantity"]))
            # Florière styling fee — keeps the brand from selling at cost
            unit_price = int(unit_price * 1.25)

        elif item_type == "concierge":
            # Brief carries the authoritative price computed by /concierge/generate.
            if not concierge_brief:
                return jsonify({"error": "concierge item needs concierge_brief"}), 400
            try:
                unit_price = int(concierge_brief.get("price_thb") or 0)
            except (TypeError, ValueError):
                unit_price = 0
            if unit_price <= 0:
                return jsonify({"error": "concierge_brief.price_thb required"}), 400
            # Optional flowers[] attaches preferred kinds so the merchant can
            # see what the customer hinted at. No price effect — brief is
            # authoritative.

        elif item_type == "intent":
            # Intent items typically include a curated bouquet (from /catalog/intent)
            if curated_bouquet_id:
                cur.execute(
                    "SELECT base_price_thb FROM curated_bouquets WHERE id = %s AND active = 1",
                    (curated_bouquet_id,),
                )
                row = cur.fetchone()
                if not row:
                    return jsonify({"error": "curated bouquet not found"}), 404
                unit_price = row["base_price_thb"]
            elif flowers_in:
                ids = tuple({int(f["flower_id"]) for f in flowers_in})
                placeholders = ",".join(["%s"] * len(ids))
                cur.execute(
                    f"SELECT id, price_thb FROM flowers WHERE id IN ({placeholders}) AND active = 1",
                    ids,
                )
                price_lookup = {r["id"]: r["price_thb"] for r in cur.fetchall()}
                for f in flowers_in:
                    unit_price += price_lookup.get(int(f["flower_id"]), 0) * max(1, int(f["quantity"]))
                unit_price = int(unit_price * 1.25)
            else:
                return jsonify({"error": "intent item needs curated_bouquet_id or flowers[]"}), 400

        cur.execute(
            """INSERT INTO cart_items
                 (cart_id, item_type, curated_bouquet_id, custom_label,
                  intent_occasion, intent_recipient, intent_message,
                  concierge_brief, unit_price_thb, quantity)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                cart_id, item_type, curated_bouquet_id,
                data.get("custom_label"),
                data.get("intent_occasion"),
                data.get("intent_recipient"),
                data.get("intent_message"),
                brief_json,
                unit_price, qty,
            ),
        )
        item_id = cur.lastrowid

        if item_type in ("custom", "intent", "concierge") and flowers_in:
            cur.executemany(
                """INSERT INTO cart_item_flowers (cart_item_id, flower_id, quantity)
                   VALUES (%s, %s, %s)
                   ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)""",
                [(item_id, int(f["flower_id"]), max(1, int(f["quantity"]))) for f in flowers_in],
            )

        conn.commit()
        cur.close()
    finally:
        conn.close()

    return jsonify({"cart_id": cart_id, **_read_cart(cart_id)}), 201


@bp.delete("/items/<int:item_id>")
@role_required("purchaser")
def remove_item(item_id: int):
    cart = query_one("SELECT id FROM carts WHERE user_id = %s", (g.user["id"],))
    if not cart:
        return jsonify({"error": "no cart"}), 404
    _, n = execute(
        "DELETE FROM cart_items WHERE id = %s AND cart_id = %s",
        (item_id, cart["id"]),
    )
    if n == 0:
        return jsonify({"error": "item not found"}), 404
    return jsonify({"cart_id": cart["id"], **_read_cart(cart["id"])})


@bp.post("/clear")
@role_required("purchaser")
def clear_cart():
    cart = query_one("SELECT id FROM carts WHERE user_id = %s", (g.user["id"],))
    if cart:
        execute("DELETE FROM cart_items WHERE cart_id = %s", (cart["id"],))
    return jsonify({"ok": True})

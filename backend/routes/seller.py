"""Seller routes — own merchant info, flower stem CRUD, shop hours, ratings dashboard."""

from flask import Blueprint, g, jsonify, request

from auth import role_required
from db import execute, query_all, query_one


bp = Blueprint("seller", __name__)


def _my_merchant():
    return query_one(
        """SELECT id, shop_name, description, phone, is_open, open_hour, close_hour
           FROM merchants WHERE user_id = %s""",
        (g.user["id"],),
    )


@bp.get("/me")
@role_required("seller")
def me():
    m = _my_merchant()
    if not m:
        return jsonify({"merchant": None})
    # Aggregate rating across this merchant's delivered orders
    agg = query_one(
        """SELECT AVG(r.stars) AS avg_stars, COUNT(*) AS review_count
           FROM orders o JOIN order_ratings r ON r.order_id = o.id
           WHERE o.merchant_id = %s""",
        (m["id"],),
    )
    m["avg_stars"]    = float(agg["avg_stars"])    if agg and agg["avg_stars"]    is not None else 0.0
    m["review_count"] = int(agg["review_count"])   if agg and agg["review_count"] else 0
    return jsonify({"merchant": m})


@bp.patch("/me")
@role_required("seller")
def update_me():
    m = _my_merchant()
    if not m:
        return jsonify({"error": "no merchant profile"}), 404
    data = request.get_json(silent=True) or {}
    shop_name   = (data.get("shop_name") or m["shop_name"]).strip()
    description = data.get("description", m["description"])
    is_open     = 1 if (data.get("is_open", m["is_open"])) else 0
    open_hour   = int(data.get("open_hour",  m["open_hour"]))
    close_hour  = int(data.get("close_hour", m["close_hour"]))
    open_hour   = max(0, min(23, open_hour))
    close_hour  = max(0, min(23, close_hour))
    execute(
        """UPDATE merchants SET shop_name = %s, description = %s,
             is_open = %s, open_hour = %s, close_hour = %s
           WHERE id = %s""",
        (shop_name, description, is_open, open_hour, close_hour, m["id"]),
    )
    return jsonify({"merchant": _my_merchant()})


@bp.get("/flowers")
@role_required("seller")
def list_flowers():
    m = _my_merchant()
    if not m:
        return jsonify([])
    rows = query_all(
        """SELECT id, name, color, meaning, price_thb, stock, illustration, active
           FROM flowers WHERE merchant_id = %s ORDER BY name, color""",
        (m["id"],),
    )
    return jsonify(rows)


@bp.get("/low_stock")
@role_required("seller")
def low_stock():
    m = _my_merchant()
    if not m:
        return jsonify([])
    rows = query_all(
        """SELECT id, name, color, stock, price_thb, illustration
           FROM flowers WHERE merchant_id = %s AND active = 1 AND stock <= 20
           ORDER BY stock ASC""",
        (m["id"],),
    )
    return jsonify(rows)


@bp.get("/tips")
@role_required("seller")
def tip_stats():
    """Aggregate courier-tip stats for this seller's merchant.

    Tips are recorded against orders (Pass 3) and reflect a mocked
    payment surface — no money actually moves.
    """
    m = _my_merchant()
    if not m:
        return jsonify({"week_thb": 0, "total_thb": 0, "count": 0})
    row = query_one(
        """SELECT COALESCE(SUM(tip_thb), 0) AS week_thb,
                  COUNT(CASE WHEN tip_thb > 0 THEN 1 END) AS count_week
           FROM orders
           WHERE merchant_id = %s AND tip_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)""",
        (m["id"],),
    )
    total = query_one(
        """SELECT COALESCE(SUM(tip_thb), 0) AS total_thb,
                  COUNT(CASE WHEN tip_thb > 0 THEN 1 END) AS count_total
           FROM orders WHERE merchant_id = %s""",
        (m["id"],),
    )
    return jsonify({
        "week_thb":  int(row["week_thb"]) if row else 0,
        "week_count": int(row["count_week"]) if row else 0,
        "total_thb": int(total["total_thb"]) if total else 0,
        "total_count": int(total["count_total"]) if total else 0,
    })


@bp.get("/ratings")
@role_required("seller")
def list_ratings():
    """Recent ratings + reviewer info for the seller's own shop."""
    m = _my_merchant()
    if not m:
        return jsonify([])
    rows = query_all(
        """SELECT r.order_id, r.stars, r.comment, r.created_at,
                  u.name AS reviewer_name
           FROM order_ratings r
           JOIN orders o ON o.id = r.order_id
           JOIN users u  ON u.id = o.user_id
           WHERE o.merchant_id = %s
           ORDER BY r.created_at DESC LIMIT 25""",
        (m["id"],),
    )
    for r in rows:
        r["created_at"] = str(r["created_at"]) if r.get("created_at") else None
    return jsonify(rows)


@bp.post("/flowers")
@role_required("seller")
def create_flower():
    m = _my_merchant()
    if not m:
        return jsonify({"error": "no merchant profile"}), 400
    d = request.get_json(silent=True) or {}
    name  = (d.get("name") or "").strip()
    color = (d.get("color") or "").strip()
    price = int(d.get("price_thb") or 0)
    stock = int(d.get("stock") or 0)
    meaning = (d.get("meaning") or "").strip() or None
    illustration = (d.get("illustration") or "rose").strip()
    if not name or not color or price <= 0:
        return jsonify({"error": "name, color and price_thb required"}), 400
    flower_id, _ = execute(
        """INSERT INTO flowers (merchant_id, name, color, meaning, price_thb, stock, illustration, active)
           VALUES (%s, %s, %s, %s, %s, %s, %s, 1)""",
        (m["id"], name, color, meaning, price, stock, illustration),
    )
    return jsonify({"id": flower_id}), 201


@bp.patch("/flowers/<int:fid>")
@role_required("seller")
def update_flower(fid: int):
    m = _my_merchant()
    if not m:
        return jsonify({"error": "no merchant profile"}), 400
    existing = query_one("SELECT * FROM flowers WHERE id = %s AND merchant_id = %s", (fid, m["id"]))
    if not existing:
        return jsonify({"error": "not found"}), 404
    d = request.get_json(silent=True) or {}
    execute(
        """UPDATE flowers SET
             name = %s, color = %s, meaning = %s,
             price_thb = %s, stock = %s, illustration = %s, active = %s
           WHERE id = %s AND merchant_id = %s""",
        (
            d.get("name", existing["name"]),
            d.get("color", existing["color"]),
            d.get("meaning", existing["meaning"]),
            int(d.get("price_thb", existing["price_thb"])),
            int(d.get("stock", existing["stock"])),
            d.get("illustration", existing["illustration"]),
            1 if d.get("active", existing["active"]) else 0,
            fid, m["id"],
        ),
    )
    return jsonify({"ok": True})


@bp.delete("/flowers/<int:fid>")
@role_required("seller")
def deactivate_flower(fid: int):
    m = _my_merchant()
    if not m:
        return jsonify({"error": "no merchant profile"}), 400
    _, n = execute(
        "UPDATE flowers SET active = 0 WHERE id = %s AND merchant_id = %s",
        (fid, m["id"]),
    )
    if n == 0:
        return jsonify({"error": "not found"}), 404
    return jsonify({"ok": True})


# ── public-facing merchant profile (used by purchaser app) ────────────────

@bp.get("/public")
def public_merchant():
    """Read-only — surfaces the active V1 merchant for the purchaser experience."""
    m = query_one(
        """SELECT id, shop_name, description, phone, is_open, open_hour, close_hour
           FROM merchants ORDER BY id LIMIT 1"""
    )
    if not m:
        return jsonify({"merchant": None})
    agg = query_one(
        """SELECT AVG(r.stars) AS avg_stars, COUNT(*) AS review_count
           FROM orders o JOIN order_ratings r ON r.order_id = o.id
           WHERE o.merchant_id = %s""",
        (m["id"],),
    )
    m["avg_stars"]    = float(agg["avg_stars"])    if agg and agg["avg_stars"]    is not None else 0.0
    m["review_count"] = int(agg["review_count"])   if agg and agg["review_count"] else 0
    return jsonify({"merchant": m})

"""Admin routes — platform-wide view."""

from flask import Blueprint, g, jsonify, request

from auth import role_required
from db import execute, query_all, query_one


bp = Blueprint("admin", __name__)


@bp.get("/users")
@role_required("admin")
def list_users():
    rows = query_all(
        """SELECT u.id, u.name, u.email, u.role, u.phone, u.created_at,
                  m.shop_name
           FROM users u
           LEFT JOIN merchants m ON m.user_id = u.id
           ORDER BY u.created_at DESC"""
    )
    for r in rows:
        r["created_at"] = str(r["created_at"])
    return jsonify(rows)


@bp.get("/metrics")
@role_required("admin")
def metrics():
    total_users = query_one("SELECT COUNT(*) AS c FROM users")["c"]
    total_purchasers = query_one("SELECT COUNT(*) AS c FROM users WHERE role = 'purchaser'")["c"]
    total_sellers = query_one("SELECT COUNT(*) AS c FROM users WHERE role = 'seller'")["c"]
    total_orders = query_one("SELECT COUNT(*) AS c FROM orders")["c"]
    revenue = query_one(
        "SELECT COALESCE(SUM(total_thb), 0) AS s FROM orders WHERE status NOT IN ('cancelled')"
    )["s"]
    by_status = query_all(
        "SELECT status, COUNT(*) AS c FROM orders GROUP BY status"
    )
    avg_rating_row = query_one(
        "SELECT AVG(stars) AS avg_stars, COUNT(*) AS c FROM order_ratings"
    )
    cancel_requests = query_one(
        "SELECT COUNT(*) AS c FROM orders WHERE cancel_request = 'requested'"
    )["c"]
    tips = query_one(
        """SELECT COALESCE(SUM(tip_thb), 0) AS s,
                  COUNT(CASE WHEN tip_thb > 0 THEN 1 END) AS c
           FROM orders"""
    )
    return jsonify({
        "total_users":      total_users,
        "total_purchasers": total_purchasers,
        "total_sellers":    total_sellers,
        "total_orders":     total_orders,
        "revenue_thb":      int(revenue),
        "orders_by_status": {row["status"]: row["c"] for row in by_status},
        "avg_rating":       float(avg_rating_row["avg_stars"]) if avg_rating_row and avg_rating_row["avg_stars"] is not None else 0.0,
        "total_ratings":    int(avg_rating_row["c"]) if avg_rating_row else 0,
        "pending_cancel_requests": cancel_requests,
        "tips_total_thb":   int(tips["s"]) if tips else 0,
        "tips_count":       int(tips["c"]) if tips else 0,
    })


@bp.patch("/users/<int:uid>/role")
@role_required("admin")
def change_role(uid: int):
    data = request.get_json(silent=True) or {}
    role = data.get("role")
    if role not in ("purchaser", "seller", "admin"):
        return jsonify({"error": "invalid role"}), 400
    if uid == g.user["id"] and role != "admin":
        return jsonify({"error": "cannot demote your own admin account"}), 400
    _, n = execute("UPDATE users SET role = %s WHERE id = %s", (role, uid))
    if n == 0:
        return jsonify({"error": "not found"}), 404
    return jsonify({"ok": True})


# ── voucher administration ─────────────────────────────────────────────────

@bp.get("/vouchers")
@role_required("admin")
def list_vouchers():
    rows = query_all(
        """SELECT id, code, description, percent_off, flat_off_thb, min_subtotal,
                  active, expires_at, created_at
           FROM vouchers ORDER BY id DESC"""
    )
    for r in rows:
        r["expires_at"] = str(r["expires_at"]) if r.get("expires_at") else None
        r["created_at"] = str(r["created_at"]) if r.get("created_at") else None
    return jsonify(rows)


@bp.post("/vouchers")
@role_required("admin")
def create_voucher():
    data = request.get_json(silent=True) or {}
    code        = (data.get("code") or "").strip().upper()
    description = (data.get("description") or "").strip() or None
    percent_off = data.get("percent_off")
    flat_off    = data.get("flat_off_thb")
    min_sub     = int(data.get("min_subtotal") or 0)
    if not code:
        return jsonify({"error": "code required"}), 400
    if percent_off is None and flat_off is None:
        return jsonify({"error": "either percent_off or flat_off_thb required"}), 400
    if percent_off is not None:
        percent_off = max(1, min(100, int(percent_off)))
    if flat_off is not None:
        flat_off = max(1, int(flat_off))
    try:
        vid, _ = execute(
            """INSERT INTO vouchers (code, description, percent_off, flat_off_thb, min_subtotal, active)
               VALUES (%s, %s, %s, %s, %s, 1)""",
            (code, description, percent_off, flat_off, min_sub),
        )
    except Exception:
        return jsonify({"error": "could not create voucher (duplicate code?)"}), 400
    return jsonify({"id": vid}), 201


@bp.patch("/vouchers/<int:vid>")
@role_required("admin")
def toggle_voucher(vid: int):
    data = request.get_json(silent=True) or {}
    active = 1 if data.get("active") else 0
    _, n = execute("UPDATE vouchers SET active = %s WHERE id = %s", (active, vid))
    if n == 0:
        return jsonify({"error": "not found"}), 404
    return jsonify({"ok": True, "active": bool(active)})

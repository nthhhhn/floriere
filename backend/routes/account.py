"""Purchaser account routes — address book, saved recipients, favorites, voucher preview.

Everything here is purchaser-scope; the seller and admin use their own routes for similar shapes.
"""

from datetime import date

from flask import Blueprint, g, jsonify, request

from auth import role_required
from db import execute, query_all, query_one


bp = Blueprint("account", __name__)


# ── address book ───────────────────────────────────────────────────────────

@bp.get("/addresses")
@role_required("purchaser")
def list_addresses():
    rows = query_all(
        """SELECT id, label, address, district, is_default, created_at
           FROM addresses WHERE user_id = %s ORDER BY is_default DESC, id ASC""",
        (g.user["id"],),
    )
    for r in rows:
        r["created_at"] = str(r["created_at"]) if r.get("created_at") else None
    return jsonify(rows)


@bp.post("/addresses")
@role_required("purchaser")
def create_address():
    data = request.get_json(silent=True) or {}
    label    = (data.get("label") or "").strip()
    address  = (data.get("address") or "").strip()
    district = (data.get("district") or "").strip() or None
    if not label or not address:
        return jsonify({"error": "label and address required"}), 400
    is_default = bool(data.get("is_default"))
    if is_default:
        execute("UPDATE addresses SET is_default = 0 WHERE user_id = %s", (g.user["id"],))
    aid, _ = execute(
        """INSERT INTO addresses (user_id, label, address, district, is_default)
           VALUES (%s, %s, %s, %s, %s)""",
        (g.user["id"], label, address, district, 1 if is_default else 0),
    )
    return jsonify({"id": aid}), 201


@bp.delete("/addresses/<int:aid>")
@role_required("purchaser")
def delete_address(aid: int):
    _, n = execute(
        "DELETE FROM addresses WHERE id = %s AND user_id = %s",
        (aid, g.user["id"]),
    )
    if n == 0:
        return jsonify({"error": "not found"}), 404
    return jsonify({"ok": True})


# ── recipients ─────────────────────────────────────────────────────────────

@bp.get("/recipients")
@role_required("purchaser")
def list_recipients():
    rows = query_all(
        """SELECT id, name, phone, relation, created_at
           FROM recipients WHERE user_id = %s ORDER BY id ASC""",
        (g.user["id"],),
    )
    for r in rows:
        r["created_at"] = str(r["created_at"]) if r.get("created_at") else None
    return jsonify(rows)


@bp.post("/recipients")
@role_required("purchaser")
def create_recipient():
    data = request.get_json(silent=True) or {}
    name     = (data.get("name") or "").strip()
    phone    = (data.get("phone") or "").strip() or None
    relation = (data.get("relation") or "").strip() or None
    if not name:
        return jsonify({"error": "name required"}), 400
    rid, _ = execute(
        """INSERT INTO recipients (user_id, name, phone, relation)
           VALUES (%s, %s, %s, %s)""",
        (g.user["id"], name, phone, relation),
    )
    return jsonify({"id": rid}), 201


@bp.delete("/recipients/<int:rid>")
@role_required("purchaser")
def delete_recipient(rid: int):
    _, n = execute(
        "DELETE FROM recipients WHERE id = %s AND user_id = %s",
        (rid, g.user["id"]),
    )
    if n == 0:
        return jsonify({"error": "not found"}), 404
    return jsonify({"ok": True})


# ── favorites ──────────────────────────────────────────────────────────────

@bp.get("/favorites")
@role_required("purchaser")
def list_favorites():
    rows = query_all(
        """SELECT cb.id, cb.name, cb.description, cb.occasion, cb.base_price_thb, cb.image_url,
                  f.created_at
           FROM favorites f
           JOIN curated_bouquets cb ON cb.id = f.curated_bouquet_id
           WHERE f.user_id = %s AND cb.active = 1
           ORDER BY f.created_at DESC""",
        (g.user["id"],),
    )
    for r in rows:
        r["created_at"] = str(r["created_at"]) if r.get("created_at") else None
    return jsonify(rows)


@bp.post("/favorites/<int:bouquet_id>")
@role_required("purchaser")
def add_favorite(bouquet_id: int):
    b = query_one("SELECT id FROM curated_bouquets WHERE id = %s AND active = 1", (bouquet_id,))
    if not b:
        return jsonify({"error": "bouquet not found"}), 404
    execute(
        """INSERT INTO favorites (user_id, curated_bouquet_id)
           VALUES (%s, %s)
           ON DUPLICATE KEY UPDATE created_at = created_at""",
        (g.user["id"], bouquet_id),
    )
    return jsonify({"ok": True})


@bp.delete("/favorites/<int:bouquet_id>")
@role_required("purchaser")
def remove_favorite(bouquet_id: int):
    _, n = execute(
        "DELETE FROM favorites WHERE user_id = %s AND curated_bouquet_id = %s",
        (g.user["id"], bouquet_id),
    )
    if n == 0:
        return jsonify({"error": "not found"}), 404
    return jsonify({"ok": True})


# ── voucher preview ────────────────────────────────────────────────────────

@bp.post("/voucher/preview")
@role_required("purchaser")
def voucher_preview():
    """Given { code, subtotal_thb }, returns the discount we'd apply at checkout."""
    data = request.get_json(silent=True) or {}
    code = (data.get("code") or "").strip().upper()
    try:
        subtotal = int(data.get("subtotal_thb") or 0)
    except (TypeError, ValueError):
        subtotal = 0
    if not code:
        return jsonify({"error": "code required"}), 400
    v = query_one("SELECT * FROM vouchers WHERE code = %s AND active = 1", (code,))
    if not v:
        return jsonify({"valid": False, "error": "Voucher code not recognised."})
    if v["expires_at"] and v["expires_at"] < date.today():
        return jsonify({"valid": False, "error": "This voucher has expired."})
    if subtotal < (v["min_subtotal"] or 0):
        return jsonify({
            "valid": False,
            "error": f"Voucher needs a subtotal of at least ฿{v['min_subtotal']}.",
        })
    if v["percent_off"]:
        discount = int(round(subtotal * v["percent_off"] / 100))
    elif v["flat_off_thb"]:
        discount = min(v["flat_off_thb"], subtotal)
    else:
        discount = 0
    return jsonify({
        "valid":         True,
        "code":          v["code"],
        "description":   v["description"],
        "discount_thb":  discount,
        "total_thb":     max(0, subtotal - discount),
    })

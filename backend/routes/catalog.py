"""Catalog routes — public (no auth required) reads of flowers + curated bouquets.

Purchasers use these to compose, browse, search, and run Intent Mode suggestions.
"""

from flask import Blueprint, jsonify, request

from db import query_all, query_one


bp = Blueprint("catalog", __name__)


# A simple rule-based map for Intent Mode (V1 — no LLM).
INTENT_SUGGESTIONS = {
    "anniversary":  {"curated_bouquet_id": 1,  "message": "For another year of you."},
    "apology":      {"curated_bouquet_id": 2,  "message": "I'm sorry — I meant to do better."},
    "celebration":  {"curated_bouquet_id": 3,  "message": "Cheers — to this moment."},
    "sympathy":     {"curated_bouquet_id": 4,  "message": "Holding you in mind."},
    "birthday":     {"curated_bouquet_id": 5,  "message": "Many happy returns."},
    "thank_you":    {"curated_bouquet_id": 6,  "message": "Thank you — truly."},
    "get_well":     {"curated_bouquet_id": 7,  "message": "Wishing you a soft, fast recovery."},
    "graduation":   {"curated_bouquet_id": 8,  "message": "Onward — and so proud of you."},
    "wedding":      {"curated_bouquet_id": 9,  "message": "To a life well-tied together."},
    "newborn":      {"curated_bouquet_id": 10, "message": "Welcome, little one."},
    "housewarming": {"curated_bouquet_id": 11, "message": "May this home hold many quiet good days."},
}


@bp.get("/flowers")
def list_flowers():
    rows = query_all(
        """SELECT id, merchant_id, name, color, meaning, price_thb, stock, illustration, active
           FROM flowers WHERE active = 1 ORDER BY name, color"""
    )
    return jsonify(rows)


@bp.get("/curated")
def list_curated():
    q        = (request.args.get("q") or "").strip().lower()
    occasion = (request.args.get("occasion") or "").strip().lower()
    sort     = (request.args.get("sort") or "").strip().lower()

    where, params = ["cb.active = 1"], []
    if occasion and occasion != "all":
        where.append("LOWER(cb.occasion) = %s")
        params.append(occasion)
    if q:
        where.append("(LOWER(cb.name) LIKE %s OR LOWER(cb.description) LIKE %s OR LOWER(cb.occasion) LIKE %s)")
        like = f"%{q}%"
        params.extend([like, like, like])

    order_by = "cb.id"
    if   sort == "price_asc":  order_by = "cb.base_price_thb ASC"
    elif sort == "price_desc": order_by = "cb.base_price_thb DESC"
    elif sort == "newest":     order_by = "cb.created_at DESC"
    elif sort == "rating":     order_by = "COALESCE(agg.avg_stars, 0) DESC"

    sql = f"""SELECT cb.id, cb.name, cb.description, cb.occasion, cb.base_price_thb, cb.image_url,
                     COALESCE(agg.avg_stars, 0)  AS avg_stars,
                     COALESCE(agg.review_count, 0) AS review_count
              FROM curated_bouquets cb
              LEFT JOIN (
                SELECT o.curated_bouquet_id, AVG(r.stars) AS avg_stars, COUNT(*) AS review_count
                FROM order_items o JOIN order_ratings r ON r.order_id = o.order_id
                WHERE o.curated_bouquet_id IS NOT NULL
                GROUP BY o.curated_bouquet_id
              ) agg ON agg.curated_bouquet_id = cb.id
              WHERE {' AND '.join(where)}
              ORDER BY {order_by}"""
    bouquets = query_all(sql, tuple(params))

    if not bouquets:
        return jsonify([])

    composition = query_all(
        """SELECT cbf.curated_bouquet_id, cbf.flower_id, cbf.quantity,
                  f.name, f.color, f.price_thb, f.illustration
           FROM curated_bouquet_flowers cbf JOIN flowers f ON f.id = cbf.flower_id"""
    )
    by_id = {}
    for c in composition:
        by_id.setdefault(c["curated_bouquet_id"], []).append({
            "flower_id":    c["flower_id"],
            "name":         c["name"],
            "color":        c["color"],
            "quantity":     c["quantity"],
            "price_thb":    c["price_thb"],
            "illustration": c["illustration"],
        })
    for b in bouquets:
        b["flowers"]      = by_id.get(b["id"], [])
        b["avg_stars"]    = float(b["avg_stars"]) if b["avg_stars"] is not None else 0.0
        b["review_count"] = int(b["review_count"] or 0)
    return jsonify(bouquets)


@bp.get("/curated/<int:cid>")
def curated_detail(cid: int):
    bouquet = query_one(
        """SELECT id, name, description, occasion, base_price_thb, image_url
           FROM curated_bouquets WHERE id = %s AND active = 1""",
        (cid,),
    )
    if not bouquet:
        return jsonify({"error": "not found"}), 404
    bouquet["flowers"] = query_all(
        """SELECT f.id AS flower_id, f.name, f.color, cbf.quantity, f.price_thb, f.illustration
           FROM curated_bouquet_flowers cbf JOIN flowers f ON f.id = cbf.flower_id
           WHERE cbf.curated_bouquet_id = %s""",
        (cid,),
    )
    agg = query_one(
        """SELECT AVG(r.stars) AS avg_stars, COUNT(*) AS review_count
           FROM order_items o JOIN order_ratings r ON r.order_id = o.order_id
           WHERE o.curated_bouquet_id = %s""",
        (cid,),
    )
    bouquet["avg_stars"]    = float(agg["avg_stars"]) if agg and agg["avg_stars"] is not None else 0.0
    bouquet["review_count"] = int(agg["review_count"]) if agg and agg["review_count"] else 0

    reviews = query_all(
        """SELECT r.stars, r.comment, r.created_at, u.name AS reviewer_name
           FROM order_items o
           JOIN order_ratings r ON r.order_id = o.order_id
           JOIN orders ord ON ord.id = o.order_id
           JOIN users u ON u.id = ord.user_id
           WHERE o.curated_bouquet_id = %s AND r.comment IS NOT NULL
           ORDER BY r.created_at DESC LIMIT 10""",
        (cid,),
    )
    for r in reviews:
        r["created_at"] = str(r["created_at"]) if r.get("created_at") else None
    bouquet["reviews"] = reviews
    return jsonify(bouquet)


@bp.get("/intent")
def intent_suggest():
    occasion = (request.args.get("occasion") or "").strip().lower()
    suggestion = INTENT_SUGGESTIONS.get(occasion)
    if not suggestion:
        return jsonify({
            "occasion": occasion,
            "matched":  False,
            "fallback": {"curated_bouquet_id": 1, "message": "For you, on this day."},
        })
    bouquet = query_one(
        """SELECT id, name, description, occasion, base_price_thb, image_url
           FROM curated_bouquets WHERE id = %s""",
        (suggestion["curated_bouquet_id"],),
    )
    bouquet["flowers"] = query_all(
        """SELECT f.id AS flower_id, f.name, f.color, cbf.quantity, f.price_thb, f.illustration
           FROM curated_bouquet_flowers cbf JOIN flowers f ON f.id = cbf.flower_id
           WHERE cbf.curated_bouquet_id = %s""",
        (suggestion["curated_bouquet_id"],),
    )
    return jsonify({
        "occasion":          occasion,
        "matched":           True,
        "suggested_bouquet": bouquet,
        "suggested_message": suggestion["message"],
    })

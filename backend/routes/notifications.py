"""Notifications inbox — in-app pings.

Push notifications are out of scope per deck Slide 9, but in-app pings (à la
Grab Food's bell icon) are very much fair game and they sell the live-app feel.
"""

from flask import Blueprint, g, jsonify, request

from auth import login_required
from db import execute, query_all, query_one


bp = Blueprint("notifications", __name__)


@bp.get("")
@login_required
def list_notifications():
    rows = query_all(
        """SELECT id, kind, title, body, href, order_id, read_at, created_at
           FROM notifications WHERE user_id = %s
           ORDER BY created_at DESC LIMIT 50""",
        (g.user["id"],),
    )
    for r in rows:
        r["created_at"] = str(r["created_at"]) if r.get("created_at") else None
        r["read_at"]    = str(r["read_at"])    if r.get("read_at")    else None
    return jsonify(rows)


@bp.get("/unread_count")
@login_required
def unread_count():
    row = query_one(
        "SELECT COUNT(*) AS c FROM notifications WHERE user_id = %s AND read_at IS NULL",
        (g.user["id"],),
    )
    return jsonify({"count": row["c"] if row else 0})


@bp.post("/read")
@login_required
def mark_read():
    data = request.get_json(silent=True) or {}
    ids = data.get("ids")
    if ids:
        if not isinstance(ids, list):
            return jsonify({"error": "ids must be a list"}), 400
        ids = [int(i) for i in ids]
        placeholders = ",".join(["%s"] * len(ids))
        execute(
            f"""UPDATE notifications SET read_at = NOW()
                 WHERE user_id = %s AND id IN ({placeholders})""",
            (g.user["id"], *ids),
        )
    else:
        execute(
            "UPDATE notifications SET read_at = NOW() WHERE user_id = %s AND read_at IS NULL",
            (g.user["id"],),
        )
    return jsonify({"ok": True})

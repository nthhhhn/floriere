"""Token-based session auth. Tokens live in the `sessions` table.

Frontend sends `Authorization: Bearer <token>`. Server resolves to user.
"""

from datetime import datetime, timedelta
from functools import wraps
from secrets import token_hex

from flask import g, jsonify, request

from db import execute, query_one


SESSION_LIFETIME_DAYS = 14


def create_session(user_id: int) -> str:
    token = token_hex(32)
    expires = datetime.utcnow() + timedelta(days=SESSION_LIFETIME_DAYS)
    execute(
        "INSERT INTO sessions (user_id, token, expires_at) VALUES (%s, %s, %s)",
        (user_id, token, expires),
    )
    return token


def destroy_session(token: str) -> None:
    execute("DELETE FROM sessions WHERE token = %s", (token,))


def resolve_user_from_request():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[len("Bearer ") :].strip()
    if not token:
        return None
    row = query_one(
        """SELECT u.id, u.name, u.email, u.role, s.expires_at
           FROM sessions s JOIN users u ON u.id = s.user_id
           WHERE s.token = %s""",
        (token,),
    )
    if not row:
        return None
    if row["expires_at"] < datetime.utcnow():
        execute("DELETE FROM sessions WHERE token = %s", (token,))
        return None
    return {"id": row["id"], "name": row["name"], "email": row["email"], "role": row["role"]}


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = resolve_user_from_request()
        if not user:
            return jsonify({"error": "Not authenticated"}), 401
        g.user = user
        return fn(*args, **kwargs)

    return wrapper


def role_required(*allowed_roles):
    def deco(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = resolve_user_from_request()
            if not user:
                return jsonify({"error": "Not authenticated"}), 401
            if user["role"] not in allowed_roles:
                return jsonify({"error": "Forbidden"}), 403
            g.user = user
            return fn(*args, **kwargs)

        return wrapper

    return deco

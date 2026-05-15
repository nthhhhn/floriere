"""Auth routes — register, login, logout, /me."""

from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from auth import create_session, destroy_session, login_required, resolve_user_from_request
from db import execute, query_one


bp = Blueprint("auth", __name__)


@bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    name     = (data.get("name") or "").strip()
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    phone    = (data.get("phone") or "").strip() or None
    as_seller = bool(data.get("as_seller"))
    shop_name = (data.get("shop_name") or "").strip()

    if not name or not email or not password:
        return jsonify({"error": "name, email and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "password must be at least 6 characters"}), 400
    if as_seller and not shop_name:
        return jsonify({"error": "shop_name required when registering as a seller"}), 400

    if query_one("SELECT id FROM users WHERE email = %s", (email,)):
        return jsonify({"error": "email already registered"}), 409

    role = "seller" if as_seller else "purchaser"
    user_id, _ = execute(
        "INSERT INTO users (name, email, password_hash, role, phone) VALUES (%s, %s, %s, %s, %s)",
        (name, email, generate_password_hash(password), role, phone),
    )

    if role == "seller":
        execute(
            "INSERT INTO merchants (user_id, shop_name) VALUES (%s, %s)",
            (user_id, shop_name),
        )
    else:
        # Every purchaser gets an empty cart.
        execute("INSERT INTO carts (user_id) VALUES (%s)", (user_id,))

    token = create_session(user_id)
    return jsonify({
        "token": token,
        "user":  {"id": user_id, "name": name, "email": email, "role": role},
    }), 201


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    user = query_one(
        "SELECT id, name, email, password_hash, role FROM users WHERE email = %s",
        (email,),
    )
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "invalid email or password"}), 401

    token = create_session(user["id"])
    return jsonify({
        "token": token,
        "user":  {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]},
    })


@bp.post("/logout")
@login_required
def logout():
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        destroy_session(auth[len("Bearer "):].strip())
    return jsonify({"ok": True})


@bp.get("/me")
def me():
    user = resolve_user_from_request()
    if not user:
        return jsonify({"user": None})
    return jsonify({"user": user})

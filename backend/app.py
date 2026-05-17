"""Florière Flask app — Phase 2.

Run locally:
  source venv/bin/activate
  pip install -r requirements.txt
  python app.py
"""

import os

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS

# Load .env early so route modules that read GEMINI_API_KEY etc. see the values.
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from routes.auth import bp as auth_bp
from routes.catalog import bp as catalog_bp
from routes.cart import bp as cart_bp
from routes.orders import bp as orders_bp
from routes.seller import bp as seller_bp
from routes.admin import bp as admin_bp
from routes.account import bp as account_bp
from routes.notifications import bp as notifications_bp
from routes.concierge import bp as concierge_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.secret_key = os.environ.get("FLORIERE_SECRET", "floriere-dev-secret")

    CORS(
        app,
        supports_credentials=True,
        origins=[
            "http://localhost:8081",
            "http://127.0.0.1:8081",
            "http://localhost:19006",
            "http://127.0.0.1:19006",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
        expose_headers=["Content-Type", "Authorization"],
    )

    @app.route("/health")
    def health():
        return jsonify({"status": "ok", "app": "Floriere"})

    app.register_blueprint(auth_bp,          url_prefix="/auth")
    app.register_blueprint(catalog_bp,       url_prefix="/catalog")
    app.register_blueprint(cart_bp,          url_prefix="/cart")
    app.register_blueprint(orders_bp,        url_prefix="/orders")
    app.register_blueprint(seller_bp,        url_prefix="/seller")
    app.register_blueprint(admin_bp,         url_prefix="/admin")
    app.register_blueprint(account_bp,       url_prefix="/account")
    app.register_blueprint(notifications_bp, url_prefix="/notifications")
    app.register_blueprint(concierge_bp,     url_prefix="/concierge")

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
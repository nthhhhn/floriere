from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from db import get_connection

app = Flask(__name__)
app.secret_key = "floriere-dev-secret"
CORS(app, supports_credentials=True, origins=["http://localhost:8081"])


def get_current_user():
    user_id = request.headers.get('X-User-ID')
    if not user_id:
        return None
    return int(user_id)


# ── Health ────────────────────────────────────────────────
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'app': 'Floriere'})


# ── Auth ──────────────────────────────────────────────────
@app.route('/auth/register', methods=['POST'])
def register():
    data     = request.get_json()
    name     = data.get('name')
    email    = data.get('email')
    password = data.get('password')

    if not name or not email or not password:
        return jsonify({'error': 'All fields required'}), 400

    hashed = generate_password_hash(password)

    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (name, email, password) VALUES (%s, %s, %s)",
            (name, email, hashed)
        )
        conn.commit()
        user_id = cursor.lastrowid
        cursor.close()
        conn.close()
    except Exception:
        return jsonify({'error': 'Email already registered'}), 409

    return jsonify({'message': 'Registered successfully', 'name': name, 'user_id': user_id}), 201


@app.route('/auth/login', methods=['POST'])
def login():
    data     = request.get_json()
    email    = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400

    conn   = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
    user   = cursor.fetchone()
    cursor.close()
    conn.close()

    if not user or not check_password_hash(user['password'], password):
        return jsonify({'error': 'Invalid email or password'}), 401

    return jsonify({'message': 'Logged in', 'name': user['name'], 'user_id': user['id']}), 200


@app.route('/auth/logout', methods=['POST'])
def logout():
    return jsonify({'message': 'Logged out'}), 200


# ── Bouquets ──────────────────────────────────────────────
@app.route('/bouquets', methods=['GET'])
def get_bouquets():
    conn   = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM bouquets")
    bouquets = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(bouquets)


# ── Orders ────────────────────────────────────────────────
@app.route('/orders', methods=['POST'])
def place_order():
    print("Headers received:", dict(request.headers))
    user_id = get_current_user()
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401

    data              = request.get_json()
    bouquet_id        = data.get('bouquet_id')
    delivery_date     = data.get('delivery_date')
    delivery_address  = data.get('delivery_address')
    recipient_message = data.get('recipient_message', '')

    if not bouquet_id or not delivery_date or not delivery_address:
        return jsonify({'error': 'bouquet_id, delivery_date and delivery_address are required'}), 400

    conn   = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM bouquets WHERE id = %s", (bouquet_id,))
    bouquet = cursor.fetchone()

    if not bouquet:
        cursor.close()
        conn.close()
        return jsonify({'error': 'Bouquet not found'}), 404

    total_price = bouquet['base_price']

    cursor.execute(
        """INSERT INTO orders
           (user_id, bouquet_id, total_price, delivery_date, delivery_address, recipient_message)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (user_id, bouquet_id, total_price,
         delivery_date, delivery_address, recipient_message)
    )
    conn.commit()
    order_id = cursor.lastrowid
    cursor.close()
    conn.close()

    return jsonify({
        'message':     'Order placed',
        'order_id':    order_id,
        'total_price': str(total_price),
        'status':      'pending'
    }), 201


@app.route('/orders', methods=['GET'])
def get_orders():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401

    conn   = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT o.id, o.total_price, o.delivery_date, o.delivery_address,
               o.recipient_message, o.status, o.created_at,
               b.name AS bouquet_name
        FROM orders o
        JOIN bouquets b ON o.bouquet_id = b.id
        WHERE o.user_id = %s
        ORDER BY o.created_at DESC
    """, (user_id,))
    orders = cursor.fetchall()
    cursor.close()
    conn.close()

    for order in orders:
        order['delivery_date'] = str(order['delivery_date'])
        order['created_at']    = str(order['created_at'])

    return jsonify(orders), 200


@app.route('/orders/<int:order_id>/status', methods=['PATCH'])
def update_status(order_id):
    user_id = get_current_user()
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401

    data       = request.get_json()
    new_status = data.get('status')
    allowed    = ['pending', 'preparing', 'out_for_delivery', 'delivered']

    if new_status not in allowed:
        return jsonify({'error': f'Status must be one of {allowed}'}), 400

    conn   = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE orders SET status = %s WHERE id = %s AND user_id = %s",
        (new_status, order_id, user_id)
    )
    conn.commit()
    affected = cursor.rowcount
    cursor.close()
    conn.close()

    if affected == 0:
        return jsonify({'error': 'Order not found'}), 404

    return jsonify({'message': 'Status updated', 'status': new_status}), 200


if __name__ == '__main__':
    app.run(debug=True)
"""MySQL connection helper.

DB credentials read from env, with friend's V1 defaults as a fallback so a
plain clone-and-run still works:

  FLORIERE_DB_HOST     (default: 127.0.0.1)
  FLORIERE_DB_PORT     (default: 3306)
  FLORIERE_DB_USER     (default: root)
  FLORIERE_DB_PASSWORD (default: floriere123)
  FLORIERE_DB_NAME     (default: floriere)
"""

import os
import mysql.connector
from mysql.connector import pooling


_pool = None


def _make_pool():
    global _pool
    if _pool is not None:
        return _pool
    _pool = pooling.MySQLConnectionPool(
        pool_name="floriere_pool",
        pool_size=int(os.environ.get("FLORIERE_DB_POOL", "5")),
        host=os.environ.get("FLORIERE_DB_HOST", "127.0.0.1"),
        port=int(os.environ.get("FLORIERE_DB_PORT", "3306")),
        user=os.environ.get("FLORIERE_DB_USER", "root"),
        password=os.environ.get("FLORIERE_DB_PASSWORD", "floriere123"),
        database=os.environ.get("FLORIERE_DB_NAME", "floriere"),
        charset="utf8mb4",
        autocommit=False,
    )
    return _pool


def get_connection():
    return _make_pool().get_connection()


def query_one(sql, params=None):
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(sql, params or ())
        row = cur.fetchone()
        cur.close()
        return row
    finally:
        conn.close()


def query_all(sql, params=None):
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(sql, params or ())
        rows = cur.fetchall()
        cur.close()
        return rows
    finally:
        conn.close()


def execute(sql, params=None):
    """Run an INSERT/UPDATE/DELETE. Returns (lastrowid, rowcount)."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(sql, params or ())
        conn.commit()
        last_id = cur.lastrowid
        rowcount = cur.rowcount
        cur.close()
        return last_id, rowcount
    finally:
        conn.close()

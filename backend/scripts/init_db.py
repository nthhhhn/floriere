"""One-shot DB bootstrap.

Run AFTER you've created the MySQL database server and connection works.

  python scripts/init_db.py            # apply schema.sql + seed.sql + write real password hashes
  python scripts/init_db.py --rehash   # only re-write demo password hashes (after editing seed.sql)
  python scripts/init_db.py --schema   # only apply schema.sql (drops + recreates tables)
  python scripts/init_db.py --seed     # only apply seed.sql + rehash

Demo passwords (these get hashed and written by --rehash):
  pete@floriere.test     / purchaser123
  merchant@floriere.test / merchant123
  admin@floriere.test    / admin123
"""

import os
import sys
from pathlib import Path

# Allow `python scripts/init_db.py` from the backend dir
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from werkzeug.security import generate_password_hash  # noqa: E402
from dotenv import load_dotenv

# Load .env so we pick up DB credentials
load_dotenv(ROOT / ".env")

from db import get_connection  # noqa: E402


DEMO_PASSWORDS = {
    "pete@floriere.test":     "purchaser123",
    "merchant@floriere.test": "merchant123",
    "admin@floriere.test":    "admin123",
}


def _split_statements(sql: str) -> list[str]:
    """Strip `--` comments, split on `;`, drop empties.
    Our schema/seed never put `;` inside string literals, so naive split is fine.
    """
    no_comments = "\n".join(
        line for line in sql.splitlines()
        if not line.strip().startswith("--")
    )
    return [s.strip() for s in no_comments.split(";") if s.strip()]


def _run_script(path: Path):
    sql = path.read_text(encoding="utf-8")
    conn = get_connection()
    try:
        cur = conn.cursor()
        for stmt in _split_statements(sql):
            cur.execute(stmt)
            try:
                cur.fetchall()
            except Exception:
                pass
        conn.commit()
        cur.close()
    finally:
        conn.close()


def _rehash():
    conn = get_connection()
    try:
        cur = conn.cursor()
        for email, plaintext in DEMO_PASSWORDS.items():
            cur.execute(
                "UPDATE users SET password_hash = %s WHERE email = %s",
                (generate_password_hash(plaintext), email),
            )
        conn.commit()
        cur.close()
    finally:
        conn.close()


def main(argv):
    mode = argv[1] if len(argv) > 1 else "all"
    schema = ROOT / "schema.sql"
    seed   = ROOT / "seed.sql"

    if mode in ("all", "--schema"):
        print(f"-> applying {schema.name}")
        _run_script(schema)
    if mode in ("all", "--seed"):
        print(f"-> applying {seed.name}")
        _run_script(seed)
    if mode in ("all", "--seed", "--rehash"):
        print("-> rehashing demo passwords")
        _rehash()
    print("done.")


if __name__ == "__main__":
    main(sys.argv)

"""Tiny DB layer: Postgres when DATABASE_URL is set (production), SQLite file otherwise (local dev).

Callers write SQL with `?` placeholders and use `RETURNING` / `CURRENT_TIMESTAMP`, which both engines accept.
"""
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime

DATABASE_URL = os.environ.get("DATABASE_URL")
IS_PG = bool(DATABASE_URL)
DB_PATH = os.environ.get("JALDROP_DB", os.path.join(os.path.dirname(__file__), "..", "jaldrop.db"))

_SCHEMA = """
CREATE TABLE IF NOT EXISTS leads (
    id {PK},
    kind TEXT NOT NULL,              -- waitlist | b2b | partner
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    pincode TEXT,
    business_name TEXT,
    jars_per_month INTEGER,
    notes TEXT,
    created_at {TS}
);

CREATE TABLE IF NOT EXISTS orders (
    id {PK},
    code TEXT NOT NULL UNIQUE,         -- public order code, e.g. JD7K2M9Q
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    pincode TEXT NOT NULL,
    zone TEXT NOT NULL,
    society TEXT NOT NULL,
    tower TEXT,
    flat TEXT NOT NULL,
    product_id TEXT NOT NULL,
    jars_now INTEGER NOT NULL,         -- jars delivered with this request
    has_jars INTEGER NOT NULL,         -- 1 if customer already holds WaterMart jars
    amount INTEGER NOT NULL,           -- rupees for the product(s)
    deposit INTEGER NOT NULL,          -- refundable deposit due (rupees)
    slot TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'requested',
    created_at {TS},
    updated_at {TS},
    listing_id INTEGER,                -- set when the customer chose a partner's product
    partner_id INTEGER,
    product_name TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);

CREATE TABLE IF NOT EXISTS otp_codes (
    id {PK},
    phone TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    expires_at BIGINT NOT NULL,        -- unix seconds
    attempts INTEGER NOT NULL DEFAULT 0,
    used INTEGER NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone, created_at);

CREATE TABLE IF NOT EXISTS sessions (
    id {PK},
    token_hash TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    expires_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS partners (
    id {PK},
    phone TEXT NOT NULL UNIQUE,         -- logs in with this number (OTP)
    business_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',   -- active | suspended
    created_at {TS},
    password_hash TEXT,                 -- PBKDF2-SHA256; NULL until the partner sets one
    setup_code_hash TEXT,               -- one-time code ops hand over so the partner can set a password
    setup_expires BIGINT NOT NULL DEFAULT 0,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS listings (
    id {PK},
    partner_id INTEGER NOT NULL REFERENCES partners(id),
    name TEXT NOT NULL,
    brand TEXT,
    size_litres INTEGER NOT NULL,
    price INTEGER NOT NULL,             -- rupees per unit, set by the partner
    pincodes TEXT NOT NULL DEFAULT '',  -- comma-separated delivery pincodes
    status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
    review_note TEXT,
    created_at {TS},
    updated_at {TS}
);
CREATE INDEX IF NOT EXISTS idx_listings_partner ON listings(partner_id);
"""

if IS_PG:
    # Row-level security with no policies: hosts that expose the public schema over a REST API (Supabase)
    # then can't read customer phones/addresses with their public key. Our own server connection still can.
    SCHEMA = _SCHEMA.format(PK="SERIAL PRIMARY KEY", TS="TIMESTAMPTZ NOT NULL DEFAULT now()") + """
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
"""
else:
    SCHEMA = _SCHEMA.format(PK="INTEGER PRIMARY KEY AUTOINCREMENT", TS="TEXT NOT NULL DEFAULT (datetime('now'))")


class _Conn:
    """Same `execute(sql, args)` on both engines; rows are readable as row["column"]."""

    def __init__(self, raw):
        self.raw = raw

    def execute(self, sql: str, args=()):
        if IS_PG:
            return self.raw.execute(sql.replace("?", "%s"), tuple(args))
        return self.raw.execute(sql, tuple(args))


@contextmanager
def connect():
    if IS_PG:
        import psycopg
        from psycopg.rows import dict_row

        # prepare_threshold=None: poolers in transaction mode (Supabase :6543, Neon -pooler) reject prepared statements
        raw = psycopg.connect(DATABASE_URL, row_factory=dict_row, prepare_threshold=None)
    else:
        raw = sqlite3.connect(DB_PATH)
        raw.row_factory = sqlite3.Row
    try:
        yield _Conn(raw)
        raw.commit()
    except Exception:
        raw.rollback()
        raise
    finally:
        raw.close()


_NEW_COLUMNS = {
    "orders": [("listing_id", "INTEGER"), ("partner_id", "INTEGER"), ("product_name", "TEXT")],
    "partners": [("password_hash", "TEXT"), ("setup_code_hash", "TEXT"), ("setup_expires", "BIGINT NOT NULL DEFAULT 0"),
                 ("failed_attempts", "INTEGER NOT NULL DEFAULT 0"), ("locked_until", "BIGINT NOT NULL DEFAULT 0")],
}


def init_db() -> None:
    """Create tables, then add columns introduced after a database was first created."""
    with connect() as conn:
        if IS_PG:
            conn.raw.execute(SCHEMA)
        else:
            conn.raw.executescript(SCHEMA)
        for table, cols in _NEW_COLUMNS.items():
            have = set() if IS_PG else {r["name"] for r in conn.raw.execute(f"PRAGMA table_info({table})")}
            for col, typ in cols:
                if IS_PG:
                    conn.raw.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {typ}")
                elif col not in have:
                    conn.raw.execute(f"ALTER TABLE {table} ADD COLUMN {col} {typ}")
    with connect() as conn:
        conn.execute("CREATE INDEX IF NOT EXISTS idx_orders_partner ON orders(partner_id)")


def ts(value) -> str:
    """Timestamps as 'YYYY-MM-DD HH:MM:SS' (UTC) on both engines."""
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    return str(value)

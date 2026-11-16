import os
import sqlite3
from contextlib import contextmanager

DB_PATH = os.environ.get("JALDROP_DB", os.path.join(os.path.dirname(__file__), "..", "jaldrop.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,              -- waitlist | b2b | partner
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    pincode TEXT,
    business_name TEXT,
    jars_per_month INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    has_jars INTEGER NOT NULL,         -- 1 if customer already holds JalDrop jars
    amount INTEGER NOT NULL,           -- rupees for the product(s)
    deposit INTEGER NOT NULL,          -- refundable deposit due (rupees)
    slot TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'requested',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
"""


@contextmanager
def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA)

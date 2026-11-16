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

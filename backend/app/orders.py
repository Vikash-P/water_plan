"""Water jar requests: customers place and track them; ops confirm and deliver them."""
import os
import secrets
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

from . import catalog
from .db import connect, ts
from .validators import PIN_RE, normalize_phone

router = APIRouter(prefix="/api")

SLOTS = {
    "asap": "ASAP (within ~2 hours)",
    "tomorrow_morning": "Tomorrow morning (8–12)",
    "tomorrow_evening": "Tomorrow evening (4–8)",
}
STATUSES = ["requested", "confirmed", "out_for_delivery", "delivered", "cancelled"]
# What ops may move an order to, from each state.
TRANSITIONS = {
    "requested": {"confirmed", "cancelled"},
    "confirmed": {"out_for_delivery", "cancelled"},
    "out_for_delivery": {"delivered", "cancelled"},
    "delivered": set(),
    "cancelled": set(),
}
CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no 0/O/1/I/L


def new_code() -> str:
    return "JD" + "".join(secrets.choice(CODE_ALPHABET) for _ in range(6))


class OrderIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    phone: str
    pincode: str
    society: str = Field(min_length=2, max_length=120)
    tower: Optional[str] = Field(default=None, max_length=40)
    flat: str = Field(min_length=1, max_length=40)
    product_id: str
    jars_now: int = Field(default=1, ge=1, le=5)
    has_jars: bool = False
    slot: str
    notes: Optional[str] = Field(default=None, max_length=500)

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        return normalize_phone(v)

    @field_validator("pincode")
    @classmethod
    def _pin(cls, v: str) -> str:
        if not PIN_RE.match(v):
            raise ValueError("Pincode must be 6 digits")
        return v


class PhoneIn(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        return normalize_phone(v)


class StatusIn(BaseModel):
    status: str


def _public(row) -> dict:
    """Order as shown to the customer (no internal ids)."""
    product = next((p for p in catalog.PRODUCTS if p["id"] == row["product_id"]), None)
    return {
        "code": row["code"],
        "status": row["status"],
        "name": row["name"],
        "zone": row["zone"],
        "society": row["society"],
        "tower": row["tower"],
        "flat": row["flat"],
        "product": product["name"] if product else row["product_id"],
        "jars_now": row["jars_now"],
        "amount": row["amount"],
        "deposit": row["deposit"],
        "total_due": row["amount"] + row["deposit"],
        "slot": SLOTS.get(row["slot"], row["slot"]),
        "created_at": ts(row["created_at"]),
        "updated_at": ts(row["updated_at"]),
    }


@router.post("/orders", status_code=201)
def create_order(order: OrderIn):
    product = next((p for p in catalog.PRODUCTS if p["id"] == order.product_id), None)
    if not product:
        raise HTTPException(422, "Unknown product")
    if order.slot not in SLOTS:
        raise HTTPException(422, "Unknown delivery slot")
    zone = next((z for z in catalog.ZONES if order.pincode in z["pincodes"]), None)
    if not zone:
        raise HTTPException(422, "We don't deliver to this pincode yet. Join the waitlist instead.")
    if zone["status"] != "launching":
        raise HTTPException(422, f"{zone['name']} isn't live yet. Join the waitlist and we'll tell you when it is.")

    # Singles are priced per jar; a pass is bought once and the first jars are delivered now.
    amount = product["price"] * (order.jars_now if product["id"] == "single" else 1)
    deposit = 0 if order.has_jars else catalog.DEPOSIT_PER_JAR * order.jars_now

    with connect() as conn:
        for _ in range(5):  # retry on the (very unlikely) code collision
            code = new_code()
            inserted = conn.execute(
                "INSERT INTO orders (code, name, phone, pincode, zone, society, tower, flat, product_id,"
                " jars_now, has_jars, amount, deposit, slot, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
                " ON CONFLICT (code) DO NOTHING RETURNING id",
                (code, order.name.strip(), order.phone, order.pincode, zone["name"], order.society.strip(),
                 (order.tower or "").strip() or None, order.flat.strip(), product["id"], order.jars_now,
                 int(order.has_jars), amount, deposit, order.slot, order.notes),
            ).fetchone()
            if inserted:
                break
        else:
            raise HTTPException(500, "Could not create order, please retry")
        row = conn.execute("SELECT * FROM orders WHERE code = ?", (code,)).fetchone()
    return _public(row)


@router.get("/orders/{code}")
def track_order(code: str, phone: str = Query(...)):
    """Customers need both the code and the phone number used on the order."""
    try:
        phone = normalize_phone(phone)
    except ValueError:
        raise HTTPException(404, "Order not found")
    with connect() as conn:
        row = conn.execute("SELECT * FROM orders WHERE code = ? AND phone = ?", (code.upper(), phone)).fetchone()
    if not row:
        raise HTTPException(404, "Order not found")  # same answer for wrong code or wrong phone
    return _public(row)


@router.post("/orders/{code}/cancel")
def cancel_order(code: str, body: PhoneIn):
    with connect() as conn:
        row = conn.execute("SELECT * FROM orders WHERE code = ? AND phone = ?", (code.upper(), body.phone)).fetchone()
        if not row:
            raise HTTPException(404, "Order not found")
        if "cancelled" not in TRANSITIONS[row["status"]] or row["status"] == "out_for_delivery":
            raise HTTPException(409, "This order can no longer be cancelled. Please call support.")
        conn.execute("UPDATE orders SET status='cancelled', updated_at=CURRENT_TIMESTAMP WHERE id=?", (row["id"],))
        row = conn.execute("SELECT * FROM orders WHERE id = ?", (row["id"],)).fetchone()
    return _public(row)


# ---- Ops (admin) -----------------------------------------------------------

def require_admin(key: Optional[str]) -> None:
    expected = os.environ.get("JALDROP_ADMIN_KEY")
    if not expected:
        raise HTTPException(503, "Admin is disabled: set JALDROP_ADMIN_KEY on the server")
    if not key or not secrets.compare_digest(key, expected):
        raise HTTPException(401, "Invalid admin key")


def _admin_row(row) -> dict:
    d = _public(row)
    d.update({"id": row["id"], "phone": row["phone"], "pincode": row["pincode"], "notes": row["notes"],
              "has_jars": bool(row["has_jars"]), "slot_id": row["slot"],
              "next_statuses": sorted(TRANSITIONS[row["status"]])})
    return d


@router.get("/admin/orders")
def admin_list(status: Optional[str] = None, x_admin_key: Optional[str] = Header(default=None)):
    require_admin(x_admin_key)
    sql, args = "SELECT * FROM orders", []
    if status:
        sql += " WHERE status = ?"
        args.append(status)
    sql += " ORDER BY id DESC LIMIT 200"
    with connect() as conn:
        rows = conn.execute(sql, args).fetchall()
    return {"orders": [_admin_row(r) for r in rows]}


@router.patch("/admin/orders/{order_id}")
def admin_set_status(order_id: int, body: StatusIn, x_admin_key: Optional[str] = Header(default=None)):
    require_admin(x_admin_key)
    with connect() as conn:
        row = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Order not found")
        if body.status not in TRANSITIONS[row["status"]]:
            raise HTTPException(409, f"Can't move from {row['status']} to {body.status}")
        conn.execute("UPDATE orders SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", (body.status, order_id))
        row = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    return _admin_row(row)

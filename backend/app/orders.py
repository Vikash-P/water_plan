"""Water jar requests: customers place and track them; ops confirm and deliver them."""
import hashlib
import hmac
import os
import secrets
import time
from typing import Optional

from fastapi import APIRouter, Cookie, Header, HTTPException, Query, Request, Response
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
    product_id: Optional[str] = None
    listing_id: Optional[int] = Field(default=None, ge=1)
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
        "product": row["product_name"] or (product["name"] if product else row["product_id"]),
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
    return place_order(order)


def place_order(order: OrderIn) -> dict:
    listing = None
    if order.listing_id:
        with connect() as conn:
            listing = conn.execute(
                "SELECT l.*, p.business_name, p.deposit_per_jar FROM listings l JOIN partners p ON p.id = l.partner_id"
                " WHERE l.id = ? AND l.status = 'approved' AND p.status = 'active'", (order.listing_id,),
            ).fetchone()
        if not listing:
            raise HTTPException(422, "This product is no longer available. Please pick another.")
        pins = [x for x in listing["pincodes"].split(",") if x]
        if pins and order.pincode not in pins:
            raise HTTPException(422, f"This product doesn't deliver to {order.pincode}. Pick another product.")
        product = {"id": f"listing:{listing['id']}", "name": listing["name"], "price": listing["price"]}
    else:
        product = next((p for p in catalog.PRODUCTS if p["id"] == order.product_id), None)
    if not product:
        raise HTTPException(422, "Unknown product")
    if order.slot not in SLOTS:
        raise HTTPException(422, "Unknown delivery slot")
    zone = next((z for z in catalog.ZONES if order.pincode in z["pincodes"]), None)
    if not zone and listing is not None:  # the partner already confirmed (above) that they deliver to this pincode
        zone = {"name": f"Pincode {order.pincode}", "status": "launching"}
    if not zone:
        raise HTTPException(422, "We don't deliver to this pincode yet. Join the waitlist instead.")
    if zone["status"] != "launching":
        raise HTTPException(422, f"{zone['name']} isn't live yet. Join the waitlist and we'll tell you when it is.")

    # Singles and partner products are priced per jar; a pass is bought once and the first jars are delivered now.
    per_jar = listing is not None or product["id"] == "single"
    amount = product["price"] * (order.jars_now if per_jar else 1)
    per_jar_deposit = catalog.DEPOSIT_PER_JAR
    if listing is not None and listing["deposit_per_jar"] is not None:
        per_jar_deposit = listing["deposit_per_jar"]  # each partner sets their own
    deposit = 0 if order.has_jars else per_jar_deposit * order.jars_now

    with connect() as conn:
        for _ in range(5):  # retry on the (very unlikely) code collision
            code = new_code()
            inserted = conn.execute(
                "INSERT INTO orders (code, name, phone, pincode, zone, society, tower, flat, product_id,"
                " jars_now, has_jars, amount, deposit, slot, notes, listing_id, partner_id, product_name)"
                " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
                " ON CONFLICT (code) DO NOTHING RETURNING id",
                (code, order.name.strip(), order.phone, order.pincode, zone["name"], order.society.strip(),
                 (order.tower or "").strip() or None, order.flat.strip(), product["id"], order.jars_now,
                 int(order.has_jars), amount, deposit, order.slot, order.notes,
                 listing["id"] if listing else None, listing["partner_id"] if listing else None,
                 listing["name"] if listing else None),
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

ADMIN_COOKIE = "jd_admin"
ADMIN_SESSION_TTL = 12 * 3600
ADMIN_MAX_FAILS = 10
ADMIN_FAIL_WINDOW = 15 * 60


def _admin_secret() -> bytes:
    secret = os.environ.get("JALDROP_AUTH_SECRET") or os.environ.get("JALDROP_ADMIN_KEY") or ""
    return secret.encode()


def _admin_token(exp: int) -> str:
    return f"{exp}.{hmac.new(_admin_secret(), f'admin:{exp}'.encode(), hashlib.sha256).hexdigest()}"


def _valid_admin_token(token: Optional[str]) -> bool:
    try:
        exp, sig = (token or "").split(".")
        return int(exp) > time.time() and hmac.compare_digest(_admin_token(int(exp)).split(".")[1], sig)
    except ValueError:
        return False


def require_admin(key: Optional[str], session: Optional[str] = None) -> None:
    """Ops access: a valid admin session cookie (ID + password login), or the raw admin key in X-Admin-Key (scripts)."""
    if session and _admin_secret() and _valid_admin_token(session):
        return
    expected = os.environ.get("JALDROP_ADMIN_KEY")
    if not expected and not _admin_secret():
        raise HTTPException(503, "Admin is disabled: set JALDROP_ADMIN_KEY on the server")
    if not expected or not key or not secrets.compare_digest(key, expected):
        raise HTTPException(401, "Please log in")


class AdminLoginIn(BaseModel):
    user: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=200)


@router.post("/admin/login")
def admin_login(body: AdminLoginIn, request: Request, response: Response):
    """Admin ID + password. Set JALDROP_ADMIN_USER / JALDROP_ADMIN_PASSWORD (falls back to user 'admin' and the admin key)."""
    user = os.environ.get("JALDROP_ADMIN_USER", "admin")
    password = os.environ.get("JALDROP_ADMIN_PASSWORD") or os.environ.get("JALDROP_ADMIN_KEY")
    if not password:
        raise HTTPException(503, "Admin is disabled: set JALDROP_ADMIN_PASSWORD on the server")
    now = int(time.time())
    with connect() as conn:
        recent = conn.execute("SELECT COUNT(*) AS n FROM admin_login_fails WHERE at > ?", (now - ADMIN_FAIL_WINDOW,)).fetchone()["n"]
        if recent >= ADMIN_MAX_FAILS:
            raise HTTPException(429, "Too many wrong attempts. Try again in 15 minutes.")
        ok = secrets.compare_digest(body.user.encode(), user.encode()) & secrets.compare_digest(body.password.encode(), password.encode())
        if not ok:
            conn.execute("INSERT INTO admin_login_fails (at) VALUES (?)", (now,))
            conn.execute("DELETE FROM admin_login_fails WHERE at < ?", (now - ADMIN_FAIL_WINDOW,))
            conn.raw.commit()
            raise HTTPException(401, "Wrong ID or password.")
        conn.execute("DELETE FROM admin_login_fails")
    secure = request.headers.get("x-forwarded-proto", request.url.scheme) == "https"
    response.set_cookie(ADMIN_COOKIE, _admin_token(now + ADMIN_SESSION_TTL), max_age=ADMIN_SESSION_TTL, httponly=True,
                        samesite="lax", secure=secure, path="/")
    return {"ok": True}


@router.post("/admin/logout")
def admin_logout(response: Response):
    response.delete_cookie(ADMIN_COOKIE, path="/")
    return {"ok": True}


def _admin_row(row) -> dict:
    d = _public(row)
    d.update({"id": row["id"], "phone": row["phone"], "pincode": row["pincode"], "notes": row["notes"],
              "has_jars": bool(row["has_jars"]), "slot_id": row["slot"],
              "partner_name": row["partner_name"] if "partner_name" in row.keys() else None,
              "next_statuses": sorted(TRANSITIONS[row["status"]])})
    return d


@router.get("/admin/orders")
def admin_list(status: Optional[str] = None, x_admin_key: Optional[str] = Header(default=None), jd_admin: Optional[str] = Cookie(default=None)):
    require_admin(x_admin_key, jd_admin)
    sql, args = "SELECT o.*, p.business_name AS partner_name FROM orders o LEFT JOIN partners p ON p.id = o.partner_id", []
    if status:
        sql += " WHERE o.status = ?"
        args.append(status)
    sql += " ORDER BY o.id DESC LIMIT 200"
    with connect() as conn:
        rows = conn.execute(sql, args).fetchall()
    return {"orders": [_admin_row(r) for r in rows]}


@router.patch("/admin/orders/{order_id}")
def admin_set_status(order_id: int, body: StatusIn, x_admin_key: Optional[str] = Header(default=None), jd_admin: Optional[str] = Cookie(default=None)):
    require_admin(x_admin_key, jd_admin)
    with connect() as conn:
        row = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Order not found")
        if body.status not in TRANSITIONS[row["status"]]:
            raise HTTPException(409, f"Can't move from {row['status']} to {body.status}")
        conn.execute("UPDATE orders SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", (body.status, order_id))
        row = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    return _admin_row(row)

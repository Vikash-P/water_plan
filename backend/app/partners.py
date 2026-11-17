"""Partner portal: approved partners log in with phone OTP and list products with their own price.

Flow: ops creates the partner (from an application lead) -> partner logs in -> adds listings (status `pending`)
-> ops approves -> listing shows on the public site. Editing a listing's details or price sends it back for review.
"""
import hashlib
import hmac
import re
import secrets
import time
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator

from .auth import current_phone, start_session
from .catalog import DEPOSIT_PER_JAR as DEFAULT_DEPOSIT
from .db import connect
from .orders import SLOTS, require_admin
from .validators import PIN_RE, normalize_phone

router = APIRouter(prefix="/api")
MAX_LISTINGS = 30
MAX_FAILS = 5
LOCK_SECONDS = 15 * 60
PBKDF2_ROUNDS = 600_000


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    h = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ROUNDS)
    return f"pbkdf2${PBKDF2_ROUNDS}${salt.hex()}${h.hex()}"


def check_password(password: str, stored: Optional[str]) -> bool:
    if not stored:
        return False
    try:
        _, rounds, salt, h = stored.split("$")
        got = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(rounds))
        return hmac.compare_digest(got.hex(), h)
    except ValueError:
        return False


class PasswordIn(BaseModel):
    password: str = Field(min_length=8, max_length=100)


class LoginIn(BaseModel):
    phone: str
    password: str = Field(min_length=1, max_length=100)

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        return normalize_phone(v)


class SetupIn(PasswordIn):
    phone: str

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        return normalize_phone(v)


BAD = "Wrong phone number or password."


def _guard(conn, p, ok: bool) -> None:
    """Count failures and lock the account for 15 minutes after 5 wrong tries."""
    now = int(time.time())
    if ok:
        conn.execute("UPDATE partners SET failed_attempts=0, locked_until=0 WHERE id=?", (p["id"],))
        return
    fails = p["failed_attempts"] + 1
    conn.execute("UPDATE partners SET failed_attempts=?, locked_until=? WHERE id=?",
                 (0 if fails >= MAX_FAILS else fails, now + LOCK_SECONDS if fails >= MAX_FAILS else 0, p["id"]))
    conn.raw.commit()  # keep the count even though we raise next


@router.post("/partner/auth/setup")
def partner_setup(body: SetupIn, request: Request, response: Response):
    """First time only: the partner ID (phone WaterMart approved) + a new password. Works once per partner."""
    with connect() as conn:
        # Atomic: only succeeds while no password is set, so two people can't both claim the account.
        row = conn.execute(
            "UPDATE partners SET password_hash=? WHERE phone=? AND password_hash IS NULL AND status='active' RETURNING id",
            (hash_password(body.password), body.phone),
        ).fetchone()
    if not row:
        raise HTTPException(400, "This number can't create a password. It isn't an approved partner, or a password is already set. Ask WaterMart for help.")
    start_session(body.phone, request, response)
    return {"ok": True}


@router.post("/partner/auth/login")
def partner_login(body: LoginIn, request: Request, response: Response):
    now = int(time.time())
    with connect() as conn:
        p = conn.execute("SELECT * FROM partners WHERE phone = ?", (body.phone,)).fetchone()
        if not p:
            hash_password(body.password)  # same cost whether or not the phone exists
            raise HTTPException(401, BAD)
        if p["locked_until"] > now:
            raise HTTPException(429, "Too many wrong attempts. Try again in 15 minutes.")
        ok = check_password(body.password, p["password_hash"])
        _guard(conn, p, ok)
        if not ok:
            raise HTTPException(401, BAD if p["password_hash"] else "Create your password first (First time? Create your password).")
        if p["status"] != "active":
            raise HTTPException(403, "This partner account is suspended. Contact WaterMart.")
    start_session(body.phone, request, response)
    return {"ok": True}


def require_partner(jd_session: Optional[str] = Cookie(default=None)) -> dict:
    phone = current_phone(jd_session)
    if not phone:
        raise HTTPException(401, "Please log in")
    with connect() as conn:
        p = conn.execute("SELECT * FROM partners WHERE phone = ?", (phone,)).fetchone()
    if not p:
        raise HTTPException(403, "This number is not a WaterMart partner yet. Apply on the partner page.")
    if p["status"] != "active":
        raise HTTPException(403, "This partner account is suspended. Contact WaterMart.")
    return dict(p)


def _pins(v: str) -> str:
    out = []
    for part in re.split(r"[,\s]+", v.strip()):
        if not part:
            continue
        if not PIN_RE.match(part):
            raise ValueError(f"'{part}' is not a 6-digit pincode")
        if part not in out:
            out.append(part)
    return ",".join(out)


class ListingIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    size_litres: int = Field(default=20, ge=1, le=50)
    price: int = Field(ge=1, le=5000)
    pincodes: str = Field(default="", max_length=200)

    @field_validator("pincodes")
    @classmethod
    def _p(cls, v: str) -> str:
        return _pins(v)


def _listing(r, with_partner=False) -> dict:
    d = {"id": r["id"], "name": r["name"], "size_litres": r["size_litres"], "price": r["price"],
         "pincodes": [x for x in r["pincodes"].split(",") if x], "status": r["status"], "review_note": r["review_note"]}
    if with_partner:
        d["partner"] = r["business_name"]
        d["deposit_per_jar"] = DEFAULT_DEPOSIT if r["deposit_per_jar"] is None else r["deposit_per_jar"]
    return d


# ---- Partner (logged in) ----------------------------------------------------

@router.get("/partner/me")
def partner_me(p: dict = Depends(require_partner)):
    with connect() as conn:
        rows = conn.execute("SELECT * FROM listings WHERE partner_id = ? ORDER BY id DESC", (p["id"],)).fetchall()
    return {"business_name": p["business_name"], "contact_name": p["contact_name"], "phone": p["phone"],
            "listings": [_listing(r) for r in rows]}


@router.post("/partner/listings", status_code=201)
def add_listing(body: ListingIn, p: dict = Depends(require_partner)):
    with connect() as conn:
        n = conn.execute("SELECT COUNT(*) AS n FROM listings WHERE partner_id = ?", (p["id"],)).fetchone()["n"]
        if n >= MAX_LISTINGS:
            raise HTTPException(409, f"You can list up to {MAX_LISTINGS} products.")
        row = conn.execute(
            "INSERT INTO listings (partner_id, name, size_litres, price, pincodes) VALUES (?,?,?,?,?) RETURNING *",
            (p["id"], body.name.strip(), body.size_litres, body.price, body.pincodes),
        ).fetchone()
    return _listing(row)


@router.patch("/partner/listings/{listing_id}")
def edit_listing(listing_id: int, body: ListingIn, p: dict = Depends(require_partner)):
    with connect() as conn:
        row = conn.execute("SELECT * FROM listings WHERE id = ? AND partner_id = ?", (listing_id, p["id"])).fetchone()
        if not row:
            raise HTTPException(404, "Listing not found")
        # Any edit goes back to review so a partner can't swap the price of an approved product unseen.
        row = conn.execute(
            "UPDATE listings SET name=?, size_litres=?, price=?, pincodes=?, status='pending', review_note=NULL,"
            " updated_at=CURRENT_TIMESTAMP WHERE id=? RETURNING *",
            (body.name.strip(), body.size_litres, body.price, body.pincodes, listing_id),
        ).fetchone()
    return _listing(row)


@router.delete("/partner/listings/{listing_id}")
def delete_listing(listing_id: int, p: dict = Depends(require_partner)):
    with connect() as conn:
        cur = conn.execute("DELETE FROM listings WHERE id = ? AND partner_id = ? RETURNING id", (listing_id, p["id"]))
        if not cur.fetchone():
            raise HTTPException(404, "Listing not found")
    return {"ok": True}


# Partners handle the last mile; ops still confirm the order and collect payment.
PARTNER_MOVES = {"confirmed": "out_for_delivery", "out_for_delivery": "delivered"}


def _partner_order(r) -> dict:
    """What a delivery partner sees. The customer's phone number is deliberately left out."""
    return {"code": r["code"], "status": r["status"], "customer": r["name"].split()[0], "product": r["product_name"],
            "jars": r["jars_now"], "society": r["society"], "tower": r["tower"], "flat": r["flat"], "zone": r["zone"],
            "pincode": r["pincode"], "slot": SLOTS.get(r["slot"], r["slot"]), "notes": r["notes"],
            "next_status": PARTNER_MOVES.get(r["status"])}


@router.get("/partner/orders")
def partner_orders(p: dict = Depends(require_partner)):
    with connect() as conn:
        rows = conn.execute("SELECT * FROM orders WHERE partner_id = ? ORDER BY id DESC LIMIT 100", (p["id"],)).fetchall()
    return {"orders": [_partner_order(r) for r in rows]}


class PartnerStatusIn(BaseModel):
    status: str


@router.patch("/partner/orders/{code}")
def partner_move_order(code: str, body: PartnerStatusIn, p: dict = Depends(require_partner)):
    with connect() as conn:
        row = conn.execute("SELECT * FROM orders WHERE code = ? AND partner_id = ?", (code.upper(), p["id"])).fetchone()
        if not row:
            raise HTTPException(404, "Order not found")
        if PARTNER_MOVES.get(row["status"]) != body.status:
            raise HTTPException(409, "This order can't move to that status yet. Wait for WaterMart to confirm it.")
        conn.execute("UPDATE orders SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", (body.status, row["id"]))
        row = conn.execute("SELECT * FROM orders WHERE id = ?", (row["id"],)).fetchone()
    return _partner_order(row)


# ---- Public ------------------------------------------------------------------

@router.get("/listings")
def public_listings():
    with connect() as conn:
        rows = conn.execute(
            "SELECT l.*, p.business_name, p.deposit_per_jar FROM listings l JOIN partners p ON p.id = l.partner_id"
            " WHERE l.status = 'approved' AND p.status = 'active' ORDER BY l.price, l.id LIMIT 100"
        ).fetchall()
    return {"listings": [_listing(r, True) for r in rows]}


# ---- Ops (admin) ---------------------------------------------------------------

class PartnerIn(BaseModel):
    phone: str
    business_name: str = Field(min_length=2, max_length=150)
    contact_name: str = Field(min_length=2, max_length=100)
    deposit_per_jar: Optional[int] = Field(default=None, ge=0, le=5000)

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        return normalize_phone(v)


class ReviewIn(BaseModel):
    status: str = Field(pattern="^(approved|rejected|pending)$")
    review_note: Optional[str] = Field(default=None, max_length=300)


@router.get("/admin/partner-leads")
def admin_partner_leads(x_admin_key: Optional[str] = Header(default=None), jd_admin: Optional[str] = Cookie(default=None)):
    require_admin(x_admin_key, jd_admin)
    with connect() as conn:
        rows = conn.execute(
            "SELECT id, name, phone, business_name, pincode, deposit, notes FROM leads WHERE kind = 'partner' ORDER BY id DESC LIMIT 100"
        ).fetchall()
    return {"leads": [dict(r) for r in rows]}


@router.post("/admin/partners", status_code=201)
def admin_add_partner(body: PartnerIn, x_admin_key: Optional[str] = Header(default=None), jd_admin: Optional[str] = Cookie(default=None)):
    require_admin(x_admin_key, jd_admin)
    with connect() as conn:
        if conn.execute("SELECT 1 FROM partners WHERE phone = ?", (body.phone,)).fetchone():
            raise HTTPException(409, "A partner with this phone already exists")
        row = conn.execute(
            "INSERT INTO partners (phone, business_name, contact_name, deposit_per_jar) VALUES (?,?,?,?) RETURNING id",
            (body.phone, body.business_name.strip(), body.contact_name.strip(), body.deposit_per_jar),
        ).fetchone()
    # The partner ID is their phone number; they create their own password on first visit.
    return {"id": row["id"], "ok": True, "partner_id": body.phone}


@router.post("/admin/partners/{partner_id}/reset")
def admin_reset_partner(partner_id: int, x_admin_key: Optional[str] = Header(default=None), jd_admin: Optional[str] = Cookie(default=None)):
    """Forgotten password: clears it so the partner can create a new one, and logs them out."""
    require_admin(x_admin_key, jd_admin)
    with connect() as conn:
        p = conn.execute("SELECT * FROM partners WHERE id = ?", (partner_id,)).fetchone()
        if not p:
            raise HTTPException(404, "Partner not found")
        conn.execute("UPDATE partners SET password_hash=NULL WHERE id=?", (partner_id,))
        conn.execute("UPDATE partners SET failed_attempts=0, locked_until=0 WHERE id=?", (partner_id,))
        conn.execute("DELETE FROM sessions WHERE phone = ?", (p["phone"],))
    return {"ok": True, "partner_id": p["phone"]}


class DepositIn(BaseModel):
    deposit_per_jar: int = Field(ge=0, le=5000)


@router.patch("/admin/partners/{partner_id}")
def admin_set_deposit(partner_id: int, body: DepositIn, x_admin_key: Optional[str] = Header(default=None), jd_admin: Optional[str] = Cookie(default=None)):
    """Change the refundable deposit a partner charges per jar. Applies to new orders only."""
    require_admin(x_admin_key, jd_admin)
    with connect() as conn:
        row = conn.execute("UPDATE partners SET deposit_per_jar=? WHERE id=? RETURNING id", (body.deposit_per_jar, partner_id)).fetchone()
        if not row:
            raise HTTPException(404, "Partner not found")
    return {"ok": True, "deposit_per_jar": body.deposit_per_jar}


@router.get("/admin/partners")
def admin_partners(x_admin_key: Optional[str] = Header(default=None), jd_admin: Optional[str] = Cookie(default=None)):
    require_admin(x_admin_key, jd_admin)
    with connect() as conn:
        rows = conn.execute("SELECT * FROM partners ORDER BY id DESC").fetchall()
    return {"partners": [{"id": r["id"], "phone": r["phone"], "business_name": r["business_name"],
                          "contact_name": r["contact_name"], "status": r["status"],
                          "deposit_per_jar": DEFAULT_DEPOSIT if r["deposit_per_jar"] is None else r["deposit_per_jar"],
                          "password_set": bool(r["password_hash"])} for r in rows]}


@router.get("/admin/listings")
def admin_listings(status: Optional[str] = None, x_admin_key: Optional[str] = Header(default=None), jd_admin: Optional[str] = Cookie(default=None)):
    require_admin(x_admin_key, jd_admin)
    sql, args = "SELECT l.*, p.business_name, p.deposit_per_jar FROM listings l JOIN partners p ON p.id = l.partner_id", []
    if status:
        sql += " WHERE l.status = ?"
        args.append(status)
    with connect() as conn:
        rows = conn.execute(sql + " ORDER BY l.id DESC LIMIT 200", args).fetchall()
    return {"listings": [_listing(r, True) for r in rows]}


@router.patch("/admin/listings/{listing_id}")
def admin_review(listing_id: int, body: ReviewIn, x_admin_key: Optional[str] = Header(default=None), jd_admin: Optional[str] = Cookie(default=None)):
    require_admin(x_admin_key, jd_admin)
    with connect() as conn:
        row = conn.execute(
            "UPDATE listings SET status=?, review_note=?, updated_at=CURRENT_TIMESTAMP WHERE id=? RETURNING id",
            (body.status, (body.review_note or "").strip() or None, listing_id),
        ).fetchone()
        if not row:
            raise HTTPException(404, "Listing not found")
        full = conn.execute(
            "SELECT l.*, p.business_name, p.deposit_per_jar FROM listings l JOIN partners p ON p.id = l.partner_id WHERE l.id = ?", (listing_id,)
        ).fetchone()
    return _listing(full, True)

"""Partner portal: approved partners log in with phone OTP and list products with their own price.

Flow: ops creates the partner (from an application lead) -> partner logs in -> adds listings (status `pending`)
-> ops approves -> listing shows on the public site. Editing a listing's details or price sends it back for review.
"""
import re
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException
from pydantic import BaseModel, Field, field_validator

from .auth import current_phone
from .db import connect
from .orders import require_admin
from .validators import PIN_RE, normalize_phone

router = APIRouter(prefix="/api")
MAX_LISTINGS = 30


def require_partner(jd_session: Optional[str] = Cookie(default=None)) -> dict:
    phone = current_phone(jd_session)
    if not phone:
        raise HTTPException(401, "Please log in")
    with connect() as conn:
        p = conn.execute("SELECT * FROM partners WHERE phone = ?", (phone,)).fetchone()
    if not p:
        raise HTTPException(403, "This number is not a JalDrop partner yet. Apply on the partner page.")
    if p["status"] != "active":
        raise HTTPException(403, "This partner account is suspended. Contact JalDrop.")
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
    brand: Optional[str] = Field(default=None, max_length=80)
    size_litres: int = Field(default=20, ge=1, le=50)
    price: int = Field(ge=1, le=5000)
    pincodes: str = Field(default="", max_length=200)

    @field_validator("pincodes")
    @classmethod
    def _p(cls, v: str) -> str:
        return _pins(v)


def _listing(r, with_partner=False) -> dict:
    d = {"id": r["id"], "name": r["name"], "brand": r["brand"], "size_litres": r["size_litres"], "price": r["price"],
         "pincodes": [x for x in r["pincodes"].split(",") if x], "status": r["status"], "review_note": r["review_note"]}
    if with_partner:
        d["partner"] = r["business_name"]
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
            "INSERT INTO listings (partner_id, name, brand, size_litres, price, pincodes) VALUES (?,?,?,?,?,?) RETURNING *",
            (p["id"], body.name.strip(), (body.brand or "").strip() or None, body.size_litres, body.price, body.pincodes),
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
            "UPDATE listings SET name=?, brand=?, size_litres=?, price=?, pincodes=?, status='pending', review_note=NULL,"
            " updated_at=CURRENT_TIMESTAMP WHERE id=? RETURNING *",
            (body.name.strip(), (body.brand or "").strip() or None, body.size_litres, body.price, body.pincodes, listing_id),
        ).fetchone()
    return _listing(row)


@router.delete("/partner/listings/{listing_id}")
def delete_listing(listing_id: int, p: dict = Depends(require_partner)):
    with connect() as conn:
        cur = conn.execute("DELETE FROM listings WHERE id = ? AND partner_id = ? RETURNING id", (listing_id, p["id"]))
        if not cur.fetchone():
            raise HTTPException(404, "Listing not found")
    return {"ok": True}


# ---- Public ------------------------------------------------------------------

@router.get("/listings")
def public_listings():
    with connect() as conn:
        rows = conn.execute(
            "SELECT l.*, p.business_name FROM listings l JOIN partners p ON p.id = l.partner_id"
            " WHERE l.status = 'approved' AND p.status = 'active' ORDER BY l.price, l.id LIMIT 100"
        ).fetchall()
    return {"listings": [_listing(r, True) for r in rows]}


# ---- Ops (admin) ---------------------------------------------------------------

class PartnerIn(BaseModel):
    phone: str
    business_name: str = Field(min_length=2, max_length=150)
    contact_name: str = Field(min_length=2, max_length=100)

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        return normalize_phone(v)


class ReviewIn(BaseModel):
    status: str = Field(pattern="^(approved|rejected|pending)$")
    review_note: Optional[str] = Field(default=None, max_length=300)


@router.get("/admin/partner-leads")
def admin_partner_leads(x_admin_key: Optional[str] = Header(default=None)):
    require_admin(x_admin_key)
    with connect() as conn:
        rows = conn.execute(
            "SELECT id, name, phone, business_name, pincode, notes FROM leads WHERE kind = 'partner' ORDER BY id DESC LIMIT 100"
        ).fetchall()
    return {"leads": [dict(r) for r in rows]}


@router.post("/admin/partners", status_code=201)
def admin_add_partner(body: PartnerIn, x_admin_key: Optional[str] = Header(default=None)):
    require_admin(x_admin_key)
    with connect() as conn:
        if conn.execute("SELECT 1 FROM partners WHERE phone = ?", (body.phone,)).fetchone():
            raise HTTPException(409, "A partner with this phone already exists")
        row = conn.execute(
            "INSERT INTO partners (phone, business_name, contact_name) VALUES (?,?,?) RETURNING id",
            (body.phone, body.business_name.strip(), body.contact_name.strip()),
        ).fetchone()
    return {"id": row["id"], "ok": True}


@router.get("/admin/partners")
def admin_partners(x_admin_key: Optional[str] = Header(default=None)):
    require_admin(x_admin_key)
    with connect() as conn:
        rows = conn.execute("SELECT * FROM partners ORDER BY id DESC").fetchall()
    return {"partners": [{"id": r["id"], "phone": r["phone"], "business_name": r["business_name"],
                          "contact_name": r["contact_name"], "status": r["status"]} for r in rows]}


@router.get("/admin/listings")
def admin_listings(status: Optional[str] = None, x_admin_key: Optional[str] = Header(default=None)):
    require_admin(x_admin_key)
    sql, args = "SELECT l.*, p.business_name FROM listings l JOIN partners p ON p.id = l.partner_id", []
    if status:
        sql += " WHERE l.status = ?"
        args.append(status)
    with connect() as conn:
        rows = conn.execute(sql + " ORDER BY l.id DESC LIMIT 200", args).fetchall()
    return {"listings": [_listing(r, True) for r in rows]}


@router.patch("/admin/listings/{listing_id}")
def admin_review(listing_id: int, body: ReviewIn, x_admin_key: Optional[str] = Header(default=None)):
    require_admin(x_admin_key)
    with connect() as conn:
        row = conn.execute(
            "UPDATE listings SET status=?, review_note=?, updated_at=CURRENT_TIMESTAMP WHERE id=? RETURNING id",
            (body.status, (body.review_note or "").strip() or None, listing_id),
        ).fetchone()
        if not row:
            raise HTTPException(404, "Listing not found")
        full = conn.execute(
            "SELECT l.*, p.business_name FROM listings l JOIN partners p ON p.id = l.partner_id WHERE l.id = ?", (listing_id,)
        ).fetchone()
    return _listing(full, True)

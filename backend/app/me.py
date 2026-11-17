"""Signed-in customer: home screen data and one-tap refill."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from .auth import require_customer
from .db import connect
from .orders import SLOTS, OrderIn, _public, place_order

router = APIRouter(prefix="/api")

ACTIVE = ("requested", "confirmed", "out_for_delivery")


class RefillIn(BaseModel):
    jars: int = Field(default=2, ge=1, le=5)
    slot: str = "asap"


@router.get("/me")
def me(phone: str = Depends(require_customer)):
    with connect() as conn:
        rows = conn.execute("SELECT * FROM orders WHERE phone = ? ORDER BY id DESC LIMIT 10", (phone,)).fetchall()
    orders = [_public(r) for r in rows]
    last = rows[0] if rows else None
    delivered = [r for r in rows if r["status"] == "delivered"]
    ref = delivered[0] if delivered else last
    return {
        "phone": phone,
        "name": last["name"] if last else None,
        "address": {"society": last["society"], "tower": last["tower"], "flat": last["flat"],
                    "pincode": last["pincode"], "zone": last["zone"]} if last else None,
        "usual": {"jars": ref["jars_now"], "slot": ref["slot"]} if ref else None,
        "active_order": next((o for o in orders if o["status"] in ACTIVE), None),
        "orders": orders,
    }


@router.get("/me/addresses")
def my_addresses(phone: str = Depends(require_customer)):
    """Distinct delivery addresses from this customer's past orders, newest first (for one-tap autofill)."""
    with connect() as conn:
        rows = conn.execute("SELECT * FROM orders WHERE phone = ? ORDER BY id DESC LIMIT 30", (phone,)).fetchall()
    seen, out = set(), []
    for r in rows:
        key = (r["pincode"], r["society"].lower(), (r["tower"] or "").lower(), r["flat"].lower())
        if key in seen:
            continue
        seen.add(key)
        out.append({"society": r["society"], "tower": r["tower"], "flat": r["flat"], "pincode": r["pincode"]})
        if len(out) == 5:
            break
    return {"phone": phone, "name": rows[0]["name"] if rows else None, "addresses": out}


@router.post("/me/refill", status_code=201)
def refill(body: RefillIn, phone: str = Depends(require_customer)):
    """Repeat the last address as a single-jar order. Jar deposit is skipped: they already hold jars."""
    if body.slot not in SLOTS:
        raise HTTPException(422, "Unknown delivery slot")
    with connect() as conn:
        last = conn.execute("SELECT * FROM orders WHERE phone = ? ORDER BY id DESC LIMIT 1", (phone,)).fetchone()
        active = conn.execute(
            "SELECT code FROM orders WHERE phone = ? AND status IN ('requested','confirmed','out_for_delivery') LIMIT 1",
            (phone,),
        ).fetchone()
    if not last:
        raise HTTPException(409, "Place your first order to set up your address.")
    if active:
        raise HTTPException(409, "You already have an order on the way.")
    had_delivered = _has_delivered(phone)
    order = OrderIn(name=last["name"], phone=phone, pincode=last["pincode"], society=last["society"],
                    tower=last["tower"], flat=last["flat"], product_id="single", jars_now=body.jars,
                    has_jars=had_delivered, slot=body.slot)
    return place_order(order)


def _has_delivered(phone: str) -> bool:
    with connect() as conn:
        return bool(conn.execute("SELECT 1 FROM orders WHERE phone = ? AND status = 'delivered' LIMIT 1", (phone,)).fetchone())

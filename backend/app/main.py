from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field, field_validator

from . import catalog
from .db import connect, init_db
from .auth import router as auth_router
from .me import router as me_router
from .partners import router as partners_router
from .orders import router as orders_router
from .validators import PIN_RE, normalize_phone


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="JalDrop API", version="0.1.0", lifespan=lifespan)
app.include_router(orders_router)
app.include_router(auth_router)
app.include_router(me_router)
app.include_router(partners_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)


class LeadIn(BaseModel):
    kind: str = Field(pattern="^(waitlist|b2b|partner)$")
    name: str = Field(min_length=2, max_length=100)
    phone: str
    email: Optional[EmailStr] = None
    pincode: Optional[str] = None
    business_name: Optional[str] = Field(default=None, max_length=150)
    jars_per_month: Optional[int] = Field(default=None, ge=1, le=100000)
    notes: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("phone")
    @classmethod
    def valid_phone(cls, v: str) -> str:
        return normalize_phone(v)

    @field_validator("pincode")
    @classmethod
    def valid_pin(cls, v: Optional[str]) -> Optional[str]:
        if v in (None, ""):
            return None
        if not PIN_RE.match(v):
            raise ValueError("Pincode must be 6 digits")
        return v


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/catalog")
def get_catalog():
    return {"deposit_per_jar": catalog.DEPOSIT_PER_JAR, "products": catalog.PRODUCTS, "zones": catalog.ZONES}


@app.get("/api/serviceability/{pincode}")
def serviceability(pincode: str):
    if not PIN_RE.match(pincode):
        return {"pincode": pincode, "valid": False, "status": "invalid", "zone": None}
    for zone in catalog.ZONES:
        if pincode in zone["pincodes"]:
            return {"pincode": pincode, "valid": True, "status": zone["status"], "zone": zone["name"]}
    return {"pincode": pincode, "valid": True, "status": "unserved", "zone": None}


@app.post("/api/leads", status_code=201)
def create_lead(lead: LeadIn):
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO leads (kind, name, phone, email, pincode, business_name, jars_per_month, notes)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
            (lead.kind, lead.name.strip(), lead.phone, lead.email, lead.pincode,
             lead.business_name, lead.jars_per_month, lead.notes),
        )
        lead_id = cur.fetchone()["id"]
    return {"id": lead_id, "ok": True}

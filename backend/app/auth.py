"""Phone-OTP login for returning customers.

Identity is the verified phone number. A 6-digit code is sent by SMS/WhatsApp (see `send_otp`), exchanged for a
session cookie (HttpOnly, 30 days). Codes and session tokens are stored hashed. Orders stay open to guests.
"""
import hashlib
import hmac
import json
import os
import secrets
import time
import urllib.request
from typing import Optional

from fastapi import APIRouter, Cookie, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator

from .db import IS_PG, connect
from .validators import normalize_phone

router = APIRouter(prefix="/api")

COOKIE = "jd_session"
OTP_TTL = 5 * 60
OTP_MAX_ATTEMPTS = 5
OTP_MAX_SENDS_PER_HOUR = 5
OTP_RESEND_GAP = 30
SESSION_TTL = 30 * 24 * 3600


def _secret() -> bytes:
    s = os.environ.get("JALDROP_AUTH_SECRET") or (None if IS_PG else "dev-only-secret")
    if not s:
        raise HTTPException(503, "Login is not configured: set JALDROP_AUTH_SECRET on the server")
    return s.encode()


def _hash(kind: str, value: str) -> str:
    return hmac.new(_secret(), f"{kind}:{value}".encode(), hashlib.sha256).hexdigest()


def send_otp(phone: str, code: str) -> Optional[str]:
    """Deliver the code. Returns it only in local dev (JALDROP_DEV_OTP=1) so the UI can show it.

    Production: set OTP_WEBHOOK_URL to an endpoint that sends the SMS/WhatsApp (receives {"phone", "code"} as JSON,
    optionally with `Authorization: Bearer $OTP_WEBHOOK_TOKEN`). Plug MSG91, Twilio or Gupshup in behind it.
    """
    url = os.environ.get("OTP_WEBHOOK_URL")
    if url:
        if not url.startswith("https://"):
            raise HTTPException(503, "OTP_WEBHOOK_URL must be https")
        headers = {"Content-Type": "application/json"}
        if os.environ.get("OTP_WEBHOOK_TOKEN"):
            headers["Authorization"] = "Bearer " + os.environ["OTP_WEBHOOK_TOKEN"]
        req = urllib.request.Request(url, json.dumps({"phone": phone, "code": code}).encode(), headers)
        try:
            urllib.request.urlopen(req, timeout=8).read()
        except Exception:
            raise HTTPException(502, "Could not send the code. Please try again.")
        return None
    if os.environ.get("JALDROP_DEV_OTP") == "1" and not IS_PG:
        print(f"[dev] OTP for {phone}: {code}")
        return code
    raise HTTPException(503, "Login is not available yet: code delivery is not configured")


class PhoneBody(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        return normalize_phone(v)


class VerifyBody(PhoneBody):
    code: str = Field(pattern=r"^\d{6}$")


@router.post("/auth/otp/request")
def request_otp(body: PhoneBody):
    _secret()
    now = int(time.time())
    with connect() as conn:
        recent = conn.execute(
            "SELECT created_at FROM otp_codes WHERE phone = ? AND created_at > ? ORDER BY created_at DESC",
            (body.phone, now - 3600),
        ).fetchall()
        if len(recent) >= OTP_MAX_SENDS_PER_HOUR:
            raise HTTPException(429, "Too many codes requested. Try again in an hour.")
        if recent and now - recent[0]["created_at"] < OTP_RESEND_GAP:
            raise HTTPException(429, "Please wait a few seconds before asking for another code.")
        code = f"{secrets.randbelow(10**6):06d}"
        conn.execute(
            "INSERT INTO otp_codes (phone, code_hash, expires_at, created_at) VALUES (?,?,?,?)",
            (body.phone, _hash("otp:" + body.phone, code), now + OTP_TTL, now),
        )
    # Sent after the row is committed; if delivery fails the customer just asks again.
    dev_code = send_otp(body.phone, code)
    out = {"sent": True, "expires_in": OTP_TTL, "resend_in": OTP_RESEND_GAP}
    if dev_code:
        out["dev_code"] = dev_code
    return out


@router.post("/auth/otp/verify")
def verify_otp(body: VerifyBody, request: Request, response: Response):
    now = int(time.time())
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM otp_codes WHERE phone = ? AND used = 0 AND expires_at > ? ORDER BY id DESC LIMIT 1",
            (body.phone, now),
        ).fetchone()
        if not row or row["attempts"] >= OTP_MAX_ATTEMPTS:
            raise HTTPException(400, "That code has expired. Ask for a new one.")
        ok = hmac.compare_digest(row["code_hash"], _hash("otp:" + body.phone, body.code))
        conn.execute(
            "UPDATE otp_codes SET attempts = attempts + 1, used = ? WHERE id = ?", (1 if ok else 0, row["id"])
        )
        if not ok:
            conn.raw.commit()  # keep the attempt count even though we raise
            raise HTTPException(400, "Wrong code. Check the message and try again.")
        token = secrets.token_urlsafe(32)
        conn.execute(
            "INSERT INTO sessions (token_hash, phone, expires_at, created_at) VALUES (?,?,?,?)",
            (_hash("session", token), body.phone, now + SESSION_TTL, now),
        )
        conn.execute("DELETE FROM sessions WHERE expires_at < ?", (now,))
    secure = request.headers.get("x-forwarded-proto", request.url.scheme) == "https"
    response.set_cookie(COOKIE, token, max_age=SESSION_TTL, httponly=True, samesite="lax", secure=secure, path="/")
    return {"ok": True}


def start_session(phone: str, request: Request, response: Response) -> None:
    """Create a login session for an already-verified phone and set the cookie."""
    now = int(time.time())
    token = secrets.token_urlsafe(32)
    with connect() as conn:
        conn.execute(
            "INSERT INTO sessions (token_hash, phone, expires_at, created_at) VALUES (?,?,?,?)",
            (_hash("session", token), phone, now + SESSION_TTL, now),
        )
        conn.execute("DELETE FROM sessions WHERE expires_at < ?", (now,))
    secure = request.headers.get("x-forwarded-proto", request.url.scheme) == "https"
    response.set_cookie(COOKIE, token, max_age=SESSION_TTL, httponly=True, samesite="lax", secure=secure, path="/")


def current_phone(token: Optional[str]) -> Optional[str]:
    if not token:
        return None
    with connect() as conn:
        row = conn.execute(
            "SELECT phone FROM sessions WHERE token_hash = ? AND expires_at > ?", (_hash("session", token), int(time.time()))
        ).fetchone()
    return row["phone"] if row else None


def require_customer(jd_session: Optional[str] = Cookie(default=None)) -> str:
    phone = current_phone(jd_session)
    if not phone:
        raise HTTPException(401, "Please log in")
    return phone


@router.post("/auth/logout")
def logout(response: Response, jd_session: Optional[str] = Cookie(default=None)):
    if jd_session:
        with connect() as conn:
            conn.execute("DELETE FROM sessions WHERE token_hash = ?", (_hash("session", jd_session),))
    response.delete_cookie(COOKIE, path="/")
    return {"ok": True}

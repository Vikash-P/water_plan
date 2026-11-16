import re

PHONE_RE = re.compile(r"^[6-9]\d{9}$")
PIN_RE = re.compile(r"^\d{6}$")


def normalize_phone(v: str) -> str:
    v = re.sub(r"[\s-]", "", v)
    v = re.sub(r"^(\+91|91|0)(?=\d{10}$)", "", v)
    if not PHONE_RE.match(v):
        raise ValueError("Enter a valid 10-digit Indian mobile number")
    return v

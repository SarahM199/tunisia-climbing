"""
Password hashing and login tokens.

Two separate ideas live here:

1. PASSWORDS ARE HASHED, never stored as-is. bcrypt is one-way — you can
   ask "does this password match the stored hash?" but you can never turn
   the hash back into the password. So even if the database leaked, the
   passwords themselves would not.

2. AFTER LOGIN we hand the browser a JWT: a signed string that says
   "this is user X, valid until <date>". It's signed with SECRET_KEY,
   so the browser can read it but cannot forge or edit one.
"""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from jwt import PyJWTError

from app.core.config import settings

ALGORITHM = "HS256"

# bcrypt only looks at the first 72 bytes of a password and errors on longer
# input. We truncate deliberately so long passwords are accepted instead of
# crashing. The schema also caps length, so this is a belt-and-braces guard.
BCRYPT_MAX_BYTES = 72

def _to_bcrypt_bytes(plain_password: str) -> bytes:
    return plain_password.encode("utf-8")[:BCRYPT_MAX_BYTES]

def hash_password(plain_password: str) -> str:
    """Turn a real password into a bcrypt hash for storage."""
    hashed = bcrypt.hashpw(_to_bcrypt_bytes(plain_password), bcrypt.gensalt())
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check a login attempt against the stored hash."""
    try:
        return bcrypt.checkpw(
            _to_bcrypt_bytes(plain_password), hashed_password.encode("utf-8")
        )
    except ValueError:
        # Stored hash is malformed (e.g. hand-edited row) — treat as no match
        return False

def create_access_token(subject: str) -> str:
    """
    Build a signed token identifying the user.

    'sub' (subject) holds the user's email.
    'exp' is the expiry — the token stops working after this.
    """
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {"sub": subject, "exp": expires_at}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)

def decode_access_token(token: str) -> str | None:
    """
    Verify a token and return the email inside it.

    Returns None if the token is invalid, tampered with, or expired —
    the caller treats that as "not logged in".
    """
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        return payload.get("sub")
    except PyJWTError:
        return None

"""
Contact form endpoint.

Public, so it needs protecting from abuse. Layers, in order:

1. HONEYPOT — a hidden field bots fill and humans don't.
2. DAILY LIMIT — counted from the database, so it survives restarts and
   works across multiple worker processes.
3. VALIDATION — Pydantic enforces length and a fixed purpose list.

The daily limit is deliberately looser for logged-in users. An account is
accountable — you can see who sent what and ban them — whereas an anonymous
sender is only ever a hashed IP. That also nudges genuine contributors
towards registering.
"""

import hashlib
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user_optional, get_db
from app.models.crag import ContactMessage, User
from app.schemas.contact import ContactCreate, ContactResult

router = APIRouter(tags=["contact"])

# Messages allowed per 24 hours. Tune these freely.
ANON_MAX_PER_DAY = 1
USER_MAX_PER_DAY = 5
WINDOW = timedelta(hours=24)

def _client_ip(request: Request) -> str:
    """
    Behind a proxy the real IP is in X-Forwarded-For; locally it's the direct
    client. The first entry is the original client.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def _hash_ip(ip: str) -> str:
    """
    Salted with SECRET_KEY, so the stored value can't be reversed by simply
    hashing every possible IP address.
    """
    return hashlib.sha256(f"{ip}{settings.secret_key}".encode()).hexdigest()[:32]

def _sent_in_last_day(
    db: Session, *, user_id: int | None = None, ip_hash: str | None = None
) -> int:
    """
    How many messages this sender has submitted in the past 24 hours.

    For anonymous senders we also require user_id IS NULL, so a logged-in
    climber's messages don't eat the anonymous allowance for everyone else
    sharing that network.
    """
    since = datetime.now(timezone.utc) - WINDOW
    query = db.query(func.count(ContactMessage.id)).filter(
        ContactMessage.created_at >= since
    )

    if user_id is not None:
        query = query.filter(ContactMessage.user_id == user_id)
    else:
        query = query.filter(
            ContactMessage.ip_hash == ip_hash,
            ContactMessage.user_id.is_(None),
        )

    return query.scalar() or 0

@router.post(
    "/contact", response_model=ContactResult, status_code=status.HTTP_201_CREATED
)
def submit_contact(
    payload: ContactCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    # Honeypot triggered — almost certainly a bot. Return success anyway so it
    # doesn't learn what caught it, but store nothing.
    if payload.website:
        return ContactResult(ok=True, message="Thanks — your message has been sent.")

    ip_hash = _hash_ip(_client_ip(request))

    if current_user:
        used = _sent_in_last_day(db, user_id=current_user.id)
        limit = USER_MAX_PER_DAY
        over_limit_detail = (
            f"You've sent {limit} messages in the past 24 hours. "
            "Please wait before sending another."
        )
    else:
        used = _sent_in_last_day(db, ip_hash=ip_hash)
        limit = ANON_MAX_PER_DAY
        over_limit_detail = (
            "You've already sent a message today. "
            "Log in or create an account if you need to send more."
        )

    if used >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=over_limit_detail,
        )

    message = ContactMessage(
        purpose=payload.purpose.value,
        # Prefer the account's details over anything typed into the form
        name=(current_user.display_name if current_user else payload.name),
        email=(current_user.email if current_user else payload.email),
        body=payload.body,
        sector_id=payload.sector_id,
        sector_name=payload.sector_name,
        user_id=current_user.id if current_user else None,
        ip_hash=ip_hash,
    )
    db.add(message)
    db.commit()

    return ContactResult(
        ok=True,
        message="Thanks — your message has been sent. We read everything, "
        "even if we can't always reply.",
    )

from enum import Enum

from pydantic import BaseModel, EmailStr, Field

class ContactPurpose(str, Enum):
    """
    A fixed set means messages arrive pre-sorted, and FastAPI rejects
    anything else before it reaches our code.
    """

    correction = "correction"
    new_sector = "new_sector"
    shade_timing = "shade_timing"
    other = "other"

class ContactCreate(BaseModel):
    purpose: ContactPurpose
    # min_length keeps out "hi" and empty submissions
    body: str = Field(min_length=10, max_length=4000)
    name: str | None = Field(default=None, max_length=80)
    email: EmailStr | None = None

    sector_id: int | None = None
    sector_name: str | None = Field(default=None, max_length=200)

    # HONEYPOT — hidden in the UI, so a real person never fills it in.
    # See api/contact.py for what happens when it arrives populated.
    website: str | None = None

class ContactResult(BaseModel):
    ok: bool
    message: str

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()


class Crag(Base):
    __tablename__ = "crags"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    country = Column(String, default="Tunisia")
    region = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    rock_type = Column(String)
    altitude_m = Column(Integer)
    description = Column(Text)
    topo_version = Column(String)

    sectors = relationship("Sector", back_populates="crag", cascade="all, delete-orphan")


class Sector(Base):
    __tablename__ = "sectors"

    id = Column(Integer, primary_key=True)
    crag_id = Column(Integer, ForeignKey("crags.id"), nullable=False)
    name = Column(String, nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)
    orientation = Column(String)
    num_routes = Column(Integer)
    grade_min = Column(String)
    grade_max = Column(String)
    approach_time_min = Column(Integer)
    approach_difficulty = Column(String)
    description = Column(Text)
    climbing_type = Column(String)
    shade_by_hour = Column(Float)      # e.g. 11.0 = "in shade by 11:00", 13.5 = "by 13:30"
    sun_until_hour = Column(Float)     # e.g. 14 = "sun exposed until ~2pm"

    crag = relationship("Crag", back_populates="sectors")
    routes = relationship("Route", back_populates="sector", cascade="all, delete-orphan")
    comments = relationship(
        "SectorComment", back_populates="sector", cascade="all, delete-orphan"
    )
    ratings = relationship(
        "SectorRating", back_populates="sector", cascade="all, delete-orphan"
    )



class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True)
    sector_id = Column(Integer, ForeignKey("sectors.id"), nullable=False)
    route_number = Column(Integer)
    name = Column(String, nullable=False)
    grade = Column(String)
    quickdraws = Column(Integer)
    rope_length_m = Column(Integer)
    climbing_type = Column(String)
    description = Column(Text)

    sector = relationship("Sector", back_populates="routes")

class User(Base):
    """
    A registered climber.

    We never store the real password — only a bcrypt hash of it.
    See app/core/security.py for how that works.
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    display_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    comments = relationship(
        "SectorComment", back_populates="user", cascade="all, delete-orphan"
    )
    ratings = relationship(
        "SectorRating", back_populates="user", cascade="all, delete-orphan"
    )



class SectorComment(Base):
    """
    A comment left by a user on a sector. Users can leave as many as they
    like — no unique constraint here. Ratings live in SectorRating instead,
    so one chatty person can't skew a sector's average.
    """

    __tablename__ = "sector_comments"

    id = Column(Integer, primary_key=True)
    sector_id = Column(Integer, ForeignKey("sectors.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    # Stays NULL until the comment is edited — lets the UI show "(edited)"
    updated_at = Column(DateTime(timezone=True))

    sector = relationship("Sector", back_populates="comments")
    user = relationship("User", back_populates="comments")
    photos = relationship(
        "CommentPhoto",
        back_populates="comment",
        cascade="all, delete-orphan",
        order_by="CommentPhoto.id",
    )

class SectorRating(Base):
    """
    One rating per user per sector, enforced by the database.

    Separating this from comments is what keeps the average meaningful:
    each climber gets exactly one vote no matter how much they post.
    """

    __tablename__ = "sector_ratings"
    __table_args__ = (
        UniqueConstraint("sector_id", "user_id", name="uq_rating_per_user_sector"),
    )

    id = Column(Integer, primary_key=True)
    sector_id = Column(Integer, ForeignKey("sectors.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(DateTime(timezone=True))

    sector = relationship("Sector", back_populates="ratings")
    user = relationship("User", back_populates="ratings")

class CommentPhoto(Base):
    """
    A photo attached to a comment. The image itself lives in Supabase
    Storage; this row just records where.

    NOTE: cascade delete-orphan removes these ROWS when a comment is
    deleted, but it cannot delete the FILES in Supabase. The API does
    that explicitly — see delete_comment in api/comments.py.
    """

    __tablename__ = "comment_photos"

    id = Column(Integer, primary_key=True)
    comment_id = Column(Integer, ForeignKey("sector_comments.id"), nullable=False)
    # We store the path inside the bucket, not the full URL, so public URLs
    # can be rebuilt if the Supabase project domain ever changes.
    storage_path = Column(String, nullable=False)
    width = Column(Integer)
    height = Column(Integer)
    byte_size = Column(Integer)
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    comment = relationship("SectorComment", back_populates="photos")

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, EmailStr, Field

class ContactPurpose(str, Enum):
    """
    Restricting this to a fixed set means submissions arrive pre-sorted,
    and FastAPI rejects anything else before it reaches our code.
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

    # HONEYPOT. Hidden in the UI, so a real person never fills it in.
    # Bots fill every field they find. See api/contact.py for what we do
    # when this arrives populated.
    website: str | None = None

class ContactResult(BaseModel):
    ok: bool
    message: str
class ContactMessage(Base):
    """
    A message sent through the contact form — corrections, new sectors,
    shade observations, anything else.

    Note sector_id is a plain integer, NOT a foreign key. Crag and sector
    data gets reimported from CSV and the IDs shift, so a real FK would
    either block the reimport or orphan old reports. We snapshot the name
    alongside it instead.
    """

    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True)
    purpose = Column(String, nullable=False)
    name = Column(String)
    email = Column(String)
    body = Column(Text, nullable=False)

    sector_id = Column(Integer)
    sector_name = Column(String)

    # Set when the sender happened to be logged in
    user_id = Column(Integer, ForeignKey("users.id"))

    # Hashed, never raw. Enough to spot repeat abuse without storing an
    # identifier we have no real use for.
    ip_hash = Column(String)

    # Flip this in Supabase once you've dealt with a message
    handled = Column(Boolean, default=False, nullable=False)

    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user = relationship("User")

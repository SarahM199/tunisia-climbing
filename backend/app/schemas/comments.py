from datetime import datetime

from pydantic import BaseModel, Field

class PhotoOut(BaseModel):
    id: int
    url: str
    width: int | None
    height: int | None

class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)

class CommentUpdate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)

class RatingSet(BaseModel):
    # ge=1, le=5 → "between 1 and 5 inclusive"
    rating: int = Field(ge=1, le=5)

class RatingOut(BaseModel):
    sector_id: int
    rating: int

class CommentOut(BaseModel):
    id: int
    body: str
    created_at: datetime
    updated_at: datetime | None
    author: str
    user_id: int
    author_rating: int | None
    photos: list[PhotoOut] = []

class SectorCommentSummary(BaseModel):
    sector_id: int
    average_rating: float | None
    rating_count: int
    my_rating: int | None       # the current user's rating, null if logged out
    comments: list[CommentOut]

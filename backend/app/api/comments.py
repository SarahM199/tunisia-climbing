from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_current_user_optional, get_db
from app.core.images import MAX_UPLOAD_BYTES, ImageRejected, compress_to_webp
from app.core.storage import build_object_path, delete_object, public_url, upload_webp
from app.models.crag import CommentPhoto, Sector, SectorComment, SectorRating, User
from app.schemas.comments import (
    CommentCreate,
    CommentOut,
    CommentUpdate,
    PhotoOut,
    RatingOut,
    RatingSet,
    SectorCommentSummary,
)

router = APIRouter(tags=["comments"])

MAX_PHOTOS_PER_COMMENT = 3


def _require_sector(sector_id: int, db: Session) -> Sector:
    """Shared 404 check — every endpoint here needs it."""
    sector = db.query(Sector).filter(Sector.id == sector_id).first()
    if sector is None:
        raise HTTPException(status_code=404, detail="Sector not found")
    return sector

def _photo_out(photo: CommentPhoto) -> PhotoOut:
    return PhotoOut(
        id=photo.id,
        url=public_url(photo.storage_path),
        width=photo.width,
        height=photo.height,
    )

def _to_out(comment: SectorComment, rating_by_user: dict[int, int]) -> CommentOut:
    return CommentOut(
        id=comment.id,
        body=comment.body,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        author=comment.user.display_name,
        user_id=comment.user_id,
        author_rating=rating_by_user.get(comment.user_id),
        photos=[_photo_out(p) for p in comment.photos],
    )

@router.get("/sectors/{sector_id}/comments", response_model=SectorCommentSummary)
def list_comments(
    sector_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """
    Public — anyone can read. Logged-in users additionally get my_rating
    so the star widget can show their existing vote.
    """
    _require_sector(sector_id, db)

    # Fetch all ratings once, then reuse for the average AND for attaching
    # each author's rating to their comments. Avoids a query per comment.
    ratings = (
        db.query(SectorRating).filter(SectorRating.sector_id == sector_id).all()
    )
    rating_by_user = {r.user_id: r.rating for r in ratings}
    values = list(rating_by_user.values())
    average = round(sum(values) / len(values), 1) if values else None

    comments = (
        db.query(SectorComment)
        .filter(SectorComment.sector_id == sector_id)
        .order_by(SectorComment.created_at.desc())
        .all()
    )

    return SectorCommentSummary(
        sector_id=sector_id,
        average_rating=average,
        rating_count=len(values),
        my_rating=rating_by_user.get(current_user.id) if current_user else None,
        comments=[_to_out(c, rating_by_user) for c in comments],
    )

@router.post(
    "/sectors/{sector_id}/comments",
    response_model=CommentOut,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    sector_id: int,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Always creates a new comment — users can post as many as they want."""
    _require_sector(sector_id, db)

    comment = SectorComment(
        sector_id=sector_id,
        user_id=current_user.id,  # from the TOKEN, never from the request body
        body=payload.body,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    rating = (
        db.query(SectorRating)
        .filter(
            SectorRating.sector_id == sector_id,
            SectorRating.user_id == current_user.id,
        )
        .first()
    )
    return _to_out(comment, {current_user.id: rating.rating} if rating else {})

@router.patch("/comments/{comment_id}", response_model=CommentOut)
def update_comment(
    comment_id: int,
    payload: CommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Edit your own comment. Now that re-posting adds a new one, editing
    needs its own endpoint."""
    comment = db.query(SectorComment).filter(SectorComment.id == comment_id).first()
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="You can only edit your own comment"
        )

    comment.body = payload.body
    comment.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(comment)

    rating = (
        db.query(SectorRating)
        .filter(
            SectorRating.sector_id == comment.sector_id,
            SectorRating.user_id == current_user.id,
        )
        .first()
    )
    return _to_out(comment, {current_user.id: rating.rating} if rating else {})

@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = db.query(SectorComment).filter(SectorComment.id == comment_id).first()
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="You can only delete your own comment"
        )

    # Collect paths BEFORE deleting the rows, or we lose them
    paths = [p.storage_path for p in comment.photos]

    db.delete(comment)  # cascade removes the comment_photos rows
    db.commit()

    # Now remove the actual files. The database is already consistent, so
    # a storage hiccup here leaves an orphaned file, not a broken record.
    for path in paths:
        delete_object(path)

@router.put("/sectors/{sector_id}/ratings", response_model=RatingOut)
def set_rating(
    sector_id: int,
    payload: RatingSet,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Set or change your rating. PUT rather than POST because it's idempotent —
    calling it twice with the same value leaves you with one rating, not two.
    """
    _require_sector(sector_id, db)

    existing = (
        db.query(SectorRating)
        .filter(
            SectorRating.sector_id == sector_id,
            SectorRating.user_id == current_user.id,
        )
        .first()
    )

    if existing:
        existing.rating = payload.rating
        existing.updated_at = datetime.now(timezone.utc)
    else:
        db.add(
            SectorRating(
                sector_id=sector_id,
                user_id=current_user.id,
                rating=payload.rating,
            )
        )

    db.commit()
    return RatingOut(sector_id=sector_id, rating=payload.rating)

@router.delete(
    "/sectors/{sector_id}/ratings", status_code=status.HTTP_204_NO_CONTENT
)
def delete_rating(
    sector_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove your rating (clicking your current star again clears it)."""
    existing = (
        db.query(SectorRating)
        .filter(
            SectorRating.sector_id == sector_id,
            SectorRating.user_id == current_user.id,
        )
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()

@router.post(
    "/comments/{comment_id}/photos",
    response_model=PhotoOut,
    status_code=status.HTTP_201_CREATED,
)
def upload_comment_photo(
    comment_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Attach a photo to your own comment.

    The upload is validated, resized and converted to WebP before it ever
    reaches storage — see app/core/images.py.
    """
    comment = db.query(SectorComment).filter(SectorComment.id == comment_id).first()
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="You can only add photos to your own comment"
        )

    if len(comment.photos) >= MAX_PHOTOS_PER_COMMENT:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_PHOTOS_PER_COMMENT} photos per comment",
        )

    # Read one byte past the limit so we can detect oversize without
    # pulling an unbounded amount into memory
    raw = file.file.read(MAX_UPLOAD_BYTES + 1)

    try:
        webp, width, height = compress_to_webp(raw)
    except ImageRejected as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    path = build_object_path(comment.sector_id, comment.id)
    try:
        upload_webp(path, webp)
    except RuntimeError:
        # 502: our fault or Supabase's, not the user's
        raise HTTPException(
            status_code=502, detail="Couldn't store the image — please try again"
        )

    photo = CommentPhoto(
        comment_id=comment.id,
        storage_path=path,
        width=width,
        height=height,
        byte_size=len(webp),
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)

    return _photo_out(photo)

@router.delete("/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    photo = db.query(CommentPhoto).filter(CommentPhoto.id == photo_id).first()
    if photo is None:
        raise HTTPException(status_code=404, detail="Photo not found")

    # Ownership lives on the parent comment
    if photo.comment.user_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="You can only delete your own photos"
        )

    path = photo.storage_path
    db.delete(photo)
    db.commit()
    delete_object(path)

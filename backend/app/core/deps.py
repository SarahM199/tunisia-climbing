"""
Shared FastAPI dependencies.

get_db           — hands each request its own database session
get_current_user — reads the Authorization header, returns the logged-in User
                   (raises 401 if the token is missing or invalid)
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models.crag import User

# auto_error=False so we can write our own error message instead of
# FastAPI's default
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

def get_db():
    """
    Yields a database session, then always closes it — even if the
    endpoint raised an exception. This replaces the try/finally you
    currently write by hand in each endpoint.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Require a valid login. Put this on any endpoint that changes data.
    """
    not_authenticated = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token:
        raise not_authenticated

    email = decode_access_token(token)
    if email is None:
        raise not_authenticated

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        # Token was valid but the account was deleted since it was issued
        raise not_authenticated

    return user

def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """
    Like get_current_user, but returns None instead of raising a 401
    when there's no valid login.

    Use this on PUBLIC endpoints that show extra detail to logged-in users.
    The comments list needs it so it can tell you your own rating, while
    still working fine for anonymous visitors.
    """
    if not token:
        return None

    email = decode_access_token(token)
    if email is None:
        return None

    return db.query(User).filter(User.email == email).first()

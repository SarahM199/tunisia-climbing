from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.crag import User
from app.schemas.auth import TokenOut, UserLogin, UserOut, UserRegister

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    # Store emails lowercased so "Me@X.com" and "me@x.com" are one account
    email = payload.email.lower()

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=400, detail="An account with this email already exists"
        )

    user = User(
        email=email,
        display_name=payload.display_name.strip(),
        hashed_password=hash_password(payload.password),  # hashed, never plain
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Log them straight in after registering — no second step
    return TokenOut(
        access_token=create_access_token(user.email),
        user=UserOut.model_validate(user),
    )

@router.post("/login", response_model=TokenOut)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()

    # NOTE: identical error whether the email doesn't exist OR the password
    # is wrong. Different messages would let someone probe which emails
    # are registered on your site.
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    return TokenOut(
        access_token=create_access_token(user.email),
        user=UserOut.model_validate(user),
    )

@router.get("/me", response_model=UserOut)
def read_me(current_user: User = Depends(get_current_user)):
    """The frontend calls this on page load to ask 'am I still logged in?'"""
    return current_user

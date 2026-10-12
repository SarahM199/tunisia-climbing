"""
Pydantic schemas define the SHAPE of request and response data.

FastAPI validates incoming JSON against these automatically — a
6-character password is rejected before it ever reaches our code.
"""

from pydantic import BaseModel, EmailStr, Field

class UserRegister(BaseModel):
    email: EmailStr
    display_name: str = Field(min_length=2, max_length=50)
    password: str = Field(min_length=8, max_length=72)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    """What we send back about a user — note there is no password field, ever."""

    id: int
    email: EmailStr
    display_name: str

    model_config = {"from_attributes": True}

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

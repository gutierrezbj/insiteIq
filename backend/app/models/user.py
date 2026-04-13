from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str = Field(default="coordinator", pattern="^(admin|coordinator|supervisor|technician)$")


class UserCreate(UserBase):
    password: str = Field(min_length=6)


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = Field(default=None, pattern="^(admin|coordinator|supervisor|technician)$")
    is_active: Optional[bool] = None


class UserInDB(UserBase):
    id: str
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    data: UserInDB
    message: str = ""


class UserListResponse(BaseModel):
    data: list[UserInDB]
    total: int

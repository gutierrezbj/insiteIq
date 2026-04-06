from fastapi import APIRouter, Depends

from app.dependencies import get_current_user, require_role
from app.models.auth import LoginRequest, TokenResponse, RefreshRequest
from app.models.user import UserCreate, UserUpdate, UserResponse, UserListResponse, UserInDB
from app.services.auth_service import authenticate_user, create_user, update_user, list_users
from app.utils.security import decode_token, create_access_token, create_refresh_token

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    return await authenticate_user(body.email, body.password)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest):
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    return {
        "access_token": create_access_token(payload["sub"], ""),
        "refresh_token": create_refresh_token(payload["sub"]),
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserInDB)
async def me(user: dict = Depends(get_current_user)):
    return user


@router.post("/users", response_model=UserResponse)
async def create(body: UserCreate, user: dict = Depends(require_role("admin"))):
    created = await create_user(body.model_dump())
    return {"data": created, "message": "User created"}


@router.get("/users", response_model=UserListResponse)
async def get_users(user: dict = Depends(require_role("admin"))):
    users = await list_users()
    return {"data": users, "total": len(users)}


@router.patch("/users/{user_id}", response_model=UserResponse)
async def patch_user(user_id: str, body: UserUpdate, user: dict = Depends(require_role("admin"))):
    updated = await update_user(user_id, body.model_dump(exclude_unset=True))
    return {"data": updated, "message": "User updated"}

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.database import get_db
from app.crud import user as user_crud
# Only import necessary utils if local login/register is kept
from app.utils.auth import verify_password # Remove unused clerk claims import for now
from app.schemas.user import UserCreate, User
# Remove unused import as token.py doesn't exist and /token endpoint is commented out
# from app.schemas.token import Token 

router = APIRouter(prefix="/auth", tags=["auth"])

# Keep register endpoint if you still support local registration
@router.post("/register", response_model=User)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = user_crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    db_user = user_crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return user_crud.create_user(db=db, user=user)

# --- Commented out old JWT-based endpoints --- #

# @router.post("/token", response_model=Token)
# async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
#     # This endpoint needs rethinking if using Clerk for primary auth.
#     # It currently checks local DB passwords and creates a custom JWT.
#     user = user_crud.get_user_by_username(db, username=form_data.username) # Assuming you have this function
#     # Need user_crud.authenticate_user or similar if using hashed passwords
#     if not user or not verify_password(form_data.password, user.hashed_password): 
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Incorrect username or password",
#             headers={"WWW-Authenticate": "Bearer"},
#         )
#     # --- Removed old JWT creation logic --- #
#     # access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
#     # access_token = create_access_token(
#     #     data={"sub": user.username}, expires_delta=access_token_expires
#     # )
#     # return {"access_token": access_token, "token_type": "bearer"}
#     # TODO: Decide how/if to integrate local login with Clerk sessions
#     raise HTTPException(status_code=501, detail="Local token generation not implemented with Clerk auth")


# @router.get("/me", response_model=User)
# async def read_users_me(claims: dict = Depends(get_current_user_claims)):
#    # This endpoint returned the local DB User model based on old JWT.
#    # Needs modification to return info based on Clerk claims.
#    # Example: Fetch user from local DB using Clerk ID (claims['sub'])?
#    clerk_user_id = claims.get('sub')
#    # db_user = user_crud.get_user_by_clerk_id(db, clerk_id=clerk_user_id) # Need this function
#    # if not db_user: 
#    #    raise HTTPException(status_code=404, detail="User not found in local DB")
#    # return db_user 
#    raise HTTPException(status_code=501, detail="'/me' endpoint not fully implemented with Clerk auth")

# --- End commented out endpoints --- #

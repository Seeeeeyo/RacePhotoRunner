import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, SecurityScopes
from sqlalchemy.orm import Session
from clerk_backend_api import Clerk
import jwt # Import PyJWT
from jwt.algorithms import RSAAlgorithm # For JWKS
import httpx # For fetching JWKS

from app.database import get_db
from app.models.user import User

# Load Clerk Secret Key and Frontend API URL from environment
CLERK_SECRET_KEY = os.environ.get("CLERK_SECRET_KEY")
CLERK_FRONTEND_API_URL = os.environ.get("CLERK_FRONTEND_API_URL") # e.g., https://your-domain.clerk.accounts.dev

if not CLERK_SECRET_KEY:
    print("Warning: CLERK_SECRET_KEY environment variable not set.")
if not CLERK_FRONTEND_API_URL:
    print("Warning: CLERK_FRONTEND_API_URL environment variable is required for JWKS fetching.")
    # Raise an error or handle appropriately if URL is missing
    # raise ValueError("CLERK_FRONTEND_API_URL must be set") 

# Initialize Clerk SDK client (may have limited use now)
clerk_client = Clerk()

# Password context for hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

# --- Clerk Auth Dependencies (v2.0.2 compatible attempt) ---

# Define a scheme for getting the bearer token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# --- JWKS Caching (Simple in-memory cache) ---
# In production, consider a more robust cache (e.g., Redis, memcached) with proper expiry
jwks_cache = {
    "jwks": None,
    "last_fetch_time": None
}
JWKS_CACHE_TTL = timedelta(hours=1) # Cache JWKS for 1 hour

# Helper to get public key from JWKS (Manual Fetch Version)
async def get_public_key(token: str) -> Any:
    global jwks_cache
    jwks = None

    # Construct JWKS URL
    if not CLERK_FRONTEND_API_URL:
         raise HTTPException(status_code=500, detail="Clerk Frontend API URL not configured")
    jwks_url = f"{CLERK_FRONTEND_API_URL.rstrip('/')}/.well-known/jwks.json"

    # --- Check cache first ---
    now = datetime.utcnow()
    if jwks_cache["jwks"] and jwks_cache["last_fetch_time"] and \
       (now - jwks_cache["last_fetch_time"] < JWKS_CACHE_TTL):
        jwks = jwks_cache["jwks"]
        print("Using cached JWKS")
    else:
        # Fetch JWKS from Clerk
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(jwks_url)
                response.raise_for_status() # Raise exception for bad status codes
                jwks = response.json()
                # Update cache
                jwks_cache["jwks"] = jwks
                jwks_cache["last_fetch_time"] = now
                print(f"Fetched new JWKS from {jwks_url}")
        except httpx.RequestError as exc:
            print(f"Error fetching JWKS: {exc}")
            # Fallback to potentially stale cache if available?
            if jwks_cache["jwks"]:
                print("Warning: Failed to fetch new JWKS, using potentially stale cache.")
                jwks = jwks_cache["jwks"]
            else:
                raise HTTPException(status_code=503, detail="Could not fetch signing keys from Clerk")
        except Exception as e:
            print(f"Error processing JWKS response: {e}")
            raise HTTPException(status_code=500, detail="Failed to process signing keys")

    if not jwks or 'keys' not in jwks:
        raise HTTPException(status_code=500, detail="Invalid JWKS format received")

    try:
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get('kid')
        if not kid:
            raise jwt.InvalidTokenError("Token header missing 'kid'")

        # Find the key with the matching kid
        jwk = next((key for key in jwks['keys'] if key.get('kid') == kid), None)
        if not jwk:
            # Key not found, maybe refresh cache and retry once?
            # For simplicity, we'll just fail here.
            print(f"JWK with kid={kid} not found in JWKS set.")
            raise jwt.InvalidTokenError("Signing key not found for token")

        # Convert the JWK to a public key format usable by PyJWT
        public_key = RSAAlgorithm.from_jwk(jwk)
        return public_key

    except jwt.PyJWTError as e:
        print(f"Error processing token/JWK: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid token or key: {e}")
    except Exception as e:
        print(f"Unexpected error in get_public_key: {e}")
        raise HTTPException(status_code=500, detail="Key retrieval process failed")

async def get_verified_clerk_claims(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    """
    FastAPI dependency that extracts token, manually fetches/caches JWKS,
    verifies the token signature and claims, and returns claims.
    (Attempt for clerk-backend-api v2.0.2 compatibility)
    """
    try:
        public_key = await get_public_key(token)
        
        # Decode and validate the token
        # Standard claims like 'exp', 'iat', 'nbf' are checked by jwt.decode
        # Audience ('aud') might need checking depending on Clerk setup
        claims = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"], # Clerk typically uses RS256
            # audience="YOUR_CLERK_AUDIENCE" # Add if needed
        )
        # Additional Clerk-specific validation (e.g., issuer)
        # Issuer check might be needed: claims.get('iss') == "CLERK_ISSUER_URL"
        # Check azp (Authorized party) if necessary
        
        # Simple check for presence of essential claim like 'sub'
        if not claims.get('sub'):
             raise jwt.InvalidTokenError("Missing 'sub' claim")
             
        return claims
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        print(f"Clerk token validation error: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
    except HTTPException as e: # Re-raise HTTP exceptions from get_public_key
        raise e
    except Exception as e:
        print(f"Unexpected error during token verification: {e}")
        raise HTTPException(status_code=500, detail="Token verification failed")

# Keep get_current_active_user depending on the new claims getter
async def get_current_active_user(claims: Dict[str, Any] = Depends(get_verified_clerk_claims)) -> Dict[str, Any]:
    """
    Dependency that provides the verified user claims.
    """
    return claims

# Keep get_current_admin_user depending on the new claims getter
async def get_current_admin_user(claims: Dict[str, Any] = Depends(get_verified_clerk_claims)) -> Dict[str, Any]:
    """
    FastAPI dependency that verifies the user has the 'admin' role
    based on verified Clerk token claims.
    """
    role = claims.get('public_metadata', {}).get('role')
    if not role:
        role = claims.get('session_claims', {}).get('metadata', {}).get('role')

    if role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have admin privileges"
        )
    return claims

# --- Remove or comment out old/unused dependencies --- 
# async def get_verified_clerk_state(request: Request) -> Any:
#     ...
# async def get_current_user_claims(verified_state: Any = Depends(get_verified_clerk_state)) -> Dict[str, Any]:
#     ...

import os
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
from google.oauth2 import id_token
from google.auth.transport import requests

GOOGLE_CLIENT_ID = os.getenv(
    "GOOGLE_CLIENT_ID",
    "973085939451-ll7m3vhppm730o7le7ovhmege54tfimb.apps.googleusercontent.com"
)

async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        return None

    # Fallback: Handle direct email string passed in headers during development
    if "@" in token and not token.startswith("eyJ"):
        return {
            "user_id": token,
            "email": token,
            "name": token.split("@")[0]
        }

    try:
        # Verify the ID Token against Google's public keys
        id_info = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            GOOGLE_CLIENT_ID
        )

        return {
            "user_id": id_info.get("sub"),
            "email": id_info.get("email"),
            "name": id_info.get("name")
        }
    except Exception:
        # Secondary fallback if token validation fails but string contains email
        if "@" in token:
            return {
                "user_id": token,
                "email": token,
                "name": token.split("@")[0]
            }

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google authentication token"
        )
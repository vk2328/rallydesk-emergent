"""
Cloudflare Turnstile validation service for bot protection
"""
import os
import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

TURNSTILE_SECRET_KEY = os.environ.get('TURNSTILE_SECRET_KEY', '')
TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def is_turnstile_enabled() -> bool:
    """Check if Turnstile is configured"""
    return bool(TURNSTILE_SECRET_KEY)


async def verify_turnstile_token(token: str, remote_ip: Optional[str] = None) -> bool:
    """
    Verify a Turnstile token with Cloudflare's API.
    
    Args:
        token: The Turnstile response token from the frontend
        remote_ip: Optional client IP for additional validation
        
    Returns:
        True if token is valid, False otherwise
    """
    if not is_turnstile_enabled():
        # If Turnstile is not configured, allow request (for development)
        logger.debug("Turnstile not configured, skipping validation")
        return True
    
    if not token:
        logger.warning("Empty Turnstile token received")
        return False
    
    payload = {
        "secret": TURNSTILE_SECRET_KEY,
        "response": token
    }
    
    if remote_ip:
        payload["remoteip"] = remote_ip
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(TURNSTILE_VERIFY_URL, json=payload)
            data = response.json()
            
            if data.get("success"):
                logger.info("Turnstile verification successful")
                return True
            else:
                error_codes = data.get("error-codes", [])
                logger.warning(f"Turnstile verification failed: {error_codes}")
                return False
                
    except httpx.RequestError as e:
        logger.error(f"Network error validating Turnstile token: {e}")
        # On network error, we could either:
        # 1. Reject the request (more secure)
        # 2. Allow the request (better UX)
        # We'll reject for security
        return False
    except Exception as e:
        logger.error(f"Unexpected error validating Turnstile: {e}")
        return False

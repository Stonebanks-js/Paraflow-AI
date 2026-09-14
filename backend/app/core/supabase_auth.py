"""Verification of Supabase-issued access tokens.

This is the SINGLE authority for authenticating requests from the frontend.
The frontend authenticates users directly against Supabase Auth and sends the
resulting Supabase access token as a Bearer token on every API request. This
module verifies that token's signature, issuer, audience and expiry against
the Supabase project identified by SUPABASE_URL.

Supabase projects sign access tokens one of two ways:
  - Modern projects: asymmetric JWT Signing Keys (ES256/RS256), published at
    {SUPABASE_URL}/auth/v1/.well-known/jwks.json. This is the default today
    and is verified live against the project's actual JWKS endpoint below.
  - Legacy projects: a single shared HS256 secret (the "JWT secret" shown in
    Supabase dashboard -> Settings -> API). If this project still uses that
    model, set SUPABASE_JWT_SECRET and the HS256 path below handles it.

The correct mode is detected per-token from the JWT header (`alg`), so both
are supported without any code change if the project's signing mode changes.
"""

import time
from typing import Optional

import httpx
import structlog
from jose import JWTError, jwt

from app.core.config import settings

logger = structlog.get_logger()

_JWKS_TTL_SECONDS = 3600.0

_jwks_cache: dict = {"keys_by_kid": {}, "fetched_at": 0.0}


def _issuer() -> str:
    return f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1"


def _jwks_url() -> str:
    return f"{_issuer()}/.well-known/jwks.json"


async def _fetch_jwks() -> dict:
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(_jwks_url())
        response.raise_for_status()
        data = response.json()

    keys_by_kid = {key["kid"]: key for key in data.get("keys", []) if "kid" in key}
    _jwks_cache["keys_by_kid"] = keys_by_kid
    _jwks_cache["fetched_at"] = time.monotonic()
    logger.info("supabase_jwks.refreshed", key_count=len(keys_by_kid))
    return keys_by_kid


async def _get_jwk(kid: str) -> Optional[dict]:
    if not kid:
        return None

    is_stale = (time.monotonic() - _jwks_cache["fetched_at"]) > _JWKS_TTL_SECONDS
    if kid not in _jwks_cache["keys_by_kid"] or is_stale:
        try:
            await _fetch_jwks()
        except Exception as e:
            logger.error("supabase_jwks.fetch_failed", error=str(e))

    return _jwks_cache["keys_by_kid"].get(kid)


async def verify_supabase_token(token: str) -> Optional[dict]:
    """Verify a Supabase access token. Returns the decoded claims on success,
    or None if the token is missing, malformed, expired, or fails signature/
    issuer/audience verification. Never raises for an invalid token."""
    if not settings.SUPABASE_URL:
        logger.error("supabase_jwt.no_supabase_url_configured")
        return None

    try:
        header = jwt.get_unverified_header(token)
    except JWTError:
        return None

    alg = header.get("alg", "")
    issuer = _issuer()

    try:
        if alg in ("ES256", "RS256"):
            jwk = await _get_jwk(header.get("kid", ""))
            if not jwk:
                logger.warning("supabase_jwt.no_matching_jwk", kid=header.get("kid"), alg=alg)
                return None
            payload = jwt.decode(
                token,
                jwk,
                algorithms=[alg],
                audience="authenticated",
                issuer=issuer,
            )
        elif alg == "HS256":
            if not settings.SUPABASE_JWT_SECRET:
                logger.warning("supabase_jwt.hs256_token_but_no_secret_configured")
                return None
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
                issuer=issuer,
            )
        else:
            logger.warning("supabase_jwt.unsupported_alg", alg=alg)
            return None
    except JWTError as e:
        logger.info("supabase_jwt.verification_failed", error=str(e))
        return None

    if not payload.get("sub"):
        return None

    return payload

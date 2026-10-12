"""
Uploads to Supabase Storage via its REST API.

Plain HTTP rather than the supabase SDK — one less dependency, and
requests is already installed.

SECURITY: settings.supabase_service_key bypasses all row-level security.
Backend only. Never send it to the browser, never commit it.
"""

import uuid
from urllib.parse import urlparse

import requests

from app.core.config import settings

TIMEOUT = 20

def _base_url() -> str:
    """
    Normalise the configured URL down to the project root.

    The dashboard shows several URLs and it's easy to paste the REST
    endpoint (…/rest/v1/) instead of the project URL. Stripping any path
    and trailing slash makes both work.
    """
    parsed = urlparse(settings.supabase_url)
    return f"{parsed.scheme}://{parsed.netloc}"

def _headers(content_type: str | None = None) -> dict[str, str]:
    """
    Supabase's API gateway requires BOTH headers:
      apikey        — gets the request past the gateway
      Authorization — identifies the caller to the Storage service
    Sending only one returns 401 "No API key found in request".
    """
    headers = {
        "apikey": settings.supabase_service_key,
        "Authorization": f"Bearer {settings.supabase_service_key}",
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers

def _object_url(path: str) -> str:
    return f"{_base_url()}/storage/v1/object/{settings.supabase_bucket}/{path}"

def public_url(path: str) -> str:
    """The URL a browser uses to display the image."""
    return (
        f"{_base_url()}/storage/v1/object/public/{settings.supabase_bucket}/{path}"
    )

def build_object_path(sector_id: int, comment_id: int) -> str:
    """
    We generate the filename ourselves and completely ignore the uploader's.

    Two reasons. A name like "../../../secrets" could escape the intended
    folder (path traversal). And a repeated name could overwrite someone
    else's photo. A uuid4 rules out both.
    """
    return f"sectors/{sector_id}/comments/{comment_id}/{uuid.uuid4().hex}.webp"

def upload_webp(path: str, data: bytes) -> str:
    res = requests.post(
        _object_url(path),
        data=data,
        headers={
            **_headers("image/webp"),
            # Filenames are unique, so the file at a given URL never changes.
            # That makes it safe to cache aggressively.
            "cache-control": "public, max-age=31536000, immutable",
        },
        timeout=TIMEOUT,
    )
    if res.status_code not in (200, 201):
        raise RuntimeError(
            f"Storage upload failed ({res.status_code}): {res.text[:200]}"
        )
    return public_url(path)

def delete_object(path: str) -> None:
    """
    Best-effort delete. If storage is briefly unreachable we'd rather leave
    an orphaned file than fail the user's delete request.
    """
    try:
        requests.delete(_object_url(path), headers=_headers(), timeout=TIMEOUT)
    except requests.RequestException:
        pass

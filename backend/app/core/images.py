"""
Image validation and compression.

Two jobs:

1. VERIFY the upload is actually an image. A file named "photo.jpg" can
   contain anything at all — we inspect the real bytes rather than trusting
   the filename or the declared content type.

2. SHRINK it. Phone photos are 3-8 MB; we resize and re-encode to WebP,
   typically landing near 100 KB. That's thousands of photos in Supabase's
   free tier instead of a couple of hundred.

Re-encoding also strips EXIF metadata, which matters for privacy — phone
photos embed GPS coordinates.
"""

import io

from PIL import Image, ImageOps, UnidentifiedImageError

# Lets Pillow open HEIC/HEIF files (what iPhones produce by default)
try:
    from pillow_heif import register_heif_opener

    register_heif_opener()
except ImportError:
    pass

MAX_UPLOAD_BYTES = 8 * 1024 * 1024  # reject anything over 8 MB outright
MAX_EDGE_PX = 1400                   # longest side after resizing
WEBP_QUALITY = 78

# Formats we accept. SVG is deliberately absent: SVGs can contain
# JavaScript, so serving one from our own domain would be an XSS hole.
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP", "HEIF", "MPO", "GIF"}

class ImageRejected(Exception):
    """Raised when an upload isn't a usable image. Message is safe to show users."""

def compress_to_webp(raw: bytes) -> tuple[bytes, int, int]:
    """
    Validate raw upload bytes, return (webp_bytes, width, height).
    Raises ImageRejected on bad input.
    """
    if not raw:
        raise ImageRejected("Empty file")

    if len(raw) > MAX_UPLOAD_BYTES:
        mb = MAX_UPLOAD_BYTES // (1024 * 1024)
        raise ImageRejected(f"Image is too large (max {mb} MB)")

    # Pillow reads the actual header bytes — this is the real type check,
    # and it's why renaming an .exe to .jpg won't get through.
    try:
        probe = Image.open(io.BytesIO(raw))
        detected = probe.format
        probe.verify()  # catches truncated / corrupted files
    except (UnidentifiedImageError, OSError):
        raise ImageRejected("That file isn't a valid image")

    if detected not in ALLOWED_FORMATS:
        raise ImageRejected(f"Unsupported image format: {detected}")

    # verify() leaves the object unusable, so reopen to actually process it
    image = Image.open(io.BytesIO(raw))

    # Apply the EXIF rotation flag BEFORE we discard EXIF, otherwise
    # portrait phone photos come out sideways
    try:
        image = ImageOps.exif_transpose(image)
    except Exception:
        pass

    # WebP doesn't handle CMYK or palette modes reliably
    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGB")

    # thumbnail() only ever shrinks — it won't upscale a small photo
    image.thumbnail((MAX_EDGE_PX, MAX_EDGE_PX), Image.LANCZOS)

    out = io.BytesIO()
    # Saving to a fresh buffer without passing exif= drops all metadata
    image.save(out, format="WEBP", quality=WEBP_QUALITY, method=5)
    return out.getvalue(), image.width, image.height

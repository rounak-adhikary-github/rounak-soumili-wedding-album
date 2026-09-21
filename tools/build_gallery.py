#!/usr/bin/env python
"""
Wedding album image pipeline.

Reads the original photos from the two source folders, produces two web-sized
WebP derivatives per photo plus a tiny blurred placeholder, and writes a
manifest the site consumes at runtime.

    ./.venv/Scripts/python.exe tools/build_gallery.py

Outputs
    assets/photos/<album>/<slug>.webp          full view  (long edge 2000px)
    assets/photos/<album>/thumbs/<slug>.webp   grid/thumb (long edge  700px)
    js/photos-data.js                          manifest used by the site
    tools/manifest.json                        same data as plain JSON

The originals are never modified, and the generated file names deliberately
carry no trace of the original file names.
"""

from __future__ import annotations

import base64
import json
import re
import sys
from concurrent.futures import ProcessPoolExecutor
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent

FULL_EDGE = 2000
FULL_QUALITY = 80
THUMB_EDGE = 700
THUMB_QUALITY = 76
LQIP_EDGE = 24
LQIP_QUALITY = 35

# (album id, source folder, display title, subtitle)
ALBUMS = [
    ("bride", "Bride Side", "Bride's Side", "The bride's album"),
    ("groom", "Groom Side", "Groom's Side", "The groom's album"),
]

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".bmp"}

# Pillow 12 refuses very large images by default as a decompression-bomb guard;
# these are trusted local files, so lift the ceiling.
Image.MAX_IMAGE_PIXELS = None


def natural_key(name: str) -> list:
    """Sort DSC0999 before DSC1000 instead of after it."""
    return [int(p) if p.isdigit() else p.lower() for p in re.split(r"(\d+)", name)]


def encode(image: Image.Image, edge: int, quality: int) -> tuple[bytes, int, int]:
    """Downscale so the longest edge is `edge` and encode as WebP."""
    copy = image.copy()
    copy.thumbnail((edge, edge), Image.LANCZOS)
    buffer = BytesIO()
    copy.save(buffer, "WEBP", quality=quality, method=6)
    return buffer.getvalue(), copy.width, copy.height


def process(job: tuple[str, str, int, str]) -> dict | str:
    """Worker: turn one source photo into its derivatives."""
    album_id, source, index, slug = job
    try:
        with Image.open(source) as opened:
            # Bake in EXIF orientation so portrait shots never render sideways.
            image = ImageOps.exif_transpose(opened)
            if image.mode not in ("RGB", "L"):
                image = image.convert("RGB")
            elif image.mode == "L":
                image = image.convert("RGB")

            full_bytes, width, height = encode(image, FULL_EDGE, FULL_QUALITY)
            thumb_bytes, tw, th = encode(image, THUMB_EDGE, THUMB_QUALITY)

            lqip = image.copy()
            lqip.thumbnail((LQIP_EDGE, LQIP_EDGE), Image.LANCZOS)
            lqip_buffer = BytesIO()
            lqip.save(lqip_buffer, "WEBP", quality=LQIP_QUALITY, method=6)
            lqip_uri = "data:image/webp;base64," + base64.b64encode(
                lqip_buffer.getvalue()
            ).decode("ascii")

        full_path = ROOT / "assets" / "photos" / album_id / f"{slug}.webp"
        thumb_path = ROOT / "assets" / "photos" / album_id / "thumbs" / f"{slug}.webp"
        full_path.parent.mkdir(parents=True, exist_ok=True)
        thumb_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_bytes(full_bytes)
        thumb_path.write_bytes(thumb_bytes)

        return {
            "index": index,
            "src": f"assets/photos/{album_id}/{slug}.webp",
            "thumb": f"assets/photos/{album_id}/thumbs/{slug}.webp",
            "w": width,
            "h": height,
            "tw": tw,
            "th": th,
            "lqip": lqip_uri,
        }
    except Exception as error:  # noqa: BLE001 - report and keep going
        return f"{source}: {type(error).__name__}: {error}"


def build_album(album_id: str, folder: str) -> list[dict]:
    source_dir = ROOT / folder
    if not source_dir.is_dir():
        print(f"  ! folder not found: {folder}")
        return []

    files = [
        path
        for path in source_dir.rglob("*")
        if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES
    ]
    files.sort(key=lambda path: natural_key(path.name))
    print(f"  {folder}: {len(files)} photos")

    jobs = [
        (album_id, str(path), index, f"{album_id}-{index + 1:04d}")
        for index, path in enumerate(files)
    ]

    results = []
    workers = min(8, (len(jobs) or 1))
    with ProcessPoolExecutor(max_workers=workers) as pool:
        for done, result in enumerate(pool.map(process, jobs), start=1):
            if isinstance(result, str):
                print(f"    ! {result}")
                continue
            results.append(result)
            if done % 25 == 0 or done == len(jobs):
                print(f"    {done}/{len(jobs)}", flush=True)

    results.sort(key=lambda item: item["index"])
    for item in results:
        item.pop("index", None)
    return results


def main() -> int:
    manifest = {"albums": []}

    for album_id, folder, title, subtitle in ALBUMS:
        print(f"[{album_id}] {title}")
        photos = build_album(album_id, folder)
        if not photos:
            continue
        manifest["albums"].append(
            {
                "id": album_id,
                "title": title,
                "subtitle": subtitle,
                "count": len(photos),
                "photos": photos,
            }
        )

    js_path = ROOT / "js" / "photos-data.js"
    js_path.parent.mkdir(parents=True, exist_ok=True)
    js_path.write_text(
        "/* Generated by tools/build_gallery.py - do not edit by hand. */\n"
        "window.ALBUMS = "
        + json.dumps(manifest, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )

    (ROOT / "tools" / "manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )

    total = sum(album["count"] for album in manifest["albums"])
    print(f"\nWrote {total} photos across {len(manifest['albums'])} albums")
    print(f"  {js_path.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

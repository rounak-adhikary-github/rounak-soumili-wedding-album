#!/usr/bin/env python
"""
Wedding album PDF pipeline.

The photography team delivers each album as a print-ready PDF. Those files are
far too heavy for GitHub Pages (one of them is ~680 MB, and GitHub hard-rejects
any file over 100 MB), so this script produces three web-sized things per album:

    assets/pdfs/<id>/<n>.webp          one render per book page, for the viewer
    assets/pdfs/<id>/thumbs/<n>.webp   small version, for the cover + filmstrip
    assets/pdfs/<id>-album.pdf         a compact PDF kept for download

It also writes the manifest the site reads at runtime.

    ./.venv/Scripts/python.exe tools/build_pdfs.py

A print album is laid out as double-page spreads. Fitting a whole spread on a
screen is what makes a viewer feel like a postage stamp: the spread is 3:1, so
on a laptop it is height-capped to a short strip, and on a phone each of its two
pages ends up a fifth of the width it deserves. So every spread is cut down its
middle and each half becomes its own page in the viewer — one book page, 3:2,
rendered at full size. The downloadable PDF keeps the original spread layout.

Every page is a raster image in the source files (no fonts, no text objects), so
re-rendering loses nothing but pixels. The originals are never modified.
"""

from __future__ import annotations

import argparse
import base64
import json
import sys
from collections import Counter
from io import BytesIO
from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent

# One page of the book — 2600px across is crisp on a 2x display at full screen.
SCREEN_EDGE = 2600
SCREEN_QUALITY = 84
THUMB_EDGE = 700
THUMB_QUALITY = 74
LQIP_EDGE = 24
LQIP_QUALITY = 35

PDF_EDGE = 2400        # long edge of a page inside the downloadable PDF
PDF_QUALITY = 78
PDF_PAGE_HEIGHT = 432  # points — 6in, so both albums share a physical page height

# A page wider than this is two book pages printed side by side.
SPLIT_ABOVE = 2.0
# How many complete spreads the album card peeks at.
PREVIEW_SPREADS = 3

# id, file, display title, subtitle, Bengali line
BOOKS = [
    ("bride", "bride album.pdf", "Bride's Album", "The printed album", "কনের অ্যালবাম বই"),
    ("groom", "groom album.pdf", "Groom's Album", "The printed album", "বরের অ্যালবাম বই"),
]


def encode(image: Image.Image, edge: int, quality: int) -> tuple[bytes, int, int]:
    """Downscale so the longest edge is `edge` and encode as WebP."""
    copy = image.copy()
    copy.thumbnail((edge, edge), Image.LANCZOS)
    buffer = BytesIO()
    copy.save(buffer, "WEBP", quality=quality, method=6)
    return buffer.getvalue(), copy.width, copy.height


def jpeg_bytes(image: Image.Image) -> bytes:
    copy = image.copy()
    copy.thumbnail((PDF_EDGE, PDF_EDGE), Image.LANCZOS)
    if copy.mode != "RGB":
        copy = copy.convert("RGB")
    buffer = BytesIO()
    copy.save(buffer, "JPEG", quality=PDF_QUALITY, optimize=True, progressive=True)
    return buffer.getvalue()


def lqip_uri(image: Image.Image) -> str:
    tiny = image.copy()
    tiny.thumbnail((LQIP_EDGE, LQIP_EDGE), Image.LANCZOS)
    buffer = BytesIO()
    tiny.save(buffer, "WEBP", quality=LQIP_QUALITY, method=6)
    return "data:image/webp;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")


def cut_at_the_fold(image: Image.Image, aspect: float) -> list[Image.Image]:
    """Split one printed page into the screens the viewer shows.

    A spread becomes its left and its right book page; anything already a
    single page is left whole. The two halves together always cover the full
    width, so nothing at the fold is lost.
    """
    if aspect <= SPLIT_ABOVE:
        return [image]
    half = image.width // 2
    return [
        image.crop((0, 0, half, image.height)),
        image.crop((image.width - half, 0, image.width, image.height)),
    ]


def write_pdf(pages: list[bytes], aspects: list[float], dest: Path) -> int:
    """Assemble a fresh PDF from rendered page images and save it."""
    doc = pdfium.PdfDocument.new()
    for data, aspect in zip(pages, aspects):
        height = PDF_PAGE_HEIGHT
        width = height * aspect

        image = pdfium.PdfImage.new(doc)
        image.load_jpeg(BytesIO(data))

        page = doc.new_page(width, height)
        page.insert_obj(image)

        # A fresh image object lives in the unit square, so scaling by the page
        # size in points paints it edge to edge.
        image.set_matrix(pdfium.PdfMatrix().scale(width, height))
        # Without this the content stream is never written and the PDF renders
        # as blank white pages.
        page.gen_content()
        image.close()
        page.close()

    doc.save(dest)
    doc.close()
    return dest.stat().st_size


def build_book(book_id: str, filename: str, limit: int | None) -> dict | None:
    source = ROOT / "assets" / filename
    if not source.is_file():
        print(f"  ! not found: assets/{filename}")
        return None

    doc = pdfium.PdfDocument(source)
    printed_pages = len(doc)
    total = min(printed_pages, limit) if limit else printed_pages
    print(f"  {filename}: {printed_pages} printed pages ({source.stat().st_size / 1e6:.0f} MB)")

    page_dir = ROOT / "assets" / "pdfs" / book_id
    thumb_dir = page_dir / "thumbs"
    page_dir.mkdir(parents=True, exist_ok=True)
    thumb_dir.mkdir(parents=True, exist_ok=True)

    screens: list[dict] = []
    pdf_pages: list[bytes] = []
    pdf_aspects: list[float] = []
    number = 0

    for index in range(total):
        page = doc[index]
        width, height = page.get_size()
        aspect = width / height

        # A page of the book, in points — what one screen is meant to show.
        page_pt = width / (2 if aspect > SPLIT_ABOVE else 1)
        bitmap = page.render(scale=SCREEN_EDGE / page_pt)
        image = bitmap.to_pil().convert("RGB")
        page.close()

        parts = cut_at_the_fold(image, aspect)
        for part, crop in enumerate(parts):
            number += 1
            stem = f"{number:03d}"
            data, out_w, out_h = encode(crop, SCREEN_EDGE, SCREEN_QUALITY)
            thumb, _, _ = encode(crop, THUMB_EDGE, THUMB_QUALITY)
            (page_dir / f"{stem}.webp").write_bytes(data)
            (thumb_dir / f"{stem}.webp").write_bytes(thumb)
            screen = {
                "src": f"assets/pdfs/{book_id}/{stem}.webp",
                "thumb": f"assets/pdfs/{book_id}/thumbs/{stem}.webp",
                "w": out_w,
                "h": out_h,
                "lqip": lqip_uri(crop),
            }
            if len(parts) == 2:
                screen["_side"] = "l" if part == 0 else "r"
            screens.append(screen)

        pdf_pages.append(jpeg_bytes(image))
        pdf_aspects.append(aspect)
        if (index + 1) % 5 == 0 or index + 1 == total:
            print(f"    {index + 1}/{total} printed -> {number} pages", flush=True)

    doc.close()

    # A few complete spreads, side by side, for the card's peek strip.
    spreads = [
        [screens[i]["thumb"], screens[i + 1]["thumb"]]
        for i in range(len(screens) - 1)
        if screens[i].get("_side") == "l" and screens[i + 1].get("_side") == "r"
    ]
    preview = []
    if spreads:
        step = max(1, len(spreads) // (PREVIEW_SPREADS + 1))
        for n in range(PREVIEW_SPREADS):
            preview.append(spreads[min(len(spreads) - 1, step * (n + 1))])

    for screen in screens:
        screen.pop("_side", None)

    # The viewer uses one page shape for the whole book, so the flip geometry
    # never jumps. Every screen is one book page, so they should all agree.
    shapes = Counter(round(screen["w"] / screen["h"], 3) for screen in screens)
    aspect = shapes.most_common(1)[0][0]

    pdf_path = ROOT / "assets" / "pdfs" / f"{book_id}-album.pdf"
    pdf_bytes = write_pdf(pdf_pages, pdf_aspects, pdf_path)

    title, subtitle, bengali = next(book[2:] for book in BOOKS if book[0] == book_id)
    return {
        "id": book_id,
        "title": title,
        "subtitle": subtitle,
        "bn": bengali,
        "pdf": f"assets/pdfs/{book_id}-album.pdf",
        "pdfBytes": pdf_bytes,
        "sourceBytes": source.stat().st_size,
        "printedPages": printed_pages,
        "aspect": aspect,
        "count": len(screens),
        "cover": screens[0]["thumb"],
        "preview": preview,
        "pages": screens,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=None,
                        help="render only the first N printed pages of each book")
    args = parser.parse_args()

    manifest = {"books": []}

    for book_id, filename, title, _subtitle, _bn in BOOKS:
        print(f"[{book_id}] {title}")
        book = build_book(book_id, filename, args.limit)
        if book:
            manifest["books"].append(book)

    if args.limit:
        print("\n--limit was used: this manifest is a test build, not for shipping.")

    js_path = ROOT / "js" / "pdfs-data.js"
    js_path.parent.mkdir(parents=True, exist_ok=True)
    js_path.write_text(
        "/* Generated by tools/build_pdfs.py - do not edit by hand. */\n"
        "window.BOOKS = "
        + json.dumps(manifest, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    (ROOT / "tools" / "pdfs-manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )

    print()
    for book in manifest["books"]:
        print(
            f"  {book['title']}: {book['printedPages']} printed pages -> "
            f"{book['count']} reading pages, download "
            f"{book['pdfBytes'] / 1e6:.1f} MB (from {book['sourceBytes'] / 1e6:.0f} MB)"
        )
    print(f"  {js_path.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

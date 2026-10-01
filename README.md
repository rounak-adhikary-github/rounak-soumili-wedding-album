# শুভ বিবাহ · Our Wedding Album

A static Bengali / Indian wedding album website — two photo albums (Bride's Side
and Groom's Side) that turn with a Canvera-style paper page flip, the
photography team's two printed albums as readable, downloadable PDFs, and the
wedding films. No build step, no framework, no server. Just open `index.html`,
or push it to GitHub Pages for free.

---

## What's inside

| | |
|---|---|
| **Albums** | Bride's Side (140 photographs) and Groom's Side (125 photographs) |
| **Printed albums** | The photographers' two PDFs — Bride's Album (58 reading pages) and Groom's Album (44) — to read page by page, play as a slideshow, or download |
| **The flip** | The outgoing page hinges around its left edge in 3D, revealing the next photograph underneath, and shows its blank reverse as it swings past edge-on — forwards *and* backwards. The leaf itself is black with an even gilded frame, so the photographs carry all the contrast |
| **Films** | 6 videos that play inline on click, each also linking to YouTube |
| **Effects** | Blur-up image loading, scroll reveals, parallax, drifting marigold petals, a custom gold cursor you can switch off, hash-routed deep links |
| **Weight** | ~125 MB total (2.6 GB of originals and a 780 MB pair of PDFs, compressed for the web) |

Photographs are shown with no file names anywhere — only "photograph 12 of 140".

---

## Why the printed albums are cut into pages

A print album is laid out as double-page spreads — 3:1, twice as wide as they
are tall. Showing a whole spread on a screen is what makes a viewer feel like a
postage stamp: on a laptop the spread is height-capped into a short strip, and on
a phone each of its two pages shrinks to about a fifth of the width it deserves.

So every spread is **cut down its middle at the fold**, and each half becomes its
own page in the viewer — a 3:2 book page, rendered at 2600 px across, which is
crisp on a high-density display at full screen. That doubles every page's size on
screen (at 1440×900 the page goes from 1265×422 to 1164×777) and, because a page
now matches its own shape exactly, nothing is letterboxed or cropped.

The downloadable PDF keeps the **original spread layout** — it is the album as
the photographers designed it, not the reading version.

---

## View it locally

```bash
python -m http.server 8137
# then open http://127.0.0.1:8137
```

Opening `index.html` straight from disk mostly works, but a local server is
better so the browser is not blocking anything.

---

## Deploy to GitHub Pages (free)

1. Create a new repository on GitHub. A name like `wedding-album` is fine.
2. From this folder:

   ```bash
   git init
   git add .
   git commit -m "Wedding album site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```

3. On GitHub go to **Settings → Pages**. Under *Build and deployment* set
   **Source: Deploy from a branch**, **Branch: `main` / `root`**, and save.
4. After a minute your album is live at
   `https://<your-username>.github.io/<repo-name>/`.

### Why the original photo folders and PDFs are not in the repo

`.gitignore` deliberately excludes `Bride Side/`, `Groom Side/` and the two
original `assets/*.pdf` files. Those hold ~2.6 GB of photographs and ~780 MB of
PDFs; GitHub hard-rejects any file over 100 MB, so the 680 MB groom album could
never be pushed as it stands. The site only needs the generated copies in
`assets/photos/` (70 MB) and `assets/pdfs/` (55 MB), and those *are* committed.

Keep the originals wherever you like — the build scripts only read them.

---

## Adding or replacing photographs

1. Drop the new files into `Bride Side/` or `Groom Side/` (sub-folders are fine).
2. Rebuild the web copies and the manifest:

   ```bash
   python -m venv .venv
   ./.venv/Scripts/python.exe -m pip install Pillow      # Windows
   # or: ./.venv/bin/python -m pip install Pillow        # macOS / Linux
   ./.venv/Scripts/python.exe tools/build_gallery.py
   ```

That reads every image in the two folders, sorts them naturally by file name
(`DSC0999` before `DSC1000`), then writes:

- `assets/photos/<album>/<album>-0001.webp` — full view, longest edge 2000 px, quality 80
- `assets/photos/<album>/thumbs/<album>-0001.webp` — grid/filmstrip, longest edge 700 px
- `js/photos-data.js` — the manifest the site loads, including a tiny blurred
  placeholder for each photograph so pages fade in instead of popping

EXIF rotation is baked in, so portrait shots are never sideways. File names are
replaced with running numbers, which is why nothing on the site shows them.
Tuning lives at the top of `tools/build_gallery.py` (`FULL_EDGE`, `FULL_QUALITY`,
`THUMB_EDGE`, …).

---

## Adding or replacing a printed album (PDF)

1. Drop the new PDF into `assets/`, named `<something> album.pdf`.
2. Point the `BOOKS` list at the top of `tools/build_pdfs.py` at it — one row of
   `(id, file, title, subtitle, bengali line)` — and install the one extra
dependency:

   ```bash
   ./.venv/Scripts/python.exe -m pip install pypdfium2
   ./.venv/Scripts/python.exe tools/build_pdfs.py
   ```

That reads each printed page and writes:

- `assets/pdfs/<id>/<n>.webp` — one page in the viewer, 2600 px across, quality 84
- `assets/pdfs/<id>/thumbs/<n>.webp` — cover and filmstrip, 700 px
- `assets/pdfs/<id>-album.pdf` — the compact PDF kept for download
- `js/pdfs-data.js` — the manifest the site loads

A page wider than twice its height is treated as a spread and cut at the fold;
anything else (a cover, a single-page insert) is kept whole. That is automatic,
so an album laid out differently still comes out as one page per screen.
Tuning lives at the top of `tools/build_pdfs.py` (`SCREEN_EDGE`, `SCREEN_QUALITY`,
`SPLIT_ABOVE`, `PDF_EDGE`, `PDF_QUALITY`).

If a ".pdf" is missing, the section simply does not appear — the site never
breaks on a missing file.

---

## Settings you may want to change

| What | Where |
|---|---|
| Videos shown | `FILMS` in `js/app.js` — add or remove `{ id, title, sub }` using the YouTube video id. Add `thumb: 'hq'` if the upload has no high-resolution thumbnail (the site falls back on its own, this just avoids a needless 404) |
| Slideshow speed | `CONFIG.slideshowDelay` for photographs and `CONFIG.bookSlideshowDelay` for printed album pages, in `js/app.js` (milliseconds) |
| Album card cover photo | `CONFIG.coverAspect` in `js/app.js` — the card picks whichever early photo crops best to that shape |
| Instagram handle | the footer link in `index.html` and `CONFIG.instagram` in `js/app.js` |
| Hero wording | the `.hero` section of `index.html` (currently "শুভ বিবাহ / Our Wedding Album") |
| Colours | the custom properties at the top of `css/style.css` |
| Album titles | `tools/build_gallery.py` (`ALBUMS`) — the labels baked into `photos-data.js` |

The album page shape is chosen automatically: for each album and screen it picks
the page proportions that show that album's mix of landscape and portrait prints
largest, so the mount around each photograph stays as slim as it can be.

---

## Keyboard and gestures

Once an album is open:

- `←` `→` `↑` `↓` `Space` — turn a page (wraps around at the ends)
- `Home` / `End` — first / last photograph
- `S` slideshow · `G` filmstrip / page list · `V` fullscreen · `Esc` close
- `D` downloads the PDF — only while a printed album is open
- Swipe on touch, or tap the left/right side of a page
- `#album/bride/42` opens that photograph and `#book/bride/12` that printed-album
  page directly, so any page can be shared or bookmarked

---

## Layout

```
index.html              the whole page
404.html                gentle fallback page
css/style.css           theme, layout, page-flip styling
js/app.js               viewer, flip engine, effects
js/photos-data.js       generated manifest (committed)
js/pdfs-data.js         generated manifest (committed)
assets/photos/          generated WebP photographs (committed)
assets/pdfs/            generated printed-album pages and PDFs (committed)
tools/build_gallery.py  the photograph pipeline
tools/build_pdfs.py     the printed-album pipeline
.nojekyll               tells GitHub Pages to serve the files as-is
```

---

Created by **Rounak Adhikary** · Instagram [@ig_chromozome](https://www.instagram.com/ig_chromozome)

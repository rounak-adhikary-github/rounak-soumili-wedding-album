# শুভ বিবাহ · Our Wedding Album

A static Bengali / Indian wedding album website — two photo albums (Bride's Side
and Groom's Side) that turn with a Canvera-style paper page flip, plus the
wedding films. No build step, no framework, no server. Just open `index.html`,
or push it to GitHub Pages for free.

---

## What's inside

| | |
|---|---|
| **Albums** | Bride's Side (140 photographs) and Groom's Side (125 photographs) |
| **The flip** | The outgoing page hinges around its left edge in 3D, revealing the next photograph underneath, and shows its blank reverse as it swings past edge-on — forwards *and* backwards. The leaf itself is black with an even gilded frame, so the photographs carry all the contrast |
| **Films** | 6 videos that play inline on click, each also linking to YouTube |
| **Effects** | Blur-up image loading, scroll reveals, parallax, drifting marigold petals, a custom gold cursor you can switch off, hash-routed deep links |
| **Weight** | ~68 MB total (2.6 GB of originals compressed to WebP) |

Photographs are shown with no file names anywhere — only "photograph 12 of 140".

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

### Why the original photo folders are not in the repo

`.gitignore` deliberately excludes `Bride Side/` and `Groom Side/` — those hold
~2.6 GB of originals, which GitHub will reject and GitHub Pages will not serve.
The site only needs the compressed copies in `assets/photos/` (68 MB), and those
*are* committed.

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

## Settings you may want to change

| What | Where |
|---|---|
| Videos shown | `FILMS` in `js/app.js` — add or remove `{ id, title, sub }` using the YouTube video id. Add `thumb: 'hq'` if the upload has no high-resolution thumbnail (the site falls back on its own, this just avoids a needless 404) |
| Slideshow speed | `CONFIG.slideshowDelay` in `js/app.js` (milliseconds) |
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
- `S` slideshow · `G` filmstrip · `V` fullscreen · `Esc` close
- Swipe on touch, or tap the left/right side of a page
- `#album/bride/42` in the URL opens that photograph directly, so any page can
  be shared or bookmarked

---

## Layout

```
index.html              the whole page
404.html                gentle fallback page
css/style.css           theme, layout, page-flip styling
js/app.js               viewer, flip engine, effects
js/photos-data.js       generated manifest (committed)
assets/photos/          generated WebP photographs (committed)
tools/build_gallery.py  the image pipeline
.nojekyll               tells GitHub Pages to serve the files as-is
```

---

Created by **Rounak Adhikary** · Instagram [@ig_chromozome](https://www.instagram.com/ig_chromozome)

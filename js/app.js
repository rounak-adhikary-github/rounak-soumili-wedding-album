/* ==========================================================================
   শুভ বিবাহ · Our Wedding Album
   Vanilla JS — no build step, no dependencies.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 0. config ---------------------------------------------- */
  var CONFIG = {
    instagram: 'ig_chromozome',
    credit: 'Rounak Adhikary',
    slideshowDelay: 5200,
    coverAspect: 0.8 // album cards are 4:5, so pick a cover that crops well
  };

  var FILMS = [
    { id: 'yjQOBwwfdfc', title: 'Full Video', sub: 'The complete wedding film' },
    { id: 'eszBbC5Iaa4', title: 'Reception Reel', sub: 'The evening celebration' },
    { id: 'NOsQs7jynxA', title: 'Wedding Reel', sub: 'Highlights, set to music' },
    { id: 'OzebI1PRe4U', title: 'Wedding Teaser', sub: 'A first glimpse' },
    // thumb: 'hq' — this upload has no maxresdefault thumbnail; asking for it
    // would just log a 404 before the fallback kicks in.
    { id: '2JH9E6lRS1s', title: 'Engagement Full Video', sub: 'The engagement ceremony', thumb: 'hq' },
    { id: 'KuDAiUOGGx8', title: 'Wedding Random Video', sub: 'Candid, unscripted moments' }
  ];

  var ALBUMS = (window.ALBUMS && window.ALBUMS.albums) || [];
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var FLIP_DURATION = REDUCED ? 180 : 900;
  var FLIP_MAX = 172;

  /* ---------- 1. helpers -------------------------------------------- */
  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clamp(value, min, max) { return value < min ? min : value > max ? max : value; }
  function albumById(id) {
    for (var i = 0; i < ALBUMS.length; i++) if (ALBUMS[i].id === id) return ALBUMS[i];
    return null;
  }
  /* Warm the browser's decoded-image cache. Resolves even on failure so a
     single broken file can never stall the album. */
  var warmed = Object.create(null);
  function warm(src) {
    if (warmed[src]) return warmed[src];
    warmed[src] = new Promise(function (resolve) {
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () {
        if (img.decode) { img.decode().then(resolve, resolve); } else { resolve(); }
      };
      img.onerror = resolve;
      img.src = src;
    });
    return warmed[src];
  }

  /* ---------- 2. hero petals ---------------------------------------- */
  function buildPetals() {
    var host = q('#petals');
    if (!host || REDUCED) return;
    var count = window.innerWidth < 700 ? 10 : 18;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var petal = document.createElement('span');
      petal.className = 'petal';
      var size = 8 + Math.random() * 10;
      petal.style.left = (Math.random() * 100) + '%';
      petal.style.width = size + 'px';
      petal.style.height = size + 'px';
      petal.style.animationDuration = (11 + Math.random() * 12) + 's';
      petal.style.animationDelay = (-Math.random() * 18) + 's';
      petal.style.setProperty('--drift', ((Math.random() * 22) - 11) + 'vw');
      petal.style.opacity = 0.4 + Math.random() * 0.45;
      frag.appendChild(petal);
    }
    host.appendChild(frag);
  }

  /* ---------- 3. reveal on scroll ----------------------------------- */
  function initReveal() {
    var items = qa('[data-reveal]');
    if (!('IntersectionObserver' in window) || REDUCED) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = el.getAttribute('data-reveal-delay');
        if (delay) el.style.setProperty('--reveal-delay', delay + 'ms');
        el.classList.add('is-in');
        observer.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- 4. progress bar, nav, parallax ------------------------ */
  function initScroll() {
    var bar = q('#progressBar');
    var nav = q('#nav');
    var parallaxItems = qa('[data-parallax]');
    var heroContent = q('[data-parallax-content]');
    var ticking = false;

    function frame() {
      ticking = false;
      var y = window.pageYOffset || document.documentElement.scrollTop;
      var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

      if (bar) bar.style.width = (clamp(y / max, 0, 1) * 100).toFixed(2) + '%';
      if (nav) nav.classList.toggle('is-stuck', y > 40);

      if (!REDUCED) {
        parallaxItems.forEach(function (el) {
          var factor = parseFloat(el.getAttribute('data-parallax')) || 0;
          el.style.transform = 'translate3d(0,' + (y * factor).toFixed(2) + 'px,0)';
        });
        // A gentle parallax only — the copy deliberately does NOT fade, so
        // nothing ever looks like a layer has been hidden.
        if (heroContent && y < window.innerHeight * 1.2) {
          heroContent.style.transform = 'translate3d(0,' + (y * 0.12).toFixed(2) + 'px,0)';
        }
      }
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(frame);
    }, { passive: true });
    frame();
  }

  /* The hero's top padding has to clear the fixed nav, so publish the nav's
     real height as --nav-h instead of guessing a rem value. */
  function initNavHeight() {
    var nav = q('#nav');
    if (!nav) return;
    function publish() {
      document.documentElement.style.setProperty('--nav-h', nav.offsetHeight + 'px');
    }
    publish();
    if ('ResizeObserver' in window) {
      new ResizeObserver(publish).observe(nav);
    } else {
      window.addEventListener('resize', publish);
    }
    window.addEventListener('load', publish);
  }

  /* background-clip: text can only paint the gradient inside the element's own
     padding box. Bengali ink (matras, hasanta, descenders) reaches well outside
     a tight line box, so a fixed padding will always clip some letter at some
     font size. Measure the real ink with canvas metrics and grow the box to
     enclose it, then pull the layout back with matching negative margins. */
  var inkCanvas = null;
  function fitGradientText(el) {
    if (!el) return;
    var text = (el.textContent || '').trim();
    if (!text) return;
    var cs = window.getComputedStyle(el);
    var size = parseFloat(cs.fontSize);
    if (!size) return;
    if (!inkCanvas) inkCanvas = document.createElement('canvas');
    var ctx = inkCanvas.getContext && inkCanvas.getContext('2d');
    if (!ctx) return;

    ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + size + 'px ' + cs.fontFamily;
    var m = ctx.measureText(text);
    var inkUp = m.actualBoundingBoxAscent;
    var inkDown = m.actualBoundingBoxDescent;
    var fontUp = m.fontBoundingBoxAscent;
    var fontDown = m.fontBoundingBoxDescent;
    // not every engine reports these — the CSS padding stays as the fallback
    if (!isFinite(inkUp) || !isFinite(inkDown) || !isFinite(fontUp) || !isFinite(fontDown)) return;

    var line = parseFloat(cs.lineHeight);
    if (!isFinite(line)) line = size * 1.2;
    var halfLeading = (line - (fontUp + fontDown)) / 2;
    var baseline = halfLeading + fontUp;              // measured from the line-box top
    var slack = size * 0.04;

    // Where the ink actually sits, relative to the line box.
    var inkTop = baseline - inkUp;
    var inkBottom = baseline + inkDown;
    // A negative inkTop means the ink pokes out above the line box, and that
    // overhang is exactly what background-clip: text would cut away.
    var padTop = Math.max(0, -inkTop) + slack;
    var padBottom = Math.max(0, inkBottom - line) + slack;

    el.style.paddingTop = padTop.toFixed(2) + 'px';
    el.style.paddingBottom = padBottom.toFixed(2) + 'px';
    el.style.marginTop = (-padTop).toFixed(2) + 'px';
    el.style.marginBottom = (-padBottom).toFixed(2) + 'px';
  }

  function fitAllGradientText() {
    qa('.hero__title-bn, .blessings__bn').forEach(fitGradientText);
  }

  /* ---------- 5. album covers + cards ------------------------------- */
  function coverFor(album) {
    var pool = album.photos.slice(0, Math.min(40, album.photos.length));
    var best = pool[0], bestDelta = Infinity;
    pool.forEach(function (photo) {
      var delta = Math.abs((photo.w / photo.h) - CONFIG.coverAspect);
      if (delta < bestDelta) { bestDelta = delta; best = photo; }
    });
    return best;
  }

  function buildAlbumCards() {
    var host = q('#albumGrid');
    if (!host || !ALBUMS.length) return;

    ALBUMS.forEach(function (album, i) {
      var cover = coverFor(album);
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'albumcard reveal';
      card.setAttribute('data-reveal', '');
      card.setAttribute('data-reveal-delay', String(i * 120));
      card.setAttribute('data-cursor', 'link');
      card.setAttribute('aria-label', 'Open the ' + album.title + ' album, ' + album.count + ' photos');
      card.innerHTML =
        '<span class="albumcard__media">' +
          '<img src="' + cover.thumb + '" alt="" loading="eager" decoding="async">' +
          '<span class="albumcard__veil"></span>' +
        '</span>' +
        '<span class="albumcard__frame"></span>' +
        '<svg class="albumcard__corner albumcard__corner--tl"><use href="#orn-corner"/></svg>' +
        '<svg class="albumcard__corner albumcard__corner--tr"><use href="#orn-corner"/></svg>' +
        '<svg class="albumcard__corner albumcard__corner--bl"><use href="#orn-corner"/></svg>' +
        '<svg class="albumcard__corner albumcard__corner--br"><use href="#orn-corner"/></svg>' +
        '<span class="albumcard__badge">' + album.count + ' Photos</span>' +
        '<span class="albumcard__body">' +
          '<p class="albumcard__kicker">আলোকচিত্র · Photographs</p>' +
          '<h3 class="albumcard__title">' + album.title + '</h3>' +
          '<p class="albumcard__bn">' + (album.id === 'bride' ? 'কনের অ্যালবাম' : 'বরের অ্যালবাম') + '</p>' +
          '<span class="albumcard__action">Open Album <i></i></span>' +
        '</span>' +
        '<span class="albumcard__count"><b>' + album.count + '</b><span>Pages</span></span>';

      card.addEventListener('click', function () { openAlbum(album.id, 0); });
      host.appendChild(card);
    });
  }

  /* ---------- 6. films ---------------------------------------------- */
  function buildFilms() {
    var host = q('#filmGrid');
    if (!host) return;

    FILMS.forEach(function (film, i) {
      var quality = film.thumb === 'hq' ? 'hqdefault' : 'maxresdefault';
      var fallbackQuality = quality === 'hqdefault' ? 'mqdefault' : 'hqdefault';
      var card = document.createElement('article');
      card.className = 'filmcard';
      card.setAttribute('data-reveal', '');
      card.setAttribute('data-reveal-delay', String((i % 3) * 110));
      card.innerHTML =
        '<div class="filmcard__stage">' +
          '<img src="https://i.ytimg.com/vi/' + film.id + '/' + quality + '.jpg" ' +
               'alt="" loading="lazy" decoding="async" data-thumb>' +
          '<button class="filmcard__play" type="button" data-cursor="link" ' +
                  'aria-label="Play ' + film.title + '">' +
            '<span class="filmcard__playicon"><svg><use href="#orn-play"/></svg></span>' +
          '</button>' +
        '</div>' +
        '<div class="filmcard__meta">' +
          '<div>' +
            '<p class="filmcard__no">' + String(i + 1).padStart(2, '0') + '</p>' +
            '<h3 class="filmcard__title">' + film.title + '</h3>' +
            '<p class="filmcard__sub">' + film.sub + '</p>' +
          '</div>' +
          '<a class="filmcard__yt" href="https://youtu.be/' + film.id + '" target="_blank" ' +
             'rel="noopener noreferrer" data-cursor="link">YouTube</a>' +
        '</div>';

      var thumb = q('[data-thumb]', card);
      // A high-resolution thumbnail does not exist for every upload, so fall back
      // rather than showing a broken frame.
      thumb.addEventListener('error', function () {
        if (thumb.dataset.fallback) return;
        thumb.dataset.fallback = '1';
        thumb.src = 'https://i.ytimg.com/vi/' + film.id + '/' + fallbackQuality + '.jpg';
      });

      q('.filmcard__play', card).addEventListener('click', function () {
        var frame = document.createElement('iframe');
        frame.src = 'https://www.youtube-nocookie.com/embed/' + film.id +
                    '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
        frame.title = film.title;
        frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        frame.allowFullscreen = true;
        frame.setAttribute('frameborder', '0');
        var stage = q('.filmcard__stage', card);
        stage.innerHTML = '';
        stage.appendChild(frame);
      });

      host.appendChild(card);
    });
  }

  /* ---------- 7. counts --------------------------------------------- */
  function countUp(el, to, duration) {
    if (REDUCED) { el.textContent = String(to); return; }
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = clamp((ts - start) / duration, 0, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * eased).toLocaleString();
      if (p < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  function buildStats() {
    var host = q('#blessingStats');
    if (!host) return;
    var photos = ALBUMS.reduce(function (sum, album) { return sum + album.count; }, 0);
    var stats = [
      { value: ALBUMS.length, label: 'Albums' },
      { value: photos, label: 'Photographs' },
      { value: FILMS.length, label: 'Wedding Films' }
    ];
    stats.forEach(function (stat) {
      var box = document.createElement('div');
      box.className = 'stat';
      box.innerHTML = '<b>0</b><span>' + stat.label + '</span>';
      host.appendChild(box);
      var number = q('b', box);
      var seen = false;
      var observer = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting || seen) return;
        seen = true;
        countUp(number, stat.value, 1400);
        observer.disconnect();
      }, { threshold: 0.4 });
      observer.observe(box);
    });
  }

  /* ---------- 8. custom cursor -------------------------------------- */
  function initCursor() {
    var toggle = q('#cursorToggle');
    var root = q('#cursor');
    if (!root) return;

    if (!FINE_POINTER) {
      if (toggle) toggle.style.display = 'none';
      return;
    }

    var ring = q('#cursorRing');
    var dot = q('#cursorDot');
    var glow = q('#cursorGlow');
    var label = q('#cursorLabel');

    var target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    var ringPos = { x: target.x, y: target.y };
    var glowPos = { x: target.x, y: target.y };
    var enabled = true;
    try { enabled = window.localStorage.getItem('wedding-cursor') !== 'off'; } catch (e) { /* ignore */ }

    function apply() {
      document.body.classList.toggle('cursor-live', enabled);
      root.style.display = enabled ? '' : 'none';
      if (toggle) toggle.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    }

    document.addEventListener('mousemove', function (event) {
      target.x = event.clientX;
      target.y = event.clientY;
      dot.style.transform = 'translate3d(' + target.x + 'px,' + target.y + 'px,0)';
      root.classList.remove('is-hidden');
    }, { passive: true });

    document.addEventListener('mouseleave', function () { root.classList.add('is-hidden'); });
    document.addEventListener('mousedown', function () { root.classList.add('is-down'); });
    document.addEventListener('mouseup', function () { root.classList.remove('is-down'); });

    document.addEventListener('mouseover', function (event) {
      var el = event.target.closest ? event.target.closest('[data-cursor], a, button') : null;
      root.classList.remove('is-link', 'is-nav');
      if (!el) { label.textContent = ''; return; }
      var kind = el.getAttribute('data-cursor');
      if (kind === 'nav') {
        root.classList.add('is-nav');
        label.textContent = el.getAttribute('data-cursor-label') || '';
      } else {
        root.classList.add('is-link');
        label.textContent = '';
      }
    });

    if (toggle) {
      toggle.addEventListener('click', function () {
        enabled = !enabled;
        try { window.localStorage.setItem('wedding-cursor', enabled ? 'on' : 'off'); } catch (e) { /* ignore */ }
        apply();
      });
    }

    function loop() {
      if (enabled && !REDUCED) {
        ringPos.x += (target.x - ringPos.x) * 0.19;
        ringPos.y += (target.y - ringPos.y) * 0.19;
        glowPos.x += (target.x - glowPos.x) * 0.06;
        glowPos.y += (target.y - glowPos.y) * 0.06;
        ring.style.transform = 'translate3d(' + ringPos.x + 'px,' + ringPos.y + 'px,0)';
        glow.style.transform = 'translate3d(' + glowPos.x + 'px,' + glowPos.y + 'px,0)';
      }
      window.requestAnimationFrame(loop);
    }

    apply();
    if (!REDUCED) window.requestAnimationFrame(loop);
  }

  /* ==================================================================
     9. the album viewer  —  Canvera-style page flip
     ================================================================== */
  var els = {};
  var state = {
    album: null,
    photos: [],
    index: 0,
    animating: false,
    isOpen: false,
    slideshow: false,
    timer: null,
    stripBuiltFor: null
  };

  function cacheEls() {
    els.viewer = q('#viewer');
    els.stage = q('#viewerStage');
    els.pageWrap = q('#pageWrap');
    els.img = q('#pageImg');
    els.lqip = q('#pageLqip');
    els.loader = q('#pageLoader');
    els.flip = q('#flip');
    els.flipImg = q('.flip__img');
    els.flipShade = q('.flip__shade');
    els.viewerAlbum = q('#viewerAlbum');
    els.viewerIndex = q('#viewerIndex');
    els.viewerTotal = q('#viewerTotal');
    els.hint = q('#viewerHint');
    els.filmstrip = q('#filmstrip');
    els.track = q('#filmstripTrack');
    els.btnClose = q('#btnClose');
    els.btnSlideshow = q('#btnSlideshow');
    els.btnFilmstrip = q('#btnFilmstrip');
    els.btnFullscreen = q('#btnFullscreen');
    els.arrowNext = q('#arrowNext');
  }

  /* An album page has one fixed shape for the whole album, so the flip geometry
     never jumps. But a 3:2 landscape print and a 2:3 portrait print want
     different pages — so pick the shape that shows this album's photos largest
     on the screen we actually have. On a wide screen that lands near 3:2, on a
     tall phone it lands near 2:3, and in both cases the rest is album mat. */
  function chooseAspect(availW, availH) {
    var photos = state.photos;
    if (!photos || !photos.length) return 1.333;
    var best = 1.333, bestArea = -1;
    for (var a = 0.72; a <= 1.5001; a += 0.02) {
      var pw = Math.min(availW, availH * a);
      var ph = pw / a;
      var sum = 0;
      for (var i = 0; i < photos.length; i++) {
        var ratio = photos[i].w / photos[i].h;
        var w = Math.min(pw, ph * ratio);
        sum += w * (w / ratio);          // area of this print inside that page
      }
      var avg = sum / photos.length;
      if (avg > bestArea) { bestArea = avg; best = a; }
    }
    return best;
  }

  /* --- sizing: fit the page into whatever space the stage has ------- */
  function fitPage() {
    if (!els.stage) return;
    var cs = window.getComputedStyle(els.stage);
    var px = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    var py = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    // On wide screens the arrows sit beside the page, so keep that space free.
    // Narrow screens move the arrows below the stage instead (see css).
    var reserve = 0;
    if (window.innerWidth > 700 && els.arrowNext) {
      reserve = (els.arrowNext.offsetWidth + 10) * 2;
    }
    var availW = Math.max(180, els.stage.clientWidth - px - reserve);
    var availH = Math.max(180, els.stage.clientHeight - py);
    var aspect = chooseAspect(availW, availH);
    els.stage.style.setProperty('--aspect', String(aspect));
    var width = Math.min(availW, availH * aspect);
    var height = width / aspect;
    els.pageWrap.style.setProperty('--pw', width.toFixed(1) + 'px');
    els.pageWrap.style.setProperty('--ph', height.toFixed(1) + 'px');
  }

  function updateChrome() {
    var total = state.photos.length;
    if (els.viewerAlbum) els.viewerAlbum.textContent = state.album ? state.album.title : '';
    if (els.viewerIndex) els.viewerIndex.textContent = String(state.index + 1);
    if (els.viewerTotal) els.viewerTotal.textContent = String(total);
    document.title = state.album
      ? 'Photo ' + (state.index + 1) + ' · ' + state.album.title + ' · শুভ বিবাহ'
      : 'শুভ বিবাহ · Our Wedding Album';

    if (state.stripBuiltFor === (state.album && state.album.id) && els.track) {
      var current = q('.filmstrip__item.is-current', els.track);
      if (current) current.classList.remove('is-current');
      var item = els.track.children[state.index];
      if (item) {
        item.classList.add('is-current');
        if (!els.filmstrip.hidden) {
          item.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
        }
      }
    }
  }

  /* --- paint a page (used after its image is decoded) --------------- */
  function applyPage(index) {
    var photo = state.photos[index];
    els.img.src = photo.src;
    els.img.alt = state.album.title + ' — photograph ' + (index + 1) + ' of ' + state.photos.length;
    els.img.classList.add('is-ready');
    els.lqip.style.backgroundImage = 'url("' + photo.lqip + '")';
    els.lqip.classList.add('is-gone');
    els.loader.classList.remove('is-on');
  }

  /* --- first paint: blur-up from the tiny placeholder --------------- */
  function paintFirst(index) {
    var photo = state.photos[index];
    els.img.classList.remove('is-ready');
    els.img.alt = state.album.title + ' — photograph ' + (index + 1) + ' of ' + state.photos.length;
    els.lqip.style.backgroundImage = 'url("' + photo.lqip + '")';
    els.lqip.classList.remove('is-gone');
    els.loader.classList.add('is-on');
    warm(photo.src).then(function () {
      if (state.photos[state.index] !== photo) return; // user moved on
      els.img.src = photo.src;
      els.img.classList.add('is-ready');
      els.lqip.classList.add('is-gone');
      els.loader.classList.remove('is-on');
    });
  }

  /* --- the flip itself --------------------------------------------- */
  function runFlip(dir) {
    return new Promise(function (resolve) {
      var sheet = els.flip;
      var shade = els.flipShade;

      if (REDUCED) { sheet.classList.remove('is-on'); resolve(); return; }

      var from = dir === 'next' ? 'rotateY(0deg)' : 'rotateY(-' + FLIP_MAX + 'deg)';
      var to = dir === 'next' ? 'rotateY(-' + FLIP_MAX + 'deg)' : 'rotateY(0deg)';

      sheet.style.transition = 'none';
      sheet.style.transform = from;
      sheet.classList.add('is-on');
      shade.className = 'flip__shade';
      void sheet.offsetWidth;

      window.requestAnimationFrame(function () {
        sheet.style.transition = 'transform ' + FLIP_DURATION + 'ms cubic-bezier(.42,.02,.28,.99)';
        sheet.style.transform = to;
        shade.classList.add('is-on');
        window.setTimeout(function () {
          shade.classList.remove('is-on');
          shade.classList.add('is-fade');
        }, FLIP_DURATION * 0.48);
        window.setTimeout(function () {
          sheet.classList.remove('is-on');
          sheet.style.transition = 'none';
          resolve();
        }, FLIP_DURATION + 40);
      });
    });
  }

  function preloadAround(index) {
    [index + 1, index + 2, index - 1, index - 2].forEach(function (offset) {
      var target = index + offset;
      if (target < 0 || target >= state.photos.length) return;
      warm(state.photos[target].src);
    });
  }

  /* --- navigate ----------------------------------------------------- */
  function goTo(target, dir) {
    var total = state.photos.length;
    if (!state.isOpen || !total || state.animating || target === state.index) return;
    var wrapped = ((target % total) + total) % total;
    var direction = dir || (wrapped > state.index ? 'next' : 'prev');

    state.animating = true;
    if (els.hint) els.hint.classList.add('is-gone');

    warm(state.photos[wrapped].src).then(function () {
      if (direction === 'next') {
        els.flipImg.style.backgroundImage = 'url("' + state.photos[state.index].src + '")';
        applyPage(wrapped);
        return runFlip('next').then(function () {
          state.index = wrapped;
          afterNav();
        });
      }
      els.flipImg.style.backgroundImage = 'url("' + state.photos[wrapped].src + '")';
      return runFlip('prev').then(function () {
        applyPage(wrapped);
        state.index = wrapped;
        afterNav();
      });
    });
  }

  function afterNav() {
    state.animating = false;
    updateChrome();
    preloadAround(state.index);
    history.replaceState(null, '', '#album/' + state.album.id + '/' + (state.index + 1));
    if (state.slideshow) scheduleSlideshow();
  }

  /* --- filmstrip ---------------------------------------------------- */
  function buildStrip() {
    if (state.stripBuiltFor === state.album.id) return;
    state.stripBuiltFor = state.album.id;
    els.track.innerHTML = '';
    var frag = document.createDocumentFragment();
    state.photos.forEach(function (photo, i) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'filmstrip__item';
      item.setAttribute('aria-label', 'Go to photograph ' + (i + 1));
      item.innerHTML = '<img src="' + photo.thumb + '" loading="lazy" decoding="async" alt="">';
      item.addEventListener('click', function () {
        if (i !== state.index) goTo(i, i > state.index ? 'next' : 'prev');
      });
      frag.appendChild(item);
    });
    els.track.appendChild(frag);
  }

  function toggleFilmstrip(force) {
    if (!state.isOpen) return;
    var open = typeof force === 'boolean' ? force : els.filmstrip.hidden;
    els.filmstrip.hidden = !open;
    els.btnFilmstrip.setAttribute('aria-pressed', open ? 'true' : 'false');
    if (open) buildStrip();
    window.requestAnimationFrame(function () {
      fitPage();
      updateChrome();
    });
  }

  /* --- slideshow ---------------------------------------------------- */
  function scheduleSlideshow() {
    clearTimeout(state.timer);
    if (!state.slideshow) return;
    state.timer = window.setTimeout(function () {
      if (!state.isOpen || state.animating) { scheduleSlideshow(); return; }
      goTo(state.index + 1, 'next');
    }, CONFIG.slideshowDelay);
  }

  function toggleSlideshow(force) {
    if (!state.isOpen) return;
    state.slideshow = typeof force === 'boolean' ? force : !state.slideshow;
    els.btnSlideshow.setAttribute('aria-pressed', state.slideshow ? 'true' : 'false');
    if (state.slideshow) { els.hint.classList.add('is-gone'); scheduleSlideshow(); }
    else clearTimeout(state.timer);
  }

  /* --- fullscreen --------------------------------------------------- */
  function toggleFullscreen() {
    var el = document.documentElement;
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) el.requestFullscreen().catch(function () { /* ignore */ });
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(function () { /* ignore */ });
    }
  }

  /* --- open / close ------------------------------------------------- */
  function openAlbum(id, index) {
    history.pushState(null, '', '#album/' + id + '/' + (index + 1));
    openViewer(id, index);
  }

  function openViewer(id, index) {
    var album = albumById(id);
    if (!album || !album.photos.length) return;

    // Already inside this album — treat as a jump rather than a reopen.
    if (state.isOpen && state.album && state.album.id === id) {
      if (index !== state.index) goTo(index, index > state.index ? 'next' : 'prev');
      return;
    }

    state.album = album;
    state.photos = album.photos;
    state.index = clamp(index, 0, album.photos.length - 1);
    state.isOpen = true;
    state.animating = false;
    state.stripBuiltFor = null;
    state.slideshow = false;
    clearTimeout(state.timer);

    els.viewerAlbum.textContent = album.title;
    els.viewerTotal.textContent = String(album.photos.length);
    els.viewerIndex.textContent = String(state.index + 1);
    els.btnSlideshow.setAttribute('aria-pressed', 'false');
    els.flip.classList.remove('is-on');
    els.flip.style.transform = 'rotateY(0deg)';
    els.viewer.hidden = false;
    document.body.classList.add('is-locked');

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { els.viewer.classList.add('is-open'); });
    });

    fitPage();
    paintFirst(state.index);
    preloadAround(state.index);
    if (!els.filmstrip.hidden) buildStrip();
    updateChrome();
    if (els.hint) els.hint.classList.remove('is-gone');
    if (state.slideshow) scheduleSlideshow();

    if (els.btnClose) els.btnClose.focus({ preventScroll: true });
  }

  function closeViewer() {
    if (!state.isOpen) return;
    state.isOpen = false;
    state.animating = false;
    state.slideshow = false;
    clearTimeout(state.timer);
    if (els.btnSlideshow) els.btnSlideshow.setAttribute('aria-pressed', 'false');
    els.viewer.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    document.title = 'শুভ বিবাহ · Our Wedding Album';
    window.setTimeout(function () {
      if (!state.isOpen) els.viewer.hidden = true;
    }, 480);
  }

  /* Closing drops the album hash so a reload returns to the site, not the
     viewer — while the back button still reopens the album you were in. */
  function dismissViewer() {
    if (hashTarget()) {
      history.pushState(null, '', window.location.pathname + window.location.search);
    }
    closeViewer();
  }

  /* --- hash routing so a page can be shared / bookmarked ------------ */
  function hashTarget() {
    var match = /^#album\/([a-z]+)(?:\/(\d+))?$/.exec(window.location.hash);
    if (!match) return null;
    return { id: match[1], index: (parseInt(match[2], 10) || 1) - 1 };
  }

  function syncFromHash() {
    var target = hashTarget();
    if (target && albumById(target.id)) openViewer(target.id, target.index);
    else closeViewer();
  }

  /* --- input -------------------------------------------------------- */
  function initViewerInput() {
    qa('[data-flip]').forEach(function (button) {
      var dir = button.getAttribute('data-flip');
      button.setAttribute('data-cursor-label', dir === 'next' ? 'Next' : 'Previous');
      button.addEventListener('click', function () {
        toggleSlideshow(state.slideshow); // resets the timer on manual nav
        goTo(state.index + (dir === 'next' ? 1 : -1), dir);
      });
    });

    if (els.btnClose) els.btnClose.addEventListener('click', dismissViewer);
    var backdrop = q('.viewer__backdrop');
    if (backdrop) backdrop.addEventListener('click', dismissViewer);
    if (els.btnSlideshow) els.btnSlideshow.addEventListener('click', function () { toggleSlideshow(); });
    if (els.btnFilmstrip) els.btnFilmstrip.addEventListener('click', function () { toggleFilmstrip(); });
    if (els.btnFullscreen) els.btnFullscreen.addEventListener('click', toggleFullscreen);

    document.addEventListener('keydown', function (event) {
      if (!state.isOpen) return;
      switch (event.key) {
        case 'Escape': dismissViewer(); break;
        case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ':
          event.preventDefault(); toggleSlideshow(state.slideshow); goTo(state.index + 1, 'next'); break;
        case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
          event.preventDefault(); toggleSlideshow(state.slideshow); goTo(state.index - 1, 'prev'); break;
        case 'Home': event.preventDefault(); goTo(0, 'prev'); break;
        case 'End': event.preventDefault(); goTo(state.photos.length - 1, 'next'); break;
        case 's': case 'S': toggleSlideshow(); break;
        case 'g': case 'G': toggleFilmstrip(); break;
        case 'v': case 'V': toggleFullscreen(); break;
        default: break;
      }
    });

    // swipe
    var touchX = 0, touchY = 0, tracking = false;
    els.stage.addEventListener('touchstart', function (event) {
      var t = event.changedTouches[0];
      touchX = t.clientX; touchY = t.clientY; tracking = true;
    }, { passive: true });
    els.stage.addEventListener('touchend', function (event) {
      if (!tracking) return;
      tracking = false;
      var t = event.changedTouches[0];
      var dx = t.clientX - touchX;
      var dy = t.clientY - touchY;
      if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;
      toggleSlideshow(state.slideshow);
      goTo(state.index + (dx < 0 ? 1 : -1), dx < 0 ? 'next' : 'prev');
    }, { passive: true });

    // keep the page size correct when the stage resizes (filmstrip open, rotate…)
    if ('ResizeObserver' in window) {
      new ResizeObserver(function () { if (state.isOpen) fitPage(); }).observe(els.stage);
    } else {
      window.addEventListener('resize', function () { if (state.isOpen) fitPage(); });
    }
  }

  /* ---------- 10. mobile menu --------------------------------------- */
  function initNavMenu() {
    var burger = q('#navBurger');
    var menu = q('#navMenu');
    if (!burger || !menu) return;

    function setOpen(open) {
      menu.hidden = !open;
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }

    burger.addEventListener('click', function () { setOpen(menu.hidden); });
    qa('a', menu).forEach(function (link) {
      link.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !menu.hidden) setOpen(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 860) setOpen(false);
    });
  }

  /* ---------- 11. boot --------------------------------------------- */
  function boot() {
    cacheEls();
    buildPetals();
    buildAlbumCards();
    buildFilms();
    buildStats();
    initReveal();
    initNavHeight();
    fitAllGradientText();
    // metrics are only trustworthy once the webfont has actually landed
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fitAllGradientText).catch(function () { /* ignore */ });
    }
    var fitTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(fitTimer);
      fitTimer = setTimeout(fitAllGradientText, 140);
    });
    initScroll();
    initCursor();
    initNavMenu();
    if (els.viewer) {
      initViewerInput();
      window.addEventListener('hashchange', syncFromHash);
      window.addEventListener('popstate', syncFromHash);
      var initial = hashTarget();
      if (initial && albumById(initial.id)) openViewer(initial.id, initial.index);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

/* SNOWJI 2027 — the skier from the SNOWJI 2025 hero photo rides a trail down the page as you scroll.
   The trail is rebuilt from each section's .lane (CSS decides where lanes sit), so it adapts to any layout. */
(() => {
  'use strict';

  // Where the skier sits in the hero photo (fractions of the photo), and where their skis touch the snow
  // (fractions of the sprite). Generated alongside assets/img/skier.webp from Snowji-Hero-56.jpg.
  const PHOTO = { w: 5152, h: 7728 };
  const SKIER = { x: 0.44255, y: 0.43129, w: 0.18595, h: 0.15075 };
  const ANCHOR = { x: 0.5637, y: 0.8918 };
  const HEAD = Math.atan2(0.2, -1);           // the photo skier is carving to the left, slightly downhill
  const NATIVE = -1;                           // -1: sprite faces left as shot

  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const mountain = document.querySelector('.mountain');
  if (!mountain) return;
  const svg = mountain.querySelector('.trail');
  const [groove, trackA, trackB] = svg.querySelectorAll('path');
  const rider = mountain.querySelector('.rider');
  const riderImg = rider.querySelector('img');
  const hero = mountain.querySelector('.hero');
  const heroPhoto = hero.querySelector('.hero-photo');
  const heroFull = hero.querySelector('.hero-full');
  const heroClean = hero.querySelector('.hero-clean');
  const runs = [...mountain.querySelectorAll('.run')];
  const finish = mountain.querySelector('.finish');
  const finishPoint = mountain.querySelector('.finish-point');
  const gates = [...mountain.querySelectorAll('.gate')].map((el) => ({ el, y: 0, passed: false }));
  const canvas = document.querySelector('.powder');
  const ctx = canvas.getContext('2d');
  const nav = document.getElementById('nav');

  let X = new Float32Array(0), Y = X, YM = X, L = X, total = 0;
  let S = { x: 0, y: 0 }, F = { x: 0, y: 0 };
  let riderW = 0, riderH = 0, mainTop = 0, heroLen = 1, laneScale = 1;
  let cur = 0, target = 0, dir = NATIVE, flipVis = 1, rot = 0;
  let ready = false, running = false, arrived = false, last = 0;
  let particles = [];
  let dpr = 1;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const smoothstep = (t) => t * t * (3 - 2 * t);
  const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const reduced = () => reduceMQ.matches;

  function rel(el) {
    const r = el.getBoundingClientRect();
    const m = mountain.getBoundingClientRect();
    return { x: r.left - m.left, y: r.top - m.top, w: r.width, h: r.height };
  }

  // Where the photo's skier is drawn, given object-fit: cover and the image's object-position
  function skierRect() {
    const box = rel(heroFull);
    const scale = Math.max(box.w / PHOTO.w, box.h / PHOTO.h);
    const dw = PHOTO.w * scale, dh = PHOTO.h * scale;
    const pos = getComputedStyle(heroFull).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
    const ox = box.x + (box.w - dw) * (isNaN(pos[0]) ? 0.5 : pos[0]);
    const oy = box.y + (box.h - dh) * (isNaN(pos[1]) ? 0.5 : pos[1]);
    return { x: ox + SKIER.x * dw, y: oy + SKIER.y * dh, w: SKIER.w * dw, h: SKIER.h * dh };
  }

  /* ── Path ─────────────────────────────────────────── */
  function build() {
    const sr = skierRect();
    if (!sr.w) return;
    const keepY = ready ? pointAt(cur).y : null;

    mainTop = mountain.getBoundingClientRect().top + scrollY;
    riderW = sr.w; riderH = sr.h;
    rider.style.width = riderW + 'px';
    S = { x: sr.x + sr.w * ANCHOR.x, y: sr.y + sr.h * ANCHOR.y };

    const W = mountain.clientWidth;
    const xs = [S.x], ys = [S.y];
    const cubic = (p0, p1, p2, p3) => {
      const est = Math.hypot(p1.x - p0.x, p1.y - p0.y) + Math.hypot(p2.x - p1.x, p2.y - p1.y) + Math.hypot(p3.x - p2.x, p3.y - p2.y);
      const n = Math.max(16, Math.ceil(est / 3));
      for (let i = 1; i <= n; i++) {
        const t = i / n, u = 1 - t;
        const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
        xs.push(a * p0.x + b * p1.x + c * p2.x + d * p3.x);
        ys.push(a * p0.y + b * p1.y + c * p2.y + d * p3.y);
      }
    };

    let prev = S, first = true, firstLaneW = 0, heroEnd = 0;
    runs.forEach((run, i) => {
      const laneEl = run.querySelector(':scope > .lane');
      if (!laneEl) return;
      const r = rel(laneEl);
      const edge = riderW * laneScaleFor(r.w) * 0.72;
      const x = clamp(r.x + r.w / 2, edge, W - edge);
      const top = Math.max(r.y, prev.y + (first ? 160 : 60));
      const bottom = Math.max(r.y + r.h, top + 120);
      const g = top - prev.y;
      if (first) {
        // leave the photo the way the skier is already heading
        const dx = x - prev.x;
        cubic(prev, { x: prev.x + Math.sign(dx) * Math.min(Math.abs(dx) * 0.55, 300), y: prev.y + g * 0.3 }, { x, y: top - g * 0.42 }, { x, y: top });
        heroEnd = xs.length - 1;
        firstLaneW = r.w;
        first = false;
      } else {
        cubic(prev, { x: prev.x, y: prev.y + g * 0.56 }, { x, y: top - g * 0.56 }, { x, y: top });
      }
      const h = bottom - top;
      const waves = Math.max(2, Math.round(h / 430));
      const amp = Math.min(r.w * 0.16, 34) * (i % 2 ? -1 : 1);
      const n = Math.ceil(h / 3);
      for (let k = 1; k <= n; k++) {
        const t = k / n;
        xs.push(clamp(x + amp * Math.sin(Math.PI * waves * t) * Math.sin(Math.PI * t), edge, W - edge));
        ys.push(top + h * t);
      }
      prev = { x, y: bottom };
    });

    const fr = rel(finishPoint);
    F = { x: fr.x, y: Math.max(fr.y, prev.y + 80) };
    const g = F.y - prev.y;
    cubic(prev, { x: prev.x, y: prev.y + g * 0.5 }, { x: F.x, y: F.y - g * 0.5 }, F);

    const N = xs.length;
    X = Float32Array.from(xs);
    Y = Float32Array.from(ys);
    YM = new Float32Array(N);
    L = new Float32Array(N);
    let acc = 0, maxY = -Infinity;
    for (let i = 0; i < N; i++) {
      maxY = Math.max(maxY, Y[i]);
      YM[i] = maxY;
      if (i) acc += Math.hypot(X[i] - X[i - 1], Y[i] - Y[i - 1]);
      L[i] = acc;
    }
    total = acc;
    heroLen = Math.max(1, L[heroEnd] || 1);
    laneScale = laneScaleFor(firstLaneW);

    const off = W < 641 ? 2.4 : 4;
    let dC = '', dA = '', dB = '';
    for (let i = 0; i < N; i++) {
      const i0 = Math.max(0, i - 2), i1 = Math.min(N - 1, i + 2);
      let tx = X[i1] - X[i0], ty = Y[i1] - Y[i0];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl; ty /= tl;
      const c = i ? 'L' : 'M';
      dC += c + X[i].toFixed(1) + ' ' + Y[i].toFixed(1);
      dA += c + (X[i] - ty * off).toFixed(1) + ' ' + (Y[i] + tx * off).toFixed(1);
      dB += c + (X[i] + ty * off).toFixed(1) + ' ' + (Y[i] - tx * off).toFixed(1);
    }
    groove.setAttribute('d', dC);
    trackA.setAttribute('d', dA);
    trackB.setAttribute('d', dB);
    for (const p of [groove, trackA, trackB]) {
      p.setAttribute('pathLength', total.toFixed(1));
      p.style.strokeDasharray = `${total.toFixed(1)} ${(total + 20).toFixed(1)}`;
    }

    gates.forEach((gt) => { const r = rel(gt.el); gt.y = r.y + r.h * 0.6; });

    target = targetLen();
    cur = keepY == null ? target : clamp(lenAtY(keepY), 0, total);
    paint(0);
  }

  // Shrink the rider from photo size to something that fits the lanes
  function laneScaleFor(laneW) {
    if (!riderW || !laneW) return 1;
    return Math.min(1, (laneW * 0.85) / riderW, 150 / riderH);
  }

  function lenAtY(y) {
    if (y <= YM[0]) return 0;
    let lo = 0, hi = YM.length - 1;
    if (y >= YM[hi]) return total;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (YM[mid] < y) lo = mid; else hi = mid; }
    const span = YM[hi] - YM[lo];
    const f = span > 0 ? (y - YM[lo]) / span : 1;
    return L[lo] + (L[hi] - L[lo]) * f;
  }

  function pointAt(len) {
    if (!total) return { x: S.x, y: S.y };
    len = clamp(len, 0, total);
    let lo = 0, hi = L.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (L[mid] < len) lo = mid; else hi = mid; }
    const span = L[hi] - L[lo];
    const f = span > 0 ? (len - L[lo]) / span : 0;
    return { x: X[lo] + (X[hi] - X[lo]) * f, y: Y[lo] + (Y[hi] - Y[lo]) * f };
  }

  // Scroll position -> point on the trail. At the very top the skier sits exactly where the photo has them.
  function targetLen() {
    const vh = innerHeight;
    const s = scrollY;
    const startVy = S.y + mainTop;
    let anchor = startVy + (vh * 0.55 - startVy) * easeOut(clamp(s / (vh * 0.9), 0, 1));
    const maxS = Math.max(1, document.documentElement.scrollHeight - vh);
    const need = F.y + mainTop - maxS;
    if (need > anchor) anchor += (need - anchor) * clamp(1 - (maxS - s) / vh, 0, 1);
    return lenAtY(clamp(s - mainTop + anchor, S.y, F.y));
  }

  /* ── Rendering ────────────────────────────────────── */
  function paint(dt) {
    const prev = cur;
    if (dt > 0) {
      const k = reduced() ? 1 : 1 - Math.exp(-dt / 110);
      cur += (target - cur) * k;
      if (Math.abs(target - cur) < 0.4) cur = target;
    }
    const p = pointAt(cur);
    const a = pointAt(cur - 12), b = pointAt(cur + 12);
    const tx = b.x - a.x, ty = b.y - a.y;
    if (cur > 2) { if (tx > 4) dir = 1; else if (tx < -4) dir = -1; }

    const smooth = (tau) => (reduced() || dt === 0 ? 1 : 1 - Math.exp(-dt / tau));
    const flip = dir === NATIVE ? 1 : -1;
    flipVis += (flip - flipVis) * smooth(90);
    const head = dir === NATIVE ? HEAD : Math.PI - HEAD;
    const want = clamp(angleDiff(Math.atan2(ty, tx), head) * 0.35, -0.26, 0.26) * clamp(cur / 160, 0, 1);
    rot += (want - rot) * smooth(120);
    const sx = Math.sign(flipVis || 1) * Math.max(Math.abs(flipVis), 0.14);
    const scale = 1 + (laneScale - 1) * smoothstep(clamp(cur / heroLen, 0, 1));

    rider.style.transform = `translate3d(${(p.x - riderW * ANCHOR.x).toFixed(2)}px, ${(p.y - riderH * ANCHOR.y).toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
    riderImg.style.transform = `rotate(${rot.toFixed(4)}rad) scaleX(${sx.toFixed(3)})`;

    const dash = (total - cur).toFixed(1);
    groove.style.strokeDashoffset = dash;
    trackA.style.strokeDashoffset = dash;
    trackB.style.strokeDashoffset = dash;

    for (const gt of gates) {
      const passed = p.y >= gt.y;
      if (passed !== gt.passed) { gt.passed = passed; gt.el.classList.toggle('passed', passed); }
    }

    if (dt > 0 && !reduced()) {
      const speed = Math.abs(cur - prev) / dt * 1000;
      if (speed > 90) emit(p, tx, ty, speed, scale);
    }

    const atEnd = total > 0 && cur >= total - 1.5;
    if (atEnd && !arrived) {
      arrived = true;
      finish.classList.remove('arrived'); void finish.offsetWidth; finish.classList.add('arrived');
      if (!reduced()) burst(p);
    } else if (!atEnd && cur < total - 60) {
      arrived = false;
    }
  }

  /* ── Powder ───────────────────────────────────────── */
  function emit(p, tx, ty, speed, scale) {
    const tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl;
    const n = Math.min(5, Math.floor(speed / 300) + (Math.random() < 0.55 ? 1 : 0));
    for (let i = 0; i < n; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const v = (40 + Math.random() * 110) * Math.max(scale, 0.6);
      particles.push({
        x: p.x + (Math.random() - 0.5) * 10, y: p.y + (Math.random() - 0.5) * 6,
        vx: (-ux * 0.4 - uy * side * (0.6 + Math.random())) * v,
        vy: (-uy * 0.4 + ux * side * (0.6 + Math.random())) * v - 25,
        r: 1 + Math.random() * 2.4, life: 0, max: 0.45 + Math.random() * 0.7,
      });
    }
    if (particles.length > 280) particles.splice(0, particles.length - 280);
  }

  function burst(p) {
    for (let i = 0; i < 70; i++) {
      const side = i % 2 ? -1 : 1;
      const v = 80 + Math.random() * 260;
      particles.push({
        x: p.x + side * Math.random() * 14, y: p.y - Math.random() * 6,
        vx: side * v * (0.6 + Math.random() * 0.6), vy: -v * (0.15 + Math.random() * 0.45),
        r: 1 + Math.random() * 3, life: 0, max: 0.6 + Math.random() * 0.8,
      });
    }
  }

  function sizeCanvas() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
  }

  function drawPowder(dt) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!particles.length) return;
    const m = mountain.getBoundingClientRect();
    const s = dt / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, m.left * dpr, m.top * dpr);
    particles = particles.filter((q) => (q.life += s) < q.max);
    for (const q of particles) {
      q.vx *= 0.95; q.vy = q.vy * 0.95 + 70 * s;
      q.x += q.vx * s; q.y += q.vy * s;
      const a = 1 - q.life / q.max;
      ctx.fillStyle = `rgba(140, 160, 186, ${(0.5 * a).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.r * (0.7 + 0.5 * (1 - a)), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ── Loop ─────────────────────────────────────────── */
  function frame(now) {
    const dt = Math.min(48, now - last || 16);
    last = now;
    target = targetLen();
    paint(dt);
    drawPowder(dt);
    if (Math.abs(target - cur) > 0.4 || particles.length) requestAnimationFrame(frame);
    else running = false;
  }

  function kick() {
    if (!ready || running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  let rebuildRaf = 0;
  function scheduleBuild() {
    cancelAnimationFrame(rebuildRaf);
    rebuildRaf = requestAnimationFrame(() => { build(); kick(); });
  }

  /* ── Nav ─────────────────────────────────────────── */
  let finishInView = false;
  function chrome() {
    nav.classList.toggle('scrolled', scrollY > 60);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { finishInView = e.isIntersecting; chrome(); }, { threshold: 0.15 }).observe(finish);
  }

  /* ── Init: swap the photo for the skier-free version once the cut-out is ready ── */
  function whenLoaded(img) {
    const loaded = img.complete && img.naturalWidth ? Promise.resolve()
      : new Promise((res) => { img.addEventListener('load', res, { once: true }); img.addEventListener('error', res, { once: true }); });
    // decode() makes sure the swap happens only once the new image can actually be painted
    return loaded.then(() => (img.decode ? img.decode().catch(() => {}) : null));
  }
  Promise.all([whenLoaded(heroFull), whenLoaded(heroClean), whenLoaded(riderImg)]).then(() => {
    build();
    if (!total) return;
    ready = true;
    rider.style.visibility = 'visible';
    heroPhoto.classList.add('handed-off');
    kick();
  });

  sizeCanvas();
  chrome();
  addEventListener('scroll', () => { chrome(); kick(); }, { passive: true });
  addEventListener('resize', () => { sizeCanvas(); chrome(); scheduleBuild(); });
  if ('ResizeObserver' in window) new ResizeObserver(scheduleBuild).observe(mountain);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleBuild);
  reduceMQ.addEventListener?.('change', scheduleBuild);
})();

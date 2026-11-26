(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('sakura');
  const ctx = canvas.getContext('2d');

  let W, H, treeCache, petals;
  let wind = 0, windTarget = 0, windTimer = 0;
  let rafId;

  /* ── Tree ── */

  const TRUNK_COLORS = ['#4a2510', '#5c3014', '#7a3c18', '#8b4513', '#a0522d'];

  function branch(c, x, y, len, ang, depth) {
    if (depth === 0) return;

    const ex = x + Math.cos(ang) * len;
    const ey = y + Math.sin(ang) * len;

    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(ex, ey);
    c.strokeStyle = depth > 4 ? TRUNK_COLORS[0] : depth > 3 ? TRUNK_COLORS[1] : depth > 2 ? TRUNK_COLORS[2] : TRUNK_COLORS[3];
    c.lineWidth = depth > 1 ? depth * 1.4 : 1;
    c.lineCap = 'round';
    c.stroke();

    if (depth <= 2) {
      const pinks = ['#ffb7c5', '#ff8fa3', '#fce4ec', '#f48fb1', '#ffd6e0', '#ff99aa', '#ffb3c6', '#ffc0cb'];
      const count = (8 + Math.random() * 9) | 0;
      for (let i = 0; i < count; i++) {
        const bx = ex + (Math.random() - 0.5) * 26;
        const by = ey + (Math.random() - 0.5) * 26;
        const bs = 4.5 + Math.random() * 7;
        c.beginPath();
        c.arc(bx, by, bs, 0, Math.PI * 2);
        c.fillStyle = pinks[(Math.random() * pinks.length) | 0];
        c.globalAlpha = 0.62 + Math.random() * 0.38;
        c.fill();
        c.globalAlpha = 1;
      }
    }

    const spread = 0.26 + Math.random() * 0.18;
    branch(c, ex, ey, len * 0.72, ang - spread, depth - 1);
    branch(c, ex, ey, len * 0.68, ang + spread * 0.88, depth - 1);
    if (depth > 3 && Math.random() > 0.5) {
      branch(c, ex, ey, len * 0.58, ang - 0.07, depth - 2);
    }
  }

  function buildTree() {
    treeCache = document.createElement('canvas');
    treeCache.width = W;
    treeCache.height = H;
    const tc = treeCache.getContext('2d');
    const baseLen = Math.min(W * 0.26, H * 0.19);
    branch(tc, W * 0.5, H * 0.95, baseLen, -Math.PI / 2, 7);
  }

  /* ── Petals ── */

  const PETAL_COLORS = ['#FFB7C5', '#FF8FA3', '#FFC5D0', '#F4869A', '#FFD6E0', '#FFAABB', '#FF9EB5', '#FFCCD5'];

  function makePetal(spread) {
    const w = 4.5 + Math.random() * 5.5;
    const op = 0.48 + Math.random() * 0.52;
    return {
      x: Math.random() * W,
      y: spread ? Math.random() * H : -14,
      w,
      h: w * (0.36 + Math.random() * 0.3),
      vx: (Math.random() - 0.5) * 1.2,
      vy: 0.42 + Math.random() * 1.5,
      a: Math.random() * Math.PI * 2,
      va: (Math.random() - 0.5) * 0.08,
      sw: Math.random() * Math.PI * 2,
      ss: 0.011 + Math.random() * 0.03,
      sa: 0.25 + Math.random() * 1.15,
      op,
      c: PETAL_COLORS[(Math.random() * PETAL_COLORS.length) | 0],
      sc: op > 0.85 ? 1.45 : op > 0.68 ? 1.0 : 0.65,
    };
  }

  function resetPetal(p) {
    Object.assign(p, makePetal(false));
  }

  function tickPetal(p) {
    p.sw += p.ss;
    p.x += p.vx + Math.sin(p.sw) * p.sa + wind * 0.45;
    p.y += p.vy;
    p.a += p.va;
    if (p.y > H + 18 || p.x < -32 || p.x > W + 32) resetPetal(p);
  }

  function drawPetal(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.a);
    ctx.globalAlpha = p.op;

    ctx.beginPath();
    ctx.ellipse(0, 0, p.w * p.sc, p.h * p.sc, 0, 0, Math.PI * 2);
    ctx.fillStyle = p.c;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(-p.w * 0.14, -p.h * 0.26, p.w * 0.32 * p.sc, p.h * 0.3 * p.sc, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fill();

    ctx.restore();
  }

  function initPetals() {
    const count = Math.min(220, Math.max(80, (W / 7) | 0));
    petals = [];
    for (let i = 0; i < count; i++) {
      petals.push(makePetal(i < count * 0.6));
    }
  }

  /* ── Sky & Ground ── */

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#f5c6d8');
    g.addColorStop(0.35, '#fdeaf2');
    g.addColorStop(0.72, '#fff6f8');
    g.addColorStop(1, '#ffe8d6');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const sx = W * 0.78, sy = H * 0.13, sr = Math.min(W, H) * 0.065;
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe4ee';
    ctx.fill();
    ctx.globalAlpha = 0.1;
    ctx.beginPath();
    ctx.arc(sx, sy, sr * 1.42, 0, Math.PI * 2);
    ctx.fillStyle = '#ffb7d5';
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawGround() {
    const gy = H - Math.round(H * 0.1);
    ctx.fillStyle = '#cceea8';
    ctx.fillRect(0, gy, W, H - gy);
    ctx.fillStyle = '#b8e090';
    ctx.fillRect(0, gy - 4, W, 5);

    const step = 10;
    const bladeH = Math.round(H * 0.022);
    for (let i = -4; i < W + 4; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, gy - 2);
      ctx.quadraticCurveTo(i + step * 0.35, gy - bladeH, i + step * 0.8, gy - 2);
      ctx.fillStyle = i % 20 === 0 ? '#8cc470' : '#a8d884';
      ctx.fill();
    }
  }

  /* ── Loop ── */

  function frame() {
    windTimer++;
    if (windTimer > 220) {
      windTarget = (Math.random() - 0.5) * 1.8;
      windTimer = 0;
    }
    wind += (windTarget - wind) * 0.009;

    drawSky();
    if (treeCache) ctx.drawImage(treeCache, 0, 0);
    drawGround();
    for (let i = 0; i < petals.length; i++) {
      tickPetal(petals[i]);
      drawPetal(petals[i]);
    }

    rafId = requestAnimationFrame(frame);
  }

  /* ── Resize ── */

  let resizeTimer;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      cancelAnimationFrame(rafId);
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      buildTree();
      initPetals();
      frame();
    }, 150);
  }

  window.addEventListener('resize', onResize);

  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
  buildTree();
  initPetals();
  frame();
})();

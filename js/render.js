const BACKGROUND = "#1a1c2c";
const FUR = "#f4f4f4";
const STRIPE = "#566c86";
const BELLY = "#f4f4f4";
const NOSE = "#b13e53";
const OUTLINE = "#333c57";
const EYE = "#1a1c2c";
const PILE_LIGHT = "#f4f4f4";
const PILE_SHADOW = "#94b0c2";
const GRID = "#73eff7";

const CAT_X = 144;
const CAT_Y = 40;

const BACKGROUND_IMAGES = {
  room: preloadBackground("images/bg/room2.png"),
  road: preloadBackground("images/bg/road.png"),
  mountain: preloadBackground("images/bg/mountain.png"),
  island: preloadBackground("images/bg/island.png"),
  earth: preloadBackground("images/bg/earth.png"),
  asteroid: preloadBackground("images/bg/xiaoxingxing.png"),
  cluster: preloadBackground("images/bg/chaoxingxi.png"),
  space: preloadBackground("images/bg/space.png")
};

function preloadBackground(src) {
  const img = new Image();
  img.src = src;
  return img;
}

function backgroundImage(layers) {
  if (layers < 25) {
    return BACKGROUND_IMAGES.room;
  }
  if (layers < 35) {
    return BACKGROUND_IMAGES.road;
  }
  if (layers < 53) {
    return BACKGROUND_IMAGES.mountain;
  }
  if (layers < 60) {
    return BACKGROUND_IMAGES.island;
  }
  if (layers < 75) {
    return BACKGROUND_IMAGES.asteroid;
  }
  if (layers < 141) {
    return BACKGROUND_IMAGES.earth;
  }
  if (layers < 181) {
    return BACKGROUND_IMAGES.cluster;
  }
  return BACKGROUND_IMAGES.space;
}

function drawBackground(view, layers) {
  view.clear(BACKGROUND);
  const img = backgroundImage(layers);
  if (!img.complete || img.naturalWidth === 0) {
    return;
  }
  const ctx = view.ctx;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, 320, 180);
}

export class PixelRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
  }

  clear(color) {
    this.ctx.imageSmoothingEnabled = false;
    this.rect(0, 0, this.canvas.width, this.canvas.height, color);
  }

  rect(x, y, w, h, color) {
    const left = Math.floor(x);
    const top = Math.floor(y);
    const width = Math.floor(w);
    const height = Math.floor(h);
    if (width <= 0 || height <= 0) {
      return;
    }
    this.ctx.fillStyle = color;
    this.ctx.fillRect(left, top, width, height);
  }
}

function roundBox(view, x, y, w, h, fill) {
  view.rect(x + 2, y, w - 4, 1, OUTLINE);
  view.rect(x + 1, y + 1, w - 2, 1, OUTLINE);
  view.rect(x, y + 2, 1, h - 4, OUTLINE);
  view.rect(x + w - 1, y + 2, 1, h - 4, OUTLINE);
  view.rect(x + 1, y + h - 2, w - 2, 1, OUTLINE);
  view.rect(x + 2, y + h - 1, w - 4, 1, OUTLINE);
  view.rect(x + 2, y + 1, w - 4, 1, fill);
  view.rect(x + 1, y + 2, w - 2, h - 4, fill);
  view.rect(x + 2, y + h - 2, w - 4, 1, fill);
}

function drawEar(view, ox, oy, earX) {
  const x = ox + earX;
  const y = oy;
  view.rect(x + 1, y, 2, 1, OUTLINE);
  view.rect(x, y + 1, 4, 1, OUTLINE);
  view.rect(x, y + 2, 4, 1, OUTLINE);
  view.rect(x, y + 3, 4, 1, OUTLINE);
  view.rect(x + 1, y + 1, 2, 1, FUR);
  view.rect(x + 1, y + 2, 2, 1, NOSE);
  view.rect(x + 1, y + 3, 2, 1, NOSE);
}

function drawTail(view, ox, oy, sway) {
  const chunks = [
    [26, 22, 4, 6],
    [28, 17, 4, 7],
    [29 + sway, 12, 3, 6]
  ];
  for (let i = 0; i < chunks.length; i++) {
    const x = ox + chunks[i][0];
    const y = oy + chunks[i][1];
    const w = chunks[i][2];
    const h = chunks[i][3];
    view.rect(x - 1, y, 1, h, OUTLINE);
    view.rect(x + w, y, 1, h, OUTLINE);
    view.rect(x, y - 1, w, 1, OUTLINE);
    view.rect(x, y + h, w, 1, OUTLINE);
  }
  for (let i = 0; i < chunks.length; i++) {
    view.rect(ox + chunks[i][0], oy + chunks[i][1], chunks[i][2], chunks[i][3], FUR);
  }
}

function drawEnjoyEyes(view, x, y) {
  view.rect(x + 10, y + 6, 2, 1, EYE);
  view.rect(x + 9, y + 7, 1, 1, EYE);
  view.rect(x + 12, y + 7, 1, 1, EYE);
  view.rect(x + 20, y + 6, 2, 1, EYE);
  view.rect(x + 19, y + 7, 1, 1, EYE);
  view.rect(x + 22, y + 7, 1, 1, EYE);
}

function drawEyes(view, x, y, state, blinking) {
  if (blinking) {
    return;
  }
  if (state === "gaze") {
    view.rect(x + 10, y + 6, 2, 2, EYE);
    view.rect(x + 20, y + 6, 2, 2, EYE);
    return;
  }
  if (state === "enjoy") {
    drawEnjoyEyes(view, x, y);
    return;
  }
  view.rect(x + 9, y + 7, 4, 1, EYE);
  view.rect(x + 19, y + 7, 4, 1, EYE);
}

function drawCat(view, time, state, blinking) {
  const breath = state === "gaze" ? 0 : Math.round(Math.sin(time * 0.005));
  const tailSpeed = state === "warning" ? 0.015 : 0.003;
  const sway = Math.round(Math.sin(time * tailSpeed) * 2);
  const earDrop = state === "warning" ? 1 : 0;
  const x = CAT_X;
  const y = CAT_Y + breath;
  drawTail(view, x, y, sway);
  roundBox(view, x + 6, y + 14, 20, 16, FUR);
  view.rect(x + 8, y + 17, 16, 2, STRIPE);
  view.rect(x + 8, y + 22, 16, 2, STRIPE);
  roundBox(view, x + 10, y + 21, 12, 7, BELLY);
  roundBox(view, x + 8, y + 2, 16, 12, FUR);
  view.rect(x + 11, y + 4, 1, 4, STRIPE);
  view.rect(x + 15, y + 4, 1, 4, STRIPE);
  view.rect(x + 19, y + 4, 1, 4, STRIPE);
  roundBox(view, x + 11, y + 8, 10, 5, BELLY);
  view.rect(x + 15, y + 10, 2, 1, NOSE);
  drawEyes(view, x, y, state, blinking);
  drawEar(view, x, y + earDrop, 8);
  drawEar(view, x, y + earDrop, 20);
}

function cloud(view, x, y, w, h, color) {
  const cut = Math.max(2, Math.min(10, Math.round(Math.min(w, h) * 0.28)));
  view.rect(x + cut, y, Math.max(1, w - cut * 2), h, color);
  view.rect(x + Math.floor(cut / 2), y + Math.floor(cut / 2), Math.max(1, w - cut), Math.max(1, h - cut), color);
  view.rect(x, y + cut, w, Math.max(1, h - cut), color);
}

function drawPile(view, layers) {
  const growth = Math.min(Math.max(layers, 0) / 50, 1);
  const width = Math.round(40 + growth * 216);
  const height = Math.round(18 + growth * 40);
  const x = Math.round((320 - width) / 2);
  const y = 180 - height;

  function puff(align, fy, fw, fh, color) {
    const puffWidth = Math.max(10, Math.round(width * fw));
    const puffHeight = Math.max(8, Math.round(height * fh));
    const puffX = x + Math.round((width - puffWidth) * align);
    const puffY = y + Math.round((height - puffHeight) * fy);
    cloud(view, puffX, puffY, puffWidth, puffHeight, color);
  }

  puff(0.5, 1, 1, 0.62, PILE_SHADOW);
  puff(0.5, 1, 0.9, 0.74, PILE_LIGHT);
  if (growth >= 0.25) {
    puff(0, 0.9, 0.42, 0.5, PILE_LIGHT);
    puff(1, 0.86, 0.36, 0.48, PILE_LIGHT);
  }
  puff(0.5, 0, 0.4, 0.58, PILE_LIGHT);
  if (growth >= 0.55) {
    puff(0.22, 0.2, 0.26, 0.42, PILE_LIGHT);
    puff(0.74, 0.24, 0.24, 0.4, PILE_LIGHT);
    view.rect(x + Math.round(width * 0.18), y + Math.round(height * 0.3), 2, 2, PILE_SHADOW);
    view.rect(x + Math.round(width * 0.7), y + Math.round(height * 0.42), 2, 1, PILE_SHADOW);
  }
}

function drawGrid(view) {
  for (let x = 0; x < 320; x += 16) {
    view.rect(x, 0, 1, 180, GRID);
  }
  for (let y = 0; y < 180; y += 16) {
    view.rect(0, y, 320, 1, GRID);
  }
}

function laterBlink(now) {
  return now + 2000 + Math.random() * 3000;
}

const COTTON = "#f4f4f4";
const COTTON_SHADOW = "#94b0c2";
const COTTON_LIFE = 600;
const COTTON_LAYERS = 191;
const COTTON_MAX_SIZE = 8;

export function createRenderer(canvas) {
  const view = new PixelRenderer(canvas);
  const cotton = [];
  let blinking = false;
  let blinkUntil = 0;
  let nextBlinkTime = 0;
  let lastCottonAt = 0;

  function burst(count, layers) {
    const growth = Math.min(Math.max(layers || 0, 0), COTTON_LAYERS) / COTTON_LAYERS;
    const small = Math.max(1, Math.round(1 + growth * 3));
    const big = Math.max(2, Math.round(2 + growth * (COTTON_MAX_SIZE - 2)));
    const amount = Math.max(3, Math.min(5, count));
    const now = performance.now();
    const life = COTTON_LIFE + growth * 300;
    for (let i = 0; i < amount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (36 + Math.random() * 48) * (1 + growth);
      const size = Math.random() < 0.5 ? small : big;
      cotton.push({
        x: CAT_X + 8 + Math.random() * 16,
        y: CAT_Y + 10 + Math.random() * 18,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 16 - growth * 24,
        size: size,
        life: life,
        born: now
      });
    }
  }

  function drawCotton(now) {
    if (lastCottonAt === 0) {
      lastCottonAt = now;
    }
    const dt = Math.min(0.05, (now - lastCottonAt) / 1000);
    lastCottonAt = now;
    const ctx = view.ctx;
    for (let i = cotton.length - 1; i >= 0; i--) {
      const fleck = cotton[i];
      const life = fleck.life || COTTON_LIFE;
      const age = now - fleck.born;
      if (age >= life) {
        cotton.splice(i, 1);
        continue;
      }
      fleck.vy += 80 * dt;
      fleck.x += fleck.vx * dt;
      fleck.y += fleck.vy * dt;
      const fade = 1 - age / life;
      ctx.globalAlpha = fade > 0.66 ? 1 : fade > 0.33 ? 0.55 : 0.28;
      if (fleck.size > 2) {
        view.rect(fleck.x + 1, fleck.y + 1, fleck.size, fleck.size, COTTON_SHADOW);
      }
      view.rect(fleck.x, fleck.y, fleck.size, fleck.size, COTTON);
    }
    ctx.globalAlpha = 1;
  }

  function updateBlink(now) {
    if (nextBlinkTime === 0) {
      nextBlinkTime = laterBlink(now);
    }
    if (blinking) {
      if (now >= blinkUntil) {
        blinking = false;
        nextBlinkTime = laterBlink(now);
      }
      return;
    }
    if (now >= nextBlinkTime) {
      blinking = true;
      blinkUntil = now + 150;
    }
  }

  return {
    burst: burst,
    draw(scene) {
      const time = scene.time;
      const state = scene.state;
      const scale = scene.scale > 1 ? scene.scale : 1;
      const now = performance.now();
      updateBlink(now);
      view.ctx.globalAlpha = 1;
      drawBackground(view, scene.layers || 0);
      drawPile(view, scene.layers || 0);
      if (scale === 1) {
        drawCat(view, time, state, blinking);
      } else {
        const ctx = view.ctx;
        const cx = CAT_X + 16;
        const cy = CAT_Y + 16;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.translate(-cx, -cy);
        drawCat(view, time, state, blinking);
        ctx.restore();
        ctx.imageSmoothingEnabled = false;
      }
      drawCotton(now);
      if (scene.showGrid) {
        drawGrid(view);
      }
    }
  };
}

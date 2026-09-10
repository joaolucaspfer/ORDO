const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets');

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc(height * (1 + width * 4));
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      raw[o++] = rgba[i];
      raw[o++] = rgba[i + 1];
      raw[o++] = rgba[i + 2];
      raw[o++] = rgba[i + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Caret "^" geometry in unit coords (y grows down), centred near middle.
function caretCoverage(fx, fy, opts) {
  const spanX = opts.spanX;
  const apexY = opts.apexY;
  const baseY = opts.baseY;
  const ax = 0.5 - spanX / 2;
  const cx = 0.5 + spanX / 2;
  const d1 = distToSegment(fx, fy, ax, baseY, 0.5, apexY);
  const d2 = distToSegment(fx, fy, 0.5, apexY, cx, baseY);
  const distPx = Math.min(d1, d2) * opts.sizePx;
  const tPx = opts.thickness * opts.sizePx;
  return clamp01((tPx - distPx) / 1.4 + 0.5);
}

function renderCaret(sizePx, { bg, caret }) {
  const opts = {
    sizePx,
    spanX: 0.4,
    apexY: 0.32,
    baseY: 0.72,
    thickness: 0.078,
  };
  const rgba = Buffer.alloc(sizePx * sizePx * 4);
  const SS = 4;
  for (let y = 0; y < sizePx; y++) {
    for (let x = 0; x < sizePx; x++) {
      let acc = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = (x + (sx + 0.5) / SS) / sizePx;
          const fy = (y + (sy + 0.5) / SS) / sizePx;
          acc += caretCoverage(fx, fy, opts);
        }
      }
      const cov = acc / (SS * SS);
      const i = (y * sizePx + x) * 4;
      rgba[i] = Math.round(bg[0] + (caret[0] - bg[0]) * cov);
      rgba[i + 1] = Math.round(bg[1] + (caret[1] - bg[1]) * cov);
      rgba[i + 2] = Math.round(bg[2] + (caret[2] - bg[2]) * cov);
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

function renderSolid(sizePx, color) {
  const rgba = Buffer.alloc(sizePx * sizePx * 4);
  for (let i = 0; i < sizePx * sizePx; i++) {
    rgba[i * 4] = color[0];
    rgba[i * 4 + 1] = color[1];
    rgba[i * 4 + 2] = color[2];
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
}

// Transparent background version (colored caret only).
function renderCaretOnTransparent(sizePx, caret) {
  const opts = {
    sizePx,
    spanX: 0.42,
    apexY: 0.34,
    baseY: 0.72,
    thickness: 0.09,
  };
  const rgba = Buffer.alloc(sizePx * sizePx * 4);
  const SS = 4;
  for (let y = 0; y < sizePx; y++) {
    for (let x = 0; x < sizePx; x++) {
      let acc = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = (x + (sx + 0.5) / SS) / sizePx;
          const fy = (y + (sy + 0.5) / SS) / sizePx;
          acc += caretCoverage(fx, fy, opts);
        }
      }
      const cov = acc / (SS * SS);
      const i = (y * sizePx + x) * 4;
      const a = Math.round(255 * cov);
      rgba[i] = caret[0];
      rgba[i + 1] = caret[1];
      rgba[i + 2] = caret[2];
      rgba[i + 3] = a;
    }
  }
  return rgba;
}

function pngSize(file) {
  if (!fs.existsSync(file)) return null;
  const b = fs.readFileSync(file);
  return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
}

const GREEN = [0x2d, 0x8a, 0x43];
const MINT = [0xe5, 0xf0, 0xe3];
const WHITE = [0xff, 0xff, 0xff];

console.log('existing sizes:');
for (const f of ['icon.png', 'android-icon-foreground.png', 'android-icon-background.png', 'android-icon-monochrome.png', 'splash-icon.png', 'favicon.png']) {
  console.log(`  ${f}: ${pngSize(path.join(ASSETS, f)) ?? 'MISSING'}`);
}

fs.writeFileSync(path.join(ASSETS, 'icon.png'), encodePng(1024, 1024, renderCaret(1024, { bg: MINT, caret: GREEN })));
fs.writeFileSync(path.join(ASSETS, 'android-icon-foreground.png'), encodePng(512, 512, renderCaretOnTransparent(512, GREEN)));
fs.writeFileSync(path.join(ASSETS, 'android-icon-background.png'), encodePng(512, 512, renderSolid(512, MINT)));
fs.writeFileSync(path.join(ASSETS, 'android-icon-monochrome.png'), encodePng(432, 432, renderCaretOnTransparent(432, WHITE)));
fs.writeFileSync(path.join(ASSETS, 'splash-icon.png'), encodePng(1024, 1024, renderCaret(1024, { bg: MINT, caret: GREEN })));
fs.writeFileSync(path.join(ASSETS, 'favicon.png'), encodePng(48, 48, renderCaret(48, { bg: MINT, caret: GREEN })));

console.log('written: icon.png, android-icon-* (3), splash-icon.png, favicon.png');
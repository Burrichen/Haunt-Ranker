/**
 * Draws the placeholder application icon — `src-tauri/icons/source-icon.png`,
 * the 1024×1024 master that `npm run tauri icon` slices into every size
 * Windows needs.
 *
 * It is deliberately a plain geometric mark in the app's own palette: a lit
 * doorway — an orange arch with warm light spilling out of it. **No Halloween Horror Nights artwork, logo or photography is used
 * anywhere in this app's branding**, and none ever should be — it belongs to
 * Universal. Replace this whole file, and the icons it generates, the moment
 * real branded artwork exists:
 *
 *   node scripts/make-placeholder-icon.mjs
 *   npm run tauri icon src-tauri/icons/source-icon.png
 *
 * Written by hand (a PNG is a few deflated scanlines) rather than adding an
 * image library to the toolchain for one file.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SIZE = 1024;
/** Samples per pixel per axis — cheap antialiasing for the curves. */
const SAMPLES = 4;

// Straight from src/styles/tokens.css, so the icon and the app agree.
const BACKGROUND = [0x10, 0x0d, 0x0f];
const MARK = [0xc1, 0x62, 0x2f];
const DOORWAY_LIGHT = [0xfb, 0xf3, 0xec];

const CORNER_RADIUS = 200;

/** Coverage of a rounded square, as a fraction of one pixel. */
function roundedSquare(x, y) {
  const r = CORNER_RADIUS;
  const inset = 0;
  const left = inset;
  const right = SIZE - inset;

  const nearestX = Math.min(Math.max(x, left + r), right - r);
  const nearestY = Math.min(Math.max(y, left + r), right - r);
  const dx = x - nearestX;
  const dy = y - nearestY;

  if (x < left || x > right || y < left || y > right) {
    return false;
  }
  return dx * dx + dy * dy <= r * r;
}

/**
 * The mark: a doorway — an arch standing on the ground, with the doorway
 * itself cut out and lit. Solid shapes only, because at 16px an outline is
 * mud.
 */
const ARCH = { left: 318, right: 706, springLine: 500, foot: 792 };
const DOOR = { left: 436, right: 588, springLine: 566, foot: 792 };

function insideArch(x, y, arch) {
  const centreX = (arch.left + arch.right) / 2;
  const radius = (arch.right - arch.left) / 2;

  if (y > arch.foot) {
    return false;
  }
  if (y >= arch.springLine) {
    return x >= arch.left && x <= arch.right;
  }
  const dx = x - centreX;
  const dy = y - arch.springLine;
  return dx * dx + dy * dy <= radius * radius;
}

function colorAt(x, y) {
  if (insideArch(x, y, DOOR)) {
    return DOORWAY_LIGHT;
  }
  if (insideArch(x, y, ARCH)) {
    return MARK;
  }
  return BACKGROUND;
}

function render() {
  // RGBA, one row at a time, each prefixed with a zero filter byte.
  const stride = SIZE * 4 + 1;
  const raw = Buffer.alloc(stride * SIZE);
  const step = 1 / SAMPLES;
  const offset = step / 2;

  for (let row = 0; row < SIZE; row += 1) {
    const rowStart = row * stride;
    raw[rowStart] = 0;

    for (let column = 0; column < SIZE; column += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let alpha = 0;

      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const x = column + offset + sx * step;
          const y = row + offset + sy * step;
          if (!roundedSquare(x, y)) {
            continue;
          }
          const [cr, cg, cb] = colorAt(x, y);
          r += cr;
          g += cg;
          b += cb;
          alpha += 1;
        }
      }

      const pixel = rowStart + 1 + column * 4;
      if (alpha === 0) {
        raw.writeUInt32BE(0, pixel);
        continue;
      }
      const total = SAMPLES * SAMPLES;
      raw[pixel] = Math.round(r / alpha);
      raw[pixel + 1] = Math.round(g / alpha);
      raw[pixel + 2] = Math.round(b / alpha);
      raw[pixel + 3] = Math.round((alpha / total) * 255);
    }
  }

  return raw;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let c = index;
  for (let bit = 0; bit < 8; bit += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

function toPng(raw) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(SIZE, 0);
  header.writeUInt32BE(SIZE, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const output = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "src-tauri",
  "icons",
  "source-icon.png",
);

writeFileSync(output, toPng(render()));
console.log(`Wrote ${output}`);
console.log("Now run: npm run tauri icon src-tauri/icons/source-icon.png");

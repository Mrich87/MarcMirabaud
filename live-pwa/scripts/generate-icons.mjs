import { PNG } from 'pngjs';
import { writeFileSync, mkdirSync } from 'node:fs';

// Simple flag-on-green-circle icon, drawn with pixel math (no external assets).
function drawIcon(size) {
  const png = new PNG({ width: size, height: size });
  const bg = [22, 52, 79]; // navy (live app)
  const white = [255, 255, 255];
  const cream = [245, 240, 225];
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.47;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let color = null;
      if (dist <= r) {
        color = bg;
        // flagstick: vertical line
        const stickX = cx - size * 0.02;
        if (
          x > stickX &&
          x < stickX + size * 0.045 &&
          y > size * 0.22 &&
          y < size * 0.82
        ) {
          color = cream;
        }
        // flag triangle
        const flagTop = size * 0.24;
        const flagBottom = size * 0.42;
        const flagLeft = cx + size * 0.015;
        const flagRight = cx + size * 0.32;
        if (y > flagTop && y < flagBottom && x > flagLeft && x < flagRight) {
          const t = (y - flagTop) / (flagBottom - flagTop);
          const maxX = flagLeft + (flagRight - flagLeft) * (1 - Math.abs(t - 0.5) * 2);
          if (x < maxX) color = white;
        }
        // hole mound
        const moundCy = size * 0.86;
        const moundR = size * 0.16;
        const mdx = x - cx;
        const mdy = (y - moundCy) * 1.8;
        if (Math.sqrt(mdx * mdx + mdy * mdy) < moundR) {
          color = [30, 69, 105];
        }
      }
      if (color) {
        png.data[idx] = color[0];
        png.data[idx + 1] = color[1];
        png.data[idx + 2] = color[2];
        png.data[idx + 3] = 255;
      } else {
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0;
      }
    }
  }
  return png;
}

// Apple touch icon needs an opaque square background (no transparency, iOS ignores alpha).
function drawSquareIcon(size) {
  const circular = drawIcon(size);
  const png = new PNG({ width: size, height: size });
  const bg = [22, 52, 79];
  for (let i = 0; i < png.data.length; i += 4) {
    const a = circular.data[i + 3];
    if (a === 0) {
      png.data[i] = bg[0];
      png.data[i + 1] = bg[1];
      png.data[i + 2] = bg[2];
      png.data[i + 3] = 255;
    } else {
      png.data[i] = circular.data[i];
      png.data[i + 1] = circular.data[i + 1];
      png.data[i + 2] = circular.data[i + 2];
      png.data[i + 3] = 255;
    }
  }
  return png;
}

mkdirSync('public/icons', { recursive: true });

for (const size of [192, 512]) {
  const png = drawIcon(size);
  writeFileSync(`public/icons/icon-${size}.png`, PNG.sync.write(png));
}

writeFileSync('public/icons/apple-touch-icon.png', PNG.sync.write(drawSquareIcon(180)));
writeFileSync('public/icons/maskable-icon-512.png', PNG.sync.write(drawSquareIcon(512)));

console.log('Icons generated in public/icons/');

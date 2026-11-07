import sharp from 'sharp';
import { spawnSync } from 'node:child_process';

// Split the existing clean plate without redrawing a single pixel. The outer
// window view stays still; the room, mullions, monitor, and avatar can move.
const source = 'public/art/room-clean.png';
const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const count = width * height;
const outside = new Uint8Array(count);
const foreground = Buffer.from(data);
const backdrop = Buffer.alloc(count * 4);

function inAvatar(x, y) {
  if (y < 408 || y > 465 || x < 920 || x > 1021) return false;
  const left = y < 428 ? 941 - (y - 408) * .8 : 925 - (y - 428) * .22;
  const right = y < 428 ? 965 + (y - 408) * 1.7 : 999 + (y - 428) * .5;
  return x >= left && x <= right;
}

function inMonitor(x, y) {
  if (x < 597 || x > 922 || y < 330 || y > 565) return false;
  // Trace the upper bezel itself; the former line sat several pixels above
  // it and dragged a horizontal strip of the outdoor bamboo with the screen.
  const top = 332 + (x - 600) * 16 / 300;
  const left = 597 + (y - 330) * 19 / 235;
  const right = 900 + (y - 349) * 20 / 216;
  return y >= top && x >= left && x <= right;
}

function inPaneRows(y, rows) {
  return rows.some(([start, end]) => y >= start && y <= end);
}

function inGlassPane(x, y, blueDelta) {
  // All three upper-left openings share one slanted crossbar. Follow its
  // painted edges across the mullions, including the formerly moving third
  // pane above and below it. At the soft timber edge, use the original blue
  // channel to keep brown brush strokes attached to the room.
  const leftPane = (x >= 451 && x <= 510) || (x >= 522 && x <= 564) || (x >= 581 && x <= 632);
  if (leftPane) {
    const beamTop = 36 + (x - 451) * .21;
    const beamBottom = 48 + (x - 451) * .19;
    if (y >= 3 && y <= beamTop && (y < beamTop - 6 || blueDelta >= 5)) return true;
    if (y >= beamBottom && y <= 242 && (y > beamBottom + 7 || blueDelta >= 5)) return true;
    if (x <= 564 && y > 242 && y <= 310) return true;
    if (x >= 581 && x <= 632 && y >= 258 && y <= 317) return true;
  }
  // The lower panes touch the warm lantern and monitor bezel. Their warm
  // pixels must travel with the room even inside these coarse pane bounds.
  if (x >= 525 && x <= 564 && inPaneRows(y, [[339, 385], [398, 455]])) return blueDelta >= -6;
  if (x >= 581 && x <= 599 && inPaneRows(y, [[340, 385], [398, 455]])) return blueDelta >= -6;

  // Each opening in the narrow right lattice is scenery. Only the timber
  // strips between these rows are allowed to remain in the moving layer.
  if (x >= 1281 && x <= 1293 && inPaneRows(y, [[64, 88], [96, 118], [127, 149], [159, 217], [229, 343], [353, 380], [390, 419], [429, 457]])) return true;
  if (x >= 1301 && x <= 1318 && inPaneRows(y, [[72, 96], [103, 125], [134, 156], [165, 216], [230, 380], [391, 419], [429, 457]])) return true;
  if (x >= 1326 && x <= 1347 && inPaneRows(y, [[81, 105], [114, 133], [142, 163], [173, 349], [358, 383], [392, 419], [429, 457]])) return true;
  return false;
}

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const pixel = y * width + x;
    const offset = pixel * 4;
    let alpha = 0;
    const inWindow = x >= 445 && x <= 1351 && y <= 465;
    if (inWindow && !inMonitor(x, y) && !inAvatar(x, y)) {
      // The main aperture is scenery all the way down to its sill. The
      // monitor's traced outline is the sole moving shape crossing it.
      // The upper timber eave belongs to the room; keep it on the moving plate.
      const inUpperEave = x >= 760 && x <= 1260 && y <= (x - 760) * .18;
      if (!inUpperEave && ((x >= 665 && x <= 1253 && y <= 451) || inGlassPane(x, y, data[offset + 2] - data[offset]))) {
        alpha = 255;
      }
    }
    outside[pixel] = alpha;
  }
}

for (let pixel = 0; pixel < count; pixel++) {
  const alpha = outside[pixel];
  const offset = pixel * 4;
  foreground[offset + 3] = 255 - alpha;
  if (alpha > 0) {
    backdrop[offset] = data[offset];
    backdrop[offset + 1] = data[offset + 1];
    backdrop[offset + 2] = data[offset + 2];
    backdrop[offset + 3] = 255;
  }
}

await Promise.all([
  sharp(foreground, { raw: { width, height, channels: 4 } }).png().toFile('public/art/room-interior.png'),
  sharp(backdrop, { raw: { width, height, channels: 4 } }).png().toFile('public/art/room-exterior.png'),
]);

// Reconstruct the unseen landscape behind the moving window frame and
// monitor. The original pixels remain untouched wherever scenery is visible.
const python = process.platform === 'win32' ? 'python' : 'python3';
const repair = spawnSync(python, ['scripts/inpaint-window-art.py'], { stdio: 'inherit' });
if (repair.error || repair.status !== 0) {
  throw repair.error ?? new Error('Window art inpainting failed. Install scripts/requirements-art.txt.');
}

// Keep the editable PNG layers and serve exact, lossless WebP copies.
await Promise.all([
  sharp('public/art/room-interior.png').webp({ lossless: true, effort: 6 }).toFile('public/art/room-interior.webp'),
  sharp('public/art/room-exterior.png').webp({ lossless: true, effort: 6 }).toFile('public/art/room-exterior.webp'),
]);

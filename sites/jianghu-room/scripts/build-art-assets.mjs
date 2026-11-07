import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "../../..");
const output = path.join(root, "sites/jianghu-room/public/art");
const generated = path.join(root, "art-work/generated");
const sceneWidth = 1672;
const sceneHeight = 941;

const regions = [
  {
    name: "sword",
    x: 1490, y: 0, width: 182, height: 555,
    clean: "sword-clean-generated.png",
    cutout: "sword-cutout-generated.png",
    bounds: [70, 8, 174, 538],
  },
  {
    name: "book",
    x: 420, y: 615, width: 800, height: 305,
    clean: "book-clean-generated.png",
    cutout: "book-cutout-generated.png",
    bounds: [62, 35, 745, 303],
  },
  {
    name: "cat",
    x: 1090, y: 385, width: 310, height: 185,
    clean: "cat-clean-generated.png",
    cutout: "cat-sleep-generated.png",
    bounds: [42, 38, 260, 146],
  },
  {
    name: "chime",
    x: 1000, y: 0, width: 170, height: 210,
    clean: "chime-clean-generated.png",
    cutout: "chime-cutout-generated.png",
    bounds: [28, 24, 125, 190],
  },
  {
    name: "bamboo",
    x: 680, y: 0, width: 315, height: 245,
    clean: "bamboo-clean-generated.png",
    cutout: "bamboo-cutout-generated.png",
    bounds: [95, 0, 310, 190],
  },
];

async function pixels(filename, width, height) {
  return sharp(filename)
    .resize(width, height, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer();
}

function maskFromAlpha(image, region) {
  const { width, height, bounds } = region;
  const [left, top, right, bottom] = bounds;
  const first = new Uint8Array(width * height);
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      if (image[(y * width + x) * 4 + 3] > 28) first[y * width + x] = 1;
    }
  }
  const expanded = new Uint8Array(first);
  for (let y = top + 1; y < bottom - 1; y++) {
    for (let x = left + 1; x < right - 1; x++) {
      if (!first[y * width + x]) continue;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) expanded[(y + dy) * width + x + dx] = 1;
      }
    }
  }
  return expanded;
}

function featherMask(mask, width, height, expand, feather) {
  const horizontal = new Uint8Array(mask.length);
  const expanded = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let offset = -expand; offset <= expand; offset++) {
        const neighbor = x + offset;
        if (neighbor >= 0 && neighbor < width && mask[y * width + neighbor]) {
          horizontal[y * width + x] = 255;
          break;
        }
      }
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let offset = -expand; offset <= expand; offset++) {
        const neighbor = y + offset;
        if (neighbor >= 0 && neighbor < height && horizontal[neighbor * width + x]) {
          expanded[y * width + x] = 255;
          break;
        }
      }
    }
  }
  const blurredX = new Uint8Array(mask.length);
  const blurred = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0, count = 0;
      for (let offset = -feather; offset <= feather; offset++) {
        const neighbor = x + offset;
        if (neighbor >= 0 && neighbor < width) { sum += expanded[y * width + neighbor]; count++; }
      }
      blurredX[y * width + x] = Math.round(sum / count);
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0, count = 0;
      for (let offset = -feather; offset <= feather; offset++) {
        const neighbor = y + offset;
        if (neighbor >= 0 && neighbor < height) { sum += blurredX[neighbor * width + x]; count++; }
      }
      blurred[y * width + x] = Math.round(sum / count);
    }
  }
  return blurred;
}

await fs.mkdir(output, { recursive: true });
const original = await pixels(path.join(root, "整体画面.png"), sceneWidth, sceneHeight);
const cleanScene = Buffer.from(original);
const layers = [];

for (const region of regions) {
  const { name, x, y, width, height } = region;
  const clean = await pixels(path.join(generated, region.clean), width, height);
  const generatedCutout = await pixels(path.join(generated, region.cutout), width, height);
  const mask = maskFromAlpha(generatedCutout, region);
  const expand = name === "sword" ? 12 : name === "cat" ? 10 : name === "chime" ? 5 : name === "bamboo" ? 6 : 20;
  const feather = name === "sword" ? 8 : name === "cat" ? 7 : name === "chime" ? 4 : name === "bamboo" ? 5 : 12;
  const softMask = featherMask(mask, width, height, expand, feather);
  const sprite = Buffer.alloc(width * height * 4);
  let selected = 0;

  for (let localY = 0; localY < height; localY++) {
    for (let localX = 0; localX < width; localX++) {
      const local = localY * width + localX;
      const destination = ((localY + y) * sceneWidth + localX + x) * 4;
      const source = local * 4;
      const blend = softMask[local] / 255;
      for (let channel = 0; channel < 3; channel++) {
        cleanScene[destination + channel] = Math.round(original[destination + channel] * (1 - blend) + clean[source + channel] * blend);
      }
      if (!mask[local]) continue;
      selected++;
      for (let channel = 0; channel < 3; channel++) {
        sprite[source + channel] = original[destination + channel];
      }
      sprite[source + 3] = 255;
      cleanScene[destination + 3] = 255;
    }
  }

  await sharp(sprite, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(output, `${name}.png`));
  layers.push({ name, x, y, width, height, selectedPixels: selected });
}

// The reference painting has a frozen smoke plume above the tea. Replace only
// that narrow plume, preserving the surrounding lamp, cup, book and tabletop.
const steamX = 325, steamY = 555, steamWidth = 225, steamHeight = 215;
const steamClean = await pixels(path.join(generated, "steam-clean-generated.png"), steamWidth, steamHeight);
for (let localY = 25; localY < 201; localY++) {
  const center = localY < 85 ? 54 + (localY - 25) * .2 : localY < 150 ? 66 + (localY - 85) * .12 : 74;
  const radius = localY < 145 ? 42 : Math.max(19, 42 - (localY - 145) * .42);
  const topFade = Math.min(1, (localY - 25) / 11);
  const bottomFade = Math.min(1, (201 - localY) / 12);
  for (let localX = 0; localX < steamWidth; localX++) {
    const edgeFade = Math.min(1, (radius - Math.abs(localX - center)) / 11);
    const blend = Math.max(0, Math.min(topFade, bottomFade, edgeFade));
    if (!blend) continue;
    const destination = ((steamY + localY) * sceneWidth + steamX + localX) * 4;
    const source = (localY * steamWidth + localX) * 4;
    for (let channel = 0; channel < 3; channel++) {
      cleanScene[destination + channel] = Math.round(cleanScene[destination + channel] * (1 - blend) + steamClean[source + channel] * blend);
    }
  }
}

await sharp(cleanScene, { raw: { width: sceneWidth, height: sceneHeight, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(path.join(output, "room-clean.png"));

// Keep the painted scabbard and hilt from the original. Only the steel blade
// has to be newly illustrated because it was hidden inside the scabbard.
const swordWidth = 182;
const swordHeight = 555;
const paintedSword = await pixels(path.join(output, "sword.png"), swordWidth, swordHeight);
const drawnReference = await pixels(path.join(generated, "sword-drawn-generated.png"), swordWidth, swordHeight);
const sheath = Buffer.alloc(paintedSword.length);
const drawnSword = Buffer.from(drawnReference);
for (let y = 0; y < swordHeight; y++) {
  for (let x = 0; x < swordWidth; x++) {
    const index = (y * swordWidth + x) * 4;
    if (y >= 174 && x < 145 && paintedSword[index + 3]) {
      paintedSword.copy(sheath, index, index, index + 4);
    }
    if (y <= 178 || x >= 145) {
      drawnSword.fill(0, index, index + 4);
      if ((y <= 178 || y < 302) && paintedSword[index + 3]) {
        paintedSword.copy(drawnSword, index, index, index + 4);
      }
    }
  }
}
await Promise.all([
  sharp(sheath, { raw: { width: swordWidth, height: swordHeight, channels: 4 } })
    .png({ compressionLevel: 9 }).toFile(path.join(output, "sword-sheath.png")),
  sharp(drawnSword, { raw: { width: swordWidth, height: swordHeight, channels: 4 } })
    .png({ compressionLevel: 9 }).toFile(path.join(output, "sword-drawn.png")),
]);

const catFloor = { stretch: 137 };
const catScale = .94;
for (const [pose, floor] of Object.entries(catFloor)) {
  const frame = await pixels(path.join(generated, `cat-${pose}-generated.png`), 310, 185);
  let right = 0, bottom = 0;
  for (let y = 0; y < 185; y++) for (let x = 0; x < 310; x++) {
    if (frame[(y * 310 + x) * 4 + 3] < 40) continue;
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  const scaledWidth = Math.round(310 * catScale);
  const scaledHeight = Math.round(185 * catScale);
  const scaled = await sharp(frame, { raw: { width: 310, height: 185, channels: 4 } })
    .resize(scaledWidth, scaledHeight).png().toBuffer();
  const left = 216 - Math.round(right * catScale);
  const top = floor - Math.round(bottom * catScale);
  const cropLeft = Math.max(0, -left);
  const visible = cropLeft ? await sharp(scaled)
    .extract({ left: cropLeft, top: 0, width: scaledWidth - cropLeft, height: scaledHeight })
    .png().toBuffer() : scaled;
  await sharp({ create: { width: 310, height: 185, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: visible, left: Math.max(0, left), top }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(output, `cat-${pose}.png`));
}
const python = process.platform === "win32" ? "python" : "python3";
const tone = spawnSync(python, ["scripts/match-cat-tone.py"], { stdio: "inherit" });
if (tone.error || tone.status !== 0) throw tone.error ?? new Error("Cat tone matching failed");

// The bite is a small overlay. The original plate and other pastries remain
// untouched, and a second click can remove the overlay without a redraw.
const pastryWidth = 320;
const pastryHeight = 136;
const bittenCrop = await pixels(path.join(generated, "pastry-bite-generated.png"), pastryWidth, pastryHeight);
const bitePatch = Buffer.alloc(bittenCrop.length);
for (let y = 0; y < pastryHeight; y++) {
  for (let x = 0; x < pastryWidth; x++) {
    const bite = ((x - 181) / 44) ** 2 + ((y - 56) / 27) ** 2;
    const crumbs = ((x - 208) / 18) ** 2 + ((y - 73) / 11) ** 2;
    const distance = Math.min(bite, crumbs);
    if (distance > 1) continue;
    const index = (y * pastryWidth + x) * 4;
    bittenCrop.copy(bitePatch, index, index, index + 4);
    bitePatch[index + 3] = Math.round(Math.max(0, Math.min(1, (1 - distance) * 7)) * 255);
  }
}
await sharp(bitePatch, { raw: { width: pastryWidth, height: pastryHeight, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(path.join(output, "pastry-bite.png"));

// The eye patch uses only the edited pupils and lids; all surrounding pixels
// stay sourced from the original illustration.
const avatarWidth = 170;
const avatarHeight = 195;
const blinkFrame = await pixels(path.join(generated, "avatar-blink-generated.png"), avatarWidth, avatarHeight);
const blinkPatch = Buffer.alloc(avatarWidth * avatarHeight * 4);
for (let y = 0; y < avatarHeight; y++) {
  for (let x = 0; x < avatarWidth; x++) {
    const lens = Math.min(
      ((x - 83) / 11) ** 2 + ((y - 87) / 8) ** 2,
      ((x - 108) / 11) ** 2 + ((y - 87) / 8) ** 2,
    );
    if (lens > 1) continue;
    const alpha = Math.max(0, Math.min(1, (1 - lens) * 7));
    const index = (y * avatarWidth + x) * 4;
    blinkPatch[index] = blinkFrame[index];
    blinkPatch[index + 1] = blinkFrame[index + 1];
    blinkPatch[index + 2] = blinkFrame[index + 2];
    blinkPatch[index + 3] = Math.round(alpha * 255);
  }
}
await sharp(blinkPatch, { raw: { width: avatarWidth, height: avatarHeight, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(path.join(output, "avatar-blink.png"));

const reconstructed = Buffer.from(cleanScene);
for (const layer of layers) {
  const sprite = await pixels(path.join(output, `${layer.name}.png`), layer.width, layer.height);
  for (let localY = 0; localY < layer.height; localY++) {
    for (let localX = 0; localX < layer.width; localX++) {
      const source = (localY * layer.width + localX) * 4;
      if (!sprite[source + 3]) continue;
      const destination = ((localY + layer.y) * sceneWidth + localX + layer.x) * 4;
      sprite.copy(reconstructed, destination, source, source + 4);
    }
  }
}

await fs.mkdir(path.join(root, "art-work/previews"), { recursive: true });
await sharp(reconstructed, { raw: { width: sceneWidth, height: sceneHeight, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, "art-work/previews/room-reassembled.png"));

await sharp(path.join(root, "整体画面.png"))
  .composite([{ input: path.join(output, "pastry-bite.png"), left: 220, top: 805 }])
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, "art-work/previews/pastry-bite-preview.png"));
const otherSprites = [
  { input: path.join(output, "sword.png"), left: 1490, top: 0 },
  { input: path.join(output, "book.png"), left: 420, top: 615 },
  { input: path.join(output, "chime.png"), left: 1000, top: 0 },
  { input: path.join(output, "bamboo.png"), left: 680, top: 0 },
];
for (const pose of ["stretch"]) {
  await sharp(cleanScene, { raw: { width: sceneWidth, height: sceneHeight, channels: 4 } })
    .composite([...otherSprites, { input: path.join(output, `cat-${pose}.png`), left: 1090, top: 385 }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(root, `art-work/previews/cat-${pose}-preview.png`));
}
const catOrder = ["", "stretch"];
const catBackground = await sharp(cleanScene, { raw: { width: sceneWidth, height: sceneHeight, channels: 4 } })
  .extract({ left: 1090, top: 385, width: 310, height: 185 }).png().toBuffer();
const catCells = await Promise.all(catOrder.map((pose) => sharp(catBackground)
  .composite([{ input: path.join(output, `cat${pose ? `-${pose}` : ""}.png`), left: 0, top: 0 }])
  .png().toBuffer()));
await sharp({ create: { width: 620, height: 185, channels: 4, background: "#182932" } })
  .composite(catCells.map((input, index) => ({ input, left: index * 310, top: 0 })))
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, "art-work/previews/cat-motion-contact-sheet.png"));
const pulledSword = await sharp(path.join(output, "sword-drawn.png"))
  .extract({ left: 0, top: 14, width: 178, height: 541 })
  .png().toBuffer();
await sharp(cleanScene, { raw: { width: sceneWidth, height: sceneHeight, channels: 4 } })
  .composite([
    ...otherSprites.slice(1),
    { input: path.join(output, "cat.png"), left: 1090, top: 385 },
    { input: pulledSword, left: 1494, top: 0 },
    { input: path.join(output, "sword-sheath.png"), left: 1490, top: 0 },
  ])
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, "art-work/previews/sword-draw-preview.png"));

const windowMask = await fs.readFile(path.join(output, "window-mask.svg"));
const windowMaskPath = path.join(output, "window-mask.png");
await sharp(windowMask).blur(12).png({ compressionLevel: 9 }).toFile(windowMaskPath);
const rainMask = await fs.readFile(path.join(output, "rain-mask.svg"));
await sharp(rainMask).blur(5).png({ compressionLevel: 9 }).toFile(path.join(output, "rain-mask.png"));
const windowAlpha = await pixels(windowMaskPath, sceneWidth, sceneHeight);
const windowOverlay = Buffer.alloc(windowAlpha.length);
for (let i = 0; i < windowOverlay.length; i += 4) {
  windowOverlay[i] = 255;
  windowOverlay[i + 1] = 130;
  windowOverlay[i + 2] = 50;
  windowOverlay[i + 3] = Math.round(windowAlpha[i + 3] * .42);
}
const tintedWindowMask = await sharp(windowOverlay, { raw: { width: sceneWidth, height: sceneHeight, channels: 4 } }).png().toBuffer();
await sharp(path.join(root, "整体画面.png"))
  .composite([{ input: tintedWindowMask }])
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, "art-work/previews/window-mask-preview.png"));

let changedPixels = 0;
for (let i = 0; i < original.length; i += 4) {
  if (original[i] !== reconstructed[i] || original[i + 1] !== reconstructed[i + 1] || original[i + 2] !== reconstructed[i + 2]) changedPixels++;
}
console.log(JSON.stringify({ layers, changedPixels, totalPixels: sceneWidth * sceneHeight }, null, 2));

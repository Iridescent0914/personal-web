import sharp from "sharp";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
for (const pose of ["", "stretch"]) {
  const filename = path.join(root, "sites/jianghu-room/public/art", `cat${pose ? `-${pose}` : ""}.png`);
  const { data, info: { width, height } } = await sharp(filename).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = width, right = 0, top = height, bottom = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] < 40) continue;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  console.log(`${pose || "sleep"}: ${left},${top} - ${right},${bottom}`);
}

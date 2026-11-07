import sharp from "sharp";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
const source = path.join(root, "整体画面.png");
for (const [name, left, top, width, height] of [
  ["chime", 1000, 0, 170, 210],
  ["bamboo", 680, 0, 315, 245],
  ["cat", 1090, 385, 310, 185],
  ["steam", 325, 555, 225, 215],
]) {
  await sharp(source).extract({ left, top, width, height })
    .toFile(path.join(root, "art-work/crops", `${name}-source.png`));
}

"""Match the stretched cat's light to the original sleeping cat."""

from pathlib import Path

import cv2
import numpy as np


image_path = Path(__file__).resolve().parent.parent / "public" / "art" / "cat-stretch.png"
frame = cv2.imread(str(image_path), cv2.IMREAD_UNCHANGED)
if frame is None or frame.shape[2] != 4:
    raise RuntimeError("Stretched cat frame is missing")

visible = frame[:, :, 3] > 0
lab = cv2.cvtColor(frame[:, :, :3], cv2.COLOR_BGR2LAB).astype(np.int16)
lab[:, :, 0] = np.clip(lab[:, :, 0] - 28, 0, 255)
lab[:, :, 1] = np.clip(lab[:, :, 1] - 2, 0, 255)
lab[:, :, 2] = np.clip(lab[:, :, 2] - 3, 0, 255)
matched = cv2.cvtColor(lab.astype(np.uint8), cv2.COLOR_LAB2BGR)
frame[:, :, :3][visible] = matched[visible]
cv2.imwrite(str(image_path), frame)

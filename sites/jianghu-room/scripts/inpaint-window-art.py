"""Extend visible outdoor pixels behind the moving timber and monitor."""

from pathlib import Path

import cv2
import numpy as np


art = Path(__file__).resolve().parent.parent / "public" / "art"
source = cv2.imread(str(art / "room-clean.png"), cv2.IMREAD_COLOR)
interior = cv2.imread(str(art / "room-interior.png"), cv2.IMREAD_UNCHANGED)
exterior = cv2.imread(str(art / "room-exterior.png"), cv2.IMREAD_UNCHANGED)
if source is None or interior is None or exterior is None:
    raise RuntimeError("Room art layers are missing")

inside_alpha = interior[:466, 445:1352, 3]
backdrop = exterior[:466, 445:1352]
window_source = source[:466, 445:1352]
hidden = (inside_alpha > 0).astype(np.uint8)

# Inpainting the full painting sampled the lamp and desktop at the crop edge,
# leaving orange and grey ghosts behind the monitor. Extend only genuine
# outdoor pixels into hidden areas. The room shifts at most three source pixels,
# so the nearest outdoor edge is the most faithful continuation at reveal time.
_, labels = cv2.distanceTransformWithLabels(
    hidden, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL
)
known = hidden == 0
colors = np.zeros((int(labels.max()) + 1, 3), np.uint8)
colors[labels[known]] = window_source[known]
backdrop[~known, :3] = colors[labels[~known]]
backdrop[~known, 3] = 255

if not np.array_equal(colors[labels[known]], window_source[known]):
    raise RuntimeError("Outdoor edge color lookup failed")
cv2.imwrite(str(art / "room-exterior.png"), exterior)

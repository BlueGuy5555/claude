# Bundled ML models

## `movenet_singlepose_lightning_int8.tflite`

Google **MoveNet SinglePose Lightning** (INT8-quantized) pose-estimation model,
in TensorFlow Lite format.

- **Input:** `1 × 192 × 192 × 3`, `uint8` (RGB, values `0–255`).
- **Output:** `1 × 1 × 17 × 3`, `float32` — 17 COCO keypoints, each
  `(y, x, score)` normalized to `[0, 1]` relative to the input square.
- **Size:** 2,894,840 bytes.
- **SHA-256:** `cd7cc22fa946e5d146a7b98d496853e1923e22828d3972d579973f27f91bb105`

The model is **bundled into the app binary** and loaded from local assets via
`react-native-fast-tflite`. It is **never downloaded at runtime** — the app runs
fully offline and no camera data ever leaves the device.

The model is published by Google under the Apache-2.0 license and is available
from [Kaggle Models / TF Hub](https://www.kaggle.com/models/google/movenet).

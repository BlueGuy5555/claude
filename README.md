# RepCount

An **offline-first** workout rep-counter built with Expo. Everything runs
on-device and no data ever leaves the phone.

> **Status — Milestone 3 of 4: On-device pose detection.**
> The workout screen now runs a **real** full-body pose estimator on-device:
> a live camera preview with a skeleton overlay, confidence filtering, temporal
> smoothing, loading/error/"no person" states and an optional FPS overlay. It
> works completely offline; all user data still lives in AsyncStorage.

## How pose detection works

The camera and AI are fully encapsulated behind a single hook,
`usePoseDetection()` (in `src/services/pose/`). Each camera frame is processed
entirely on the **camera thread** (a VisionCamera *frame processor* worklet):

```
Camera frame → resize to 192×192 (RGB) → MoveNet (TFLite) → 17 keypoints
            → confidence filter → temporal smoothing → Skia skeleton overlay
```

- **Model:** [MoveNet SinglePose Lightning (int8)](https://www.kaggle.com/models/google/movenet),
  a 2.8 MB TensorFlow Lite model bundled at
  `assets/models/movenet-lightning-int8.tflite`. Input `uint8[1,192,192,3]`,
  output `float32[1,1,17,3]` (17 COCO keypoints as `[y, x, score]`).
- **Inference:** [`react-native-fast-tflite`](https://github.com/mrousavy/react-native-fast-tflite)
  runs the model with a hardware delegate when available (**Core ML** on iOS,
  **GPU/NNAPI** on Android) and transparently falls back to CPU.
- **Rendering:** the skeleton is drawn straight onto the frame with
  [`@shopify/react-native-skia`](https://shopify.github.io/react-native-skia/),
  so there is no cross-thread lag between the video and the overlay.

Nothing in `screens/` or `components/` imports TensorFlow, Skia or the resize
plugin — the UI depends only on `usePoseDetection()`.

## Tech stack

- **Expo SDK 54** + **React Native 0.81** + **TypeScript** (strict)
- **React Navigation** (native stack)
- **react-native-vision-camera** — camera preview + frame processors
- **react-native-fast-tflite** (+ `react-native-nitro-modules`) — on-device TFLite inference
- **vision-camera-resize-plugin** — frame → model input tensor
- **@shopify/react-native-skia** — on-frame skeleton overlay
- **react-native-worklets-core** — frame-processor worklet runtime
- **expo-haptics** — feedback that respects the vibration setting
- **@react-native-async-storage/async-storage** — the only persistence layer
- **react-native-reanimated** / **react-native-svg** — UI animations + logo

## Getting started

Pose detection relies on native modules (camera + TensorFlow Lite + Skia), so
**Expo Go is not supported** — you need a
[development build](https://docs.expo.dev/develop/development-builds/introduction/).

```bash
npm install

# Build & run a dev client on a real device (recommended) or emulator:
npx expo run:android      # or:  npx expo run:ios
```

`npx expo run:*` prebuilds the native project and installs a dev client;
subsequent JS changes hot-reload as usual. On managed/EAS workflows use
`eas build --profile development` instead. Pose detection needs a device with a
real camera — the iOS simulator has none.

> The `.tflite` model is committed to the repo and bundled automatically
> (`metro.config.js` registers `tflite` as an asset extension), so no download
> step is required and the app runs fully offline.

## Project structure

```
src/
  components/   Reusable, presentational UI (Button, Card, EmptyState, ...)
  screens/      One file per screen (Home, WorkoutSession, History, ...)
  navigation/   React Navigation stack + typed route params
  context/      React context providers (settings)
  hooks/        Reusable stateful logic (useSettings, useStatistics, ...)
  services/     Business logic
    pose/       On-device pose detection (see below)
  storage/      AsyncStorage layer (one module per data bucket)
  theme/        Colors, spacing, typography + light/dark themes
  types/        Shared TypeScript domain models
  constants/    Static app metadata and the exercise catalogue
  utils/        Small pure helpers (date, format, id)
```

### `services/pose/`

| File              | Responsibility                                                        |
| ----------------- | --------------------------------------------------------------------- |
| `PoseTypes.ts`    | Implementation-agnostic types + default config/style (no AI imports). |
| `PoseUtils.ts`    | Worklet-safe helpers: parse, filter, smooth and draw the skeleton.    |
| `PoseDetector.ts` | The only module touching TFLite: model loading + per-frame inference. |
| `PoseProvider.ts` | `usePoseDetection()` — the single seam between the camera UI and AI.  |

The guiding principle is a one-way dependency flow: **screens → hooks/services →
storage**. UI never talks to AsyncStorage directly, and business logic never
imports React (except the `usePoseDetection` hook, which is the UI's only
gateway to the detector).

## Local storage

All data is namespaced under `@repcount/v1/*` in AsyncStorage and serialized as
JSON. The storage layer is ready to persist workout history, in-progress
sessions, user settings, preferences, and a cached statistics snapshot.

## Scripts

| Command             | Description                          |
| ------------------- | ------------------------------------ |
| `npm start`         | Start the Expo dev server            |
| `npm run android`   | Start on Android                     |
| `npm run ios`       | Start on iOS                         |
| `npm run typecheck` | Type-check the project with `tsc`    |

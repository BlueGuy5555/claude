# RepCount

An **offline-first, on-device AI workout rep counter** built with Expo. RepCount
watches you through the camera, figures out which exercise you're doing, counts
your reps with a robust state machine, and tracks your progress over time.

> **Privacy by design.** Everything runs on the device. There is no backend, no
> cloud inference, no account, and no network requirement. Camera frames and
> pose data never leave the phone, and all history/settings live in
> `AsyncStorage`.

## Features

- **Rep counting for six exercises** — push-ups, squats, pull-ups, lunges,
  jumping jacks, and a plank hold timer. Counting uses a hysteresis state
  machine (not a naive threshold) so it rejects partial reps, tolerates pauses,
  is independent of movement speed, and never double-counts.
- **Pose analysis** — joint-angle math, One-Euro keypoint smoothing, per-joint
  confidence gating, graceful handling of missing joints, and automatic
  recovery after tracking loss.
- **Automatic exercise detection** — recognizes the exercise you're performing
  from a rolling window of pose features. Manual selection always overrides it.
- **Live workout HUD** — current exercise, live rep count (or plank timer),
  movement phase (Top / Down / Bottom / Up / Hold), elapsed time, calorie
  estimate, and an optional debug overlay (FPS + confidence).
- **Session controls** — Start, Pause, Resume, Finish. Finishing saves the
  date, exercise, duration, total reps, calories, and average confidence.
- **Rich statistics** — totals (workouts, reps, time, calories), weekly and
  monthly windows, current/longest streaks, longest and average workout,
  per-exercise breakdown, and personal records — all derived from local data.
- **Settings** — camera mirror, preferred side (handedness), skeleton
  visibility, detection sensitivity (confidence threshold), FPS overlay,
  vibration, sound, and theme (System / Light / Dark). Every setting persists.

## Tech stack

- **Expo SDK 54** · **React Native 0.81** · **TypeScript** (strict, `noUncheckedIndexedAccess`)
- **React Navigation** (native stack)
- **expo-camera** — live preview
- **react-native-svg** — the skeleton overlay and app logo
- **react-native-reanimated** — entrance/transition animations
- **expo-haptics** — rep and control feedback (respects the vibration setting)
- **@react-native-async-storage/async-storage** — the only persistence layer
- **Vitest** — unit tests for the pure business logic
- **ESLint** (`eslint-config-expo`) — linting

## Getting started

```bash
npm install
npx expo start
```

Then press `a` (Android), `i` (iOS), or scan the QR code with **Expo Go**. All
native modules used by default (camera, haptics, svg, reanimated, async-storage,
screens, safe-area) are part of the Expo Go runtime, so **no custom dev build is
required** to run the app as shipped.

A physical device (or a simulator/emulator with a camera) is needed for the
camera preview.

## Scripts

| Command             | Description                          |
| ------------------- | ------------------------------------ |
| `npm start`         | Start the Expo dev server            |
| `npm run android`   | Start on Android                     |
| `npm run ios`       | Start on iOS                         |
| `npm run typecheck` | Type-check with `tsc`                |
| `npm run lint`      | Lint with ESLint                     |
| `npm test`          | Run the unit test suite (Vitest)     |

## How rep counting works

Each rep-based exercise turns a joint angle into a normalized **progress**
signal in `[0, 1]` — `0` at the top of the rep, `1` at the bottom / peak effort
(e.g. push-up progress comes from the elbow angle, squat progress from the knee
angle). A **Schmitt trigger** with two thresholds and a gap between them
(`topEnter` and `bottomEnter`) drives the count: you must push past
`bottomEnter` *and then* return below `topEnter` to score one rep.

That single rule delivers the behaviour the app needs:

- **No duplicates** — hovering near one threshold never scores.
- **No partial reps** — never reaching the bottom means the return to the top
  counts nothing.
- **Pause-tolerant / speed-independent** — the machine is position-driven, with
  only a small debounce to reject jitter.
- **Dropout-tolerant** — an unmeasurable frame holds the current phase instead
  of corrupting it.

The plank reuses the same measurement but accumulates hold time while a
"straight, horizontal body" posture-quality score stays above a threshold.

## Pose detection: simulated vs. real

All inference lives behind a single `PoseDetector` interface (see
`src/services/pose/PoseDetector.ts`). The rest of the app — rep counting, the
HUD, statistics — is completely agnostic about how poses are produced.

**As shipped**, `createPoseDetector()` returns a **`SimulatedPoseDetector`**: a
dependency-free source that synthesizes anatomically-plausible motion for the
selected exercise. This makes the whole app runnable, demoable, and
unit-testable offline with zero native ML dependencies.

**To enable real on-device inference**, implement a `MoveNetPoseDetector` that
satisfies the same interface and return it from `createPoseDetector()`. Nothing
else in the app changes. The recommended stack (requires a
[custom dev build](https://docs.expo.dev/develop/development-builds/introduction/),
not Expo Go):

1. Add the native modules:
   ```bash
   npx expo install react-native-vision-camera react-native-fast-tflite \
     vision-camera-resize-plugin
   ```
2. Add a MoveNet `.tflite` model (e.g. `movenet-lightning`) under `assets/models/`.
3. In a Vision Camera **frame processor**, resize each frame to the model's
   input, run the model, map its 17 outputs to the `Pose` shape (normalized
   `x, y, score`), and store it as the detector's latest pose.
4. Return the new detector from `createPoseDetector()` and switch the Workout
   screen's `CameraView` to Vision Camera's `<Camera frameProcessor={…} />`.

Because the detector contract is identical, the smoother, rep counters, and UI
work unchanged.

## Project structure

```
src/
  components/   Reusable UI (Button, Card, SegmentedControl, PhasePill,
                ExercisePicker, PoseSkeletonOverlay, …)
  screens/      Home, WorkoutSession, WorkoutSummary, History, Statistics, Settings
  navigation/   React Navigation stack + typed routes
  context/      Settings provider
  hooks/        useWorkoutSession (orchestrator), useStatistics, useWorkoutHistory, useHaptics
  services/
    pose/         PoseDetector interface, SimulatedPoseDetector, angles,
                  smoothing (One-Euro), keypoint helpers
    repcounting/  RepCounter state machine, per-exercise definitions, auto-detection
    workout/      calorie estimate, session builder
    statisticsService.ts, workoutService.ts
  storage/      AsyncStorage layer (one module per data bucket)
  theme/        Colors, spacing, typography + light/dark themes
  types/        Shared domain models (pose, workout, settings, statistics)
  constants/    App metadata + exercise catalogue
  utils/        Pure helpers (date, format, id)
```

The guiding principle is a one-way dependency flow: **screens → hooks/services →
storage**. UI never talks to `AsyncStorage` directly, and business logic never
imports React — which is exactly why the engine is unit-testable in plain Node.

## Local storage

All data is namespaced under `@repcount/v1/*` in `AsyncStorage` as JSON:
workout history, the cached statistics snapshot, user settings, and internal
preferences. A small migration maps the legacy `darkMode` boolean onto the newer
`theme` preference.

## Testing & verification

- `npm test` runs **39 Vitest specs** covering joint-angle math, One-Euro
  smoothing, all rep-counting state machines (including partial-rep,
  pause, duplicate, and tracking-loss cases), exercise auto-detection,
  statistics aggregation, and AsyncStorage round-trips.
- `npm run typecheck` and `npm run lint` are clean.
- `npx expo export --platform android` bundles successfully.

### Manual QA

1. Start the app, open a workout, grant camera permission.
2. Leave "Auto" selected or pick an exercise; press **Start** and watch reps,
   phase, timer, and calories update. Toggle the debug overlay in Settings to
   see FPS/confidence.
3. **Pause**/**Resume** and confirm the timer stops/continues. Send the app to
   the background and confirm it auto-pauses.
4. **Finish** and confirm the summary screen shows the saved metrics, then check
   the workout appears in **History** and totals update in **Statistics**.
5. Change a setting (e.g. Theme or Show skeleton), fully close and reopen the
   app, and confirm it persisted.

## Known limitations & future work

- **Real CV model not bundled.** The app ships with the simulated detector; a
  real MoveNet detector is documented above but requires native modules and a
  custom dev build (and a physical device to validate).
- **Sound cues** are gated by the Settings toggle but not yet audible; adding
  `expo-audio` + short sound assets would light them up. Vibration feedback is
  fully wired.
- **Calorie estimates** use a MET model with an assumed body weight
  (`DEFAULT_BODY_WEIGHT_KG`); a body-weight setting would improve accuracy.
- The skeleton overlay re-renders at the frame cadence; moving it onto a
  Reanimated shared value would shave further work off the JS thread.

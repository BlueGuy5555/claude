# RepCount

An **offline-first** workout rep-counter built with Expo. Everything runs
on-device and no data ever leaves the phone.

> **Status — Statistics, History & Progress Tracking.**
> On top of the working camera, MoveNet pose detection and rep counting, this
> milestone adds a complete **fitness-tracking data layer**: a scalable,
> sync-ready local database, a home dashboard, full workout history with
> per-session detail, an analytics screen with animated charts and date-range
> filters, goals, streaks, personal records and lightweight insights. The
> pose-detection / camera / rep-counting systems are treated as complete and
> are **not modified** here.

## Tech stack

- **Expo SDK 54** + **React Native 0.81** + **TypeScript** (strict)
- **React Navigation** (native stack)
- **expo-camera** — live preview on the Workout screen
- **expo-haptics** — feedback that respects the vibration setting
- **@react-native-async-storage/async-storage** — the only persistence layer
- **react-native-svg** — the app logo
- **react-native-reanimated** — subtle entrance and pulse animations
- **@expo/vector-icons** — iconography

## Getting started

```bash
npm install
npx expo start
```

Then press `i` (iOS simulator), `a` (Android emulator), or scan the QR code
with Expo Go. Camera preview requires a physical device or a simulator with a
camera.

## Project structure

```
src/
  components/   Reusable, presentational UI (Button, Card, StatCard, ...)
  screens/      One file per screen (Home, WorkoutSession, History,
                SessionDetail, Statistics, Goals, Settings)
  navigation/   React Navigation stack + typed route params
  context/      React context providers (settings, in-memory workout data)
  hooks/        Reusable stateful logic (useDashboard, useAnalytics, useGoals, …)
  services/     Pure business logic (analytics, streaks, records, insights, export)
  database/     Sync-ready repository over local storage + migrations
  charts/       Animated SVG charts (bar, line, ring, progress, distribution)
  storage/      AsyncStorage layer (one module per data bucket)
  theme/        Colors, spacing, typography + light/dark themes
  types/        Shared TypeScript domain models
  constants/    Static app metadata and the exercise catalogue
  utils/        Small pure helpers (date, format, id)
```

The guiding principle is a one-way dependency flow: **screens → hooks →
services/database → storage**. UI never talks to AsyncStorage directly, and
business logic (services) never imports React, so every calculation is a pure,
unit-tested function of the workout history.

## Data layer

Completed workouts are read once at launch by `WorkoutDataProvider` and held in
memory as the single source of truth; every analytics surface derives from that
array with memoized selectors, so the Statistics screen stays smooth even with
thousands of sessions.

Persistence goes through a **repository** (`src/database`) rather than touching
AsyncStorage directly. History is stored inside a versioned envelope with a
forward-only migration path, and every record carries sync metadata
(`updatedAt`, `syncState`, `remoteId`) so cloud sync — and CSV / JSON / Google
Fit / Apple Health export — can be added later without a schema change. All data
is namespaced under `@repcount/v1/*` and serialized as JSON.

## Scripts

| Command             | Description                          |
| ------------------- | ------------------------------------ |
| `npm start`         | Start the Expo dev server            |
| `npm run android`   | Start on Android                     |
| `npm run ios`       | Start on iOS                         |
| `npm run typecheck` | Type-check the project with `tsc`    |
| `npm test`          | Run the pure-logic unit test suite   |

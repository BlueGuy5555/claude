# RepCount

An **offline-first** workout rep-counter built with Expo. Everything runs
on-device and no data ever leaves the phone.

> **Status — Milestone 1 of 4: Foundation.**
> This milestone establishes a clean, production-quality app skeleton:
> navigation, all five screens, a local storage layer, theming with dark mode,
> and a live camera preview. **AI / pose detection is intentionally not
> implemented yet** and arrives in a later milestone.

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
  screens/      One file per screen (Home, WorkoutSession, History, ...)
  navigation/   React Navigation stack + typed route params
  context/      React context providers (settings)
  hooks/        Reusable stateful logic (useSettings, useStatistics, ...)
  services/     Pure business logic (statistics aggregation, view models)
  storage/      AsyncStorage layer (one module per data bucket)
  theme/        Colors, spacing, typography + light/dark themes
  types/        Shared TypeScript domain models
  constants/    Static app metadata and the exercise catalogue
  utils/        Small pure helpers (date, format, id)
```

The guiding principle is a one-way dependency flow: **screens → hooks/services →
storage**. UI never talks to AsyncStorage directly, and business logic never
imports React.

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

import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppText,
  Button,
  EmptyState,
  ExercisePicker,
  PhasePill,
  PoseSkeletonOverlay,
  ScreenContainer,
} from '@/components';
import { getExercise } from '@/constants';
import { useHaptics, useWorkoutSession } from '@/hooks';
import type { RootStackScreenProps } from '@/navigation';
import { useSettings } from '@/context';
import type { ExerciseId } from '@/types';
import { useTheme } from '@/theme';
import { formatCalories, formatClock, formatPercent } from '@/utils';

export function WorkoutSessionScreen({
  navigation,
  route,
}: RootStackScreenProps<'WorkoutSession'>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { impact, notify } = useHaptics();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const [cameraSize, setCameraSize] = useState({ width: 0, height: 0 });

  const initialExercise: ExerciseId = route.params?.exerciseId ?? 'squat';
  const { snapshot, start, pause, resume, finish, selectExercise, setAutoDetect } =
    useWorkoutSession({ settings, initialExercise });

  // Rep milestone feedback (respects the vibration/sound settings via useHaptics).
  const lastRepsRef = useRef(0);
  useEffect(() => {
    if (snapshot.status === 'running' && snapshot.reps > lastRepsRef.current) {
      impact('medium');
    }
    lastRepsRef.current = snapshot.reps;
  }, [snapshot.reps, snapshot.status, impact]);

  const onCameraLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCameraSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  };

  const handleFinish = async () => {
    notify('success');
    const session = await finish();
    if (session) navigation.replace('WorkoutSummary', { sessionId: session.id });
    else navigation.goBack();
  };

  // Permission still resolving.
  if (!permission) {
    return (
      <ScreenContainer scroll={false} style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  // Permission not yet granted — explain why and ask.
  if (!permission.granted) {
    return (
      <ScreenContainer scroll={false}>
        <EmptyState
          icon="camera-outline"
          title="Camera access needed"
          message={
            permission.canAskAgain
              ? 'RepCount counts your reps on-device from the camera. The video never leaves your phone.'
              : 'Camera access is disabled. Enable it in your device Settings to use workout sessions.'
          }
          action={
            <View style={styles.permissionActions}>
              {permission.canAskAgain ? (
                <Button label="Grant camera access" icon="camera" onPress={requestPermission} />
              ) : null}
              <Button label="Go back" variant="ghost" onPress={() => navigation.goBack()} />
            </View>
          }
        />
      </ScreenContainer>
    );
  }

  const exercise = getExercise(snapshot.exerciseId);
  const isTimed = exercise.kind === 'timed';
  const mirror = facing === 'front' && settings.cameraMirror;
  const controlsBusy = snapshot.status === 'running';

  return (
    <View style={styles.flex}>
      <View style={StyleSheet.absoluteFill} onLayout={onCameraLayout}>
        <CameraView style={StyleSheet.absoluteFill} facing={facing} />
        {settings.showSkeleton ? (
          <PoseSkeletonOverlay
            pose={snapshot.pose}
            width={cameraSize.width}
            height={cameraSize.height}
            mirror={mirror}
            threshold={settings.confidenceThreshold}
          />
        ) : null}
      </View>

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + theme.spacing.sm }]}>
        <OverlayButton
          icon="chevron-back"
          label="Go back"
          onPress={() => {
            impact('light');
            navigation.goBack();
          }}
        />
        <View style={styles.topCenter}>
          <AppText variant="subtitle" color="onOverlay">
            {exercise.name}
          </AppText>
          {snapshot.autoDetect ? (
            <AppText variant="caption" color="onOverlay" style={styles.autoHint}>
              Auto-detecting…
            </AppText>
          ) : null}
        </View>
        <OverlayButton
          icon="camera-reverse-outline"
          label="Flip camera"
          onPress={() => {
            impact('light');
            setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
          }}
        />
      </View>

      {/* Debug overlay */}
      {settings.showFps ? (
        <View style={[styles.debug, { top: insets.top + 64 }]} pointerEvents="none">
          <AppText variant="caption" color="onOverlay">
            {snapshot.fps} FPS · confidence {formatPercent(snapshot.confidence)}
          </AppText>
        </View>
      ) : null}

      {/* Tracking-lost banner */}
      {snapshot.trackingLost && snapshot.status === 'running' ? (
        <Animated.View
          entering={FadeIn}
          style={[styles.trackingBanner, { top: insets.top + 64 }]}
          pointerEvents="none"
        >
          <Ionicons name="scan-outline" size={16} color="#FFFFFF" />
          <AppText variant="caption" color="onOverlay" style={styles.trackingText}>
            Move into frame — searching for your body…
          </AppText>
        </Animated.View>
      ) : null}

      {/* Main metric */}
      <View style={styles.hud} pointerEvents="none">
        {snapshot.status === 'running' || snapshot.status === 'paused' ? (
          <>
            <View
              accessibilityRole="text"
              accessibilityLabel={
                isTimed
                  ? `Hold time ${Math.round(snapshot.holdSec)} seconds`
                  : `${snapshot.reps} reps`
              }
            >
              <AppText style={styles.bigMetric}>
                {isTimed ? formatClock(snapshot.holdSec) : snapshot.reps}
              </AppText>
            </View>
            <AppText variant="bodyStrong" color="onOverlay" style={styles.metricLabel}>
              {isTimed ? 'HOLD' : 'REPS'}
            </AppText>
            <View style={styles.subStats}>
              <PhasePill phase={snapshot.phase} />
              <View style={styles.subStat}>
                <Ionicons name="time-outline" size={16} color="#FFFFFF" />
                <AppText variant="bodyStrong" color="onOverlay" style={styles.subStatText}>
                  {formatClock(snapshot.elapsedSec)}
                </AppText>
              </View>
              <View style={styles.subStat}>
                <Ionicons name="flame-outline" size={16} color="#FFFFFF" />
                <AppText variant="bodyStrong" color="onOverlay" style={styles.subStatText}>
                  {formatCalories(snapshot.calories)}
                </AppText>
              </View>
            </View>
          </>
        ) : null}
      </View>

      {/* Bottom controls */}
      <Animated.View
        entering={FadeInDown}
        style={[styles.bottom, { paddingBottom: insets.bottom + theme.spacing.lg }]}
      >
        {snapshot.status !== 'error' ? (
          <ExercisePicker
            current={snapshot.exerciseId}
            autoDetect={snapshot.autoDetect}
            onSelect={selectExercise}
            onToggleAuto={setAutoDetect}
            disabled={controlsBusy}
          />
        ) : null}

        <View style={styles.controls}>
          {renderControls()}
        </View>
      </Animated.View>
    </View>
  );

  function renderControls() {
    switch (snapshot.status) {
      case 'loading':
        return (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#FFFFFF" />
            <AppText variant="bodyStrong" color="onOverlay" style={styles.loadingText}>
              Preparing pose model…
            </AppText>
          </View>
        );
      case 'error':
        return (
          <View style={styles.controlColumn}>
            <AppText variant="body" color="onOverlay" center>
              {snapshot.errorMessage ?? 'Something went wrong.'}
            </AppText>
            <Button label="Go back" variant="secondary" onPress={() => navigation.goBack()} />
          </View>
        );
      case 'ready':
        return <Button label="Start workout" icon="play" onPress={start} />;
      case 'running':
        return (
          <View style={styles.controlRow}>
            <Button label="Pause" icon="pause" variant="secondary" onPress={pause} style={styles.flexBtn} />
            <Button label="Finish" icon="checkmark" onPress={handleFinish} style={styles.flexBtn} />
          </View>
        );
      case 'paused':
        return (
          <View style={styles.controlRow}>
            <Button label="Resume" icon="play" onPress={resume} style={styles.flexBtn} />
            <Button label="Finish" icon="checkmark" variant="secondary" onPress={handleFinish} style={styles.flexBtn} />
          </View>
        );
      default:
        return null;
    }
  }
}

function OverlayButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.overlayButton, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={24} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 2,
  },
  topCenter: { alignItems: 'center' },
  autoHint: { opacity: 0.85, marginTop: 2 },
  overlayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  pressed: { opacity: 0.7 },
  debug: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  trackingBanner: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(224,134,0,0.9)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  trackingText: { marginLeft: 8 },
  hud: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigMetric: {
    color: '#FFFFFF',
    fontSize: 96,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  metricLabel: { letterSpacing: 3, opacity: 0.85 },
  subStats: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  subStat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  subStatText: { marginLeft: 6 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 16 },
  controls: { paddingHorizontal: 24 },
  controlRow: { flexDirection: 'row', gap: 12 },
  controlColumn: { gap: 12 },
  flexBtn: { flex: 1 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginLeft: 12 },
  permissionActions: { alignSelf: 'stretch', gap: 12 },
});

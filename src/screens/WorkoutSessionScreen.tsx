import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppText,
  Button,
  EmptyState,
  ExerciseCard,
  LoadingSpinner,
  RepCounter,
  ScreenContainer,
  Timer,
  WorkoutSummary,
} from '@/components';
import { EXERCISES } from '@/constants';
import { useWorkoutSession } from '@/hooks';
import type { RootStackScreenProps } from '@/navigation';
import { useTheme } from '@/theme';

export function WorkoutSessionScreen({
  navigation,
  route,
}: RootStackScreenProps<'WorkoutSession'>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');

  const session = useWorkoutSession({ resume: route.params?.resume });
  const isRunning = session.status === 'running';

  // Pulsing dot for the "coming soon" banner.
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [pulse]);
  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + pulse.value * 0.6,
    transform: [{ scale: 0.85 + pulse.value * 0.4 }],
  }));

  // Permission still resolving.
  if (!permission) {
    return (
      <ScreenContainer scroll={false}>
        <LoadingSpinner label="Preparing camera…" />
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
              ? 'RepCount shows a live preview so future updates can count your reps on-device. The camera feed never leaves your phone.'
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

  // Finished — show the saved summary.
  if (session.status === 'finished' && session.savedSession) {
    const saved = session.savedSession;
    return (
      <ScreenContainer>
        <View style={styles.summaryHeader}>
          <Ionicons name="checkmark-circle" size={56} color={theme.colors.success} />
          <AppText variant="title" center style={{ marginTop: theme.spacing.md }}>
            Workout complete
          </AppText>
          <AppText variant="body" color="textSecondary" center style={{ marginTop: 4 }}>
            Saved to your history.
          </AppText>
        </View>

        <View style={{ marginTop: theme.spacing.xl }}>
          <WorkoutSummary session={saved} />
        </View>

        <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.md }}>
          <Button label="Done" icon="home-outline" onPress={() => navigation.navigate('Home')} />
          <Button label="Start another" variant="secondary" onPress={session.start} />
        </View>
      </ScreenContainer>
    );
  }

  // Active experience (idle / running / paused) over the camera preview.
  return (
    <View style={styles.flex}>
      <CameraView style={StyleSheet.absoluteFill} facing={facing} />
      <View style={[StyleSheet.absoluteFill, styles.scrim]} pointerEvents="none" />

      <View style={[styles.overlay, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <OverlayButton icon="chevron-back" onPress={() => navigation.goBack()} />
          <AppText variant="subtitle" color="onOverlay">
            Workout
          </AppText>
          <OverlayButton
            icon="camera-reverse-outline"
            onPress={() => setFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
          />
        </View>

        {/* Center: counter + timer + coming-soon banner */}
        <View style={styles.center}>
          <View style={styles.bannerPill}>
            <Animated.View style={[styles.dot, dotStyle]} />
            <AppText variant="caption" color="onOverlay" style={styles.bannerText}>
              AI Pose Detection Coming Soon
            </AppText>
          </View>

          <RepCounter
            reps={session.currentReps}
            caption={isRunning ? 'Tap to add a rep · simulated' : undefined}
            onPress={isRunning ? () => session.addRep() : undefined}
            onOverlay
            style={{ marginTop: theme.spacing.xl }}
          />

          <View style={{ marginTop: theme.spacing.md }}>
            <Timer seconds={session.elapsedSec} running={isRunning} onOverlay />
          </View>
        </View>

        {/* Bottom: exercise selector + controls */}
        <View>
          <AppText variant="caption" color="onOverlay" style={styles.selectorLabel}>
            EXERCISE
          </AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selector}
          >
            {EXERCISES.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                compact
                selected={exercise.id === session.selectedExerciseId}
                onPress={() => session.selectExercise(exercise.id)}
              />
            ))}
          </ScrollView>

          <Animated.View entering={FadeIn.duration(200)} style={styles.controls}>
            {session.status === 'idle' ? (
              <Button label="Start" icon="play" size="lg" onPress={session.start} />
            ) : (
              <View style={styles.controlRow}>
                {isRunning ? (
                  <Button
                    label="Pause"
                    icon="pause"
                    variant="secondary"
                    size="lg"
                    onPress={session.pause}
                    style={styles.controlButton}
                  />
                ) : (
                  <Button
                    label="Resume"
                    icon="play"
                    variant="secondary"
                    size="lg"
                    onPress={session.resume}
                    style={styles.controlButton}
                  />
                )}
                <Button
                  label="Finish"
                  icon="flag"
                  size="lg"
                  onPress={() => void session.finish()}
                  style={styles.controlButton}
                />
              </View>
            )}
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

function OverlayButton({
  icon,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
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
  scrim: { backgroundColor: 'rgba(0,0,0,0.35)' },
  overlay: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 20 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overlayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pressed: { opacity: 0.7 },
  center: { alignItems: 'center' },
  bannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6369', marginRight: 8 },
  bannerText: { fontWeight: '600' },
  selectorLabel: { letterSpacing: 1, marginBottom: 8, opacity: 0.9 },
  selector: { gap: 10, paddingRight: 4 },
  controls: { marginTop: 16 },
  controlRow: { flexDirection: 'row', gap: 12 },
  controlButton: { flex: 1 },
  summaryHeader: { alignItems: 'center', marginTop: 16 },
  permissionActions: { alignSelf: 'stretch', gap: 12 },
});

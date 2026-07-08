import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  type CameraRuntimeError,
} from 'react-native-vision-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, EmptyState, ScreenContainer } from '@/components';
import { useHaptics } from '@/hooks';
import type { RootStackScreenProps } from '@/navigation';
import { usePoseDetection } from '@/services/pose';
import { useTheme } from '@/theme';

/**
 * Live workout screen with real on-device pose detection.
 *
 * The camera + skeleton rendering is delegated entirely to `usePoseDetection`
 * (see `services/pose`). This screen only owns the camera *chrome*: permission,
 * device selection, and the loading / error / "no person" / FPS overlays. It
 * never touches TensorFlow, Skia or the resize plugin directly.
 */
export function WorkoutSessionScreen({
  navigation,
}: RootStackScreenProps<'WorkoutSession'>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { impact } = useHaptics();
  const isFocused = useIsFocused();

  const { hasPermission, requestPermission } = useCameraPermission();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const device = useCameraDevice(facing);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Streaming only while focused + permitted + a camera exists. Losing focus
  // pauses the camera and releases smoothing state (see the hook).
  const isActive = isFocused && hasPermission && device != null && cameraError == null;

  const pose = usePoseDetection({
    isActive,
    mirror: facing === 'front',
    skeletonStyle: { jointColor: theme.colors.primary },
  });

  // Camera permission not granted — explain why and offer to request it.
  if (!hasPermission) {
    return (
      <ScreenContainer scroll={false}>
        <EmptyState
          icon="camera-outline"
          title="Camera access needed"
          message="RepCount analyzes your movement on-device to count reps. The camera feed is processed locally and never leaves your phone."
          action={
            <View style={styles.actions}>
              <Button label="Grant camera access" icon="camera" onPress={requestPermission} />
              <Button label="Go back" variant="ghost" onPress={() => navigation.goBack()} />
            </View>
          }
        />
      </ScreenContainer>
    );
  }

  // No usable camera (e.g. a simulator without a camera device).
  if (device == null) {
    return (
      <ScreenContainer scroll={false}>
        <EmptyState
          icon="videocam-off-outline"
          title="No camera available"
          message="This device doesn't expose a camera we can use for pose detection."
          action={<Button label="Go back" variant="ghost" onPress={() => navigation.goBack()} />}
        />
      </ScreenContainer>
    );
  }

  return (
    <View style={styles.flex}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        frameProcessor={pose.frameProcessor}
        resizeMode="cover"
        onError={(error: CameraRuntimeError) => setCameraError(error.message)}
      />

      {/* Top scrim + controls */}
      <View style={[styles.topBar, { paddingTop: insets.top + theme.spacing.sm }]}>
        <OverlayButton
          icon="chevron-back"
          onPress={() => {
            impact('light');
            navigation.goBack();
          }}
        />
        <AppText variant="subtitle" color="onOverlay">
          Workout
        </AppText>
        <View style={styles.topRight}>
          <OverlayButton
            icon="bug-outline"
            active={showDebug}
            onPress={() => setShowDebug((prev) => !prev)}
          />
          <OverlayButton
            icon="camera-reverse-outline"
            onPress={() => {
              impact('light');
              setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
            }}
          />
        </View>
      </View>

      {/* FPS debug overlay (optional) */}
      {showDebug ? (
        <View style={[styles.debug, { top: insets.top + 56 }]} pointerEvents="none">
          <AppText variant="caption" color="onOverlay">
            {pose.fps} FPS · {pose.delegate ?? '—'}
          </AppText>
        </View>
      ) : null}

      {/* Camera failed at runtime */}
      {cameraError ? (
        <CenterOverlay>
          <EmptyState
            icon="alert-circle-outline"
            title="Camera error"
            message={cameraError}
            action={
              <Button label="Try again" icon="refresh" onPress={() => setCameraError(null)} />
            }
          />
        </CenterOverlay>
      ) : pose.status === 'error' ? (
        <CenterOverlay>
          <EmptyState
            icon="alert-circle-outline"
            title="Pose detection unavailable"
            message={pose.errorMessage ?? 'The pose model failed to load.'}
            action={<Button label="Retry" icon="refresh" onPress={pose.retry} />}
          />
        </CenterOverlay>
      ) : pose.status === 'loading' ? (
        <CenterOverlay pointerEvents="none">
          <ActivityIndicator color="#FFFFFF" size="large" />
          <AppText variant="bodyStrong" color="onOverlay" center style={styles.loadingText}>
            Starting pose detection…
          </AppText>
        </CenterOverlay>
      ) : null}

      {/* Live status pill (only once the model is running) */}
      {pose.status === 'ready' && !cameraError ? (
        <View
          style={[styles.banner, { bottom: insets.bottom + theme.spacing.xxl }]}
          pointerEvents="none"
        >
          <View style={styles.bannerPill}>
            <View
              style={[
                styles.dot,
                { backgroundColor: pose.personDetected ? theme.colors.success : theme.colors.warning },
              ]}
            />
            <AppText variant="bodyStrong" color="onOverlay">
              {pose.personDetected ? 'Tracking pose' : 'No person detected'}
            </AppText>
          </View>
          {!pose.personDetected ? (
            <AppText variant="caption" color="onOverlay" center style={styles.bannerHint}>
              Step back so your whole body is in frame.
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function CenterOverlay({
  children,
  pointerEvents,
}: {
  children: React.ReactNode;
  pointerEvents?: 'none' | 'auto';
}) {
  return (
    <View style={styles.centerOverlay} pointerEvents={pointerEvents}>
      <View style={styles.centerCard}>{children}</View>
    </View>
  );
}

function OverlayButton({
  icon,
  onPress,
  active,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.overlayButton,
        active && styles.overlayButtonActive,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={24} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
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
  },
  topRight: { flexDirection: 'row', gap: 12 },
  overlayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  overlayButtonActive: { backgroundColor: 'rgba(108,92,231,0.85)' },
  pressed: { opacity: 0.7 },
  debug: {
    position: 'absolute',
    left: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 24,
  },
  centerCard: { alignSelf: 'stretch', alignItems: 'center' },
  loadingText: { marginTop: 16 },
  banner: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
  bannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  bannerHint: { marginTop: 10, opacity: 0.85 },
  actions: { alignSelf: 'stretch', gap: 12 },
});

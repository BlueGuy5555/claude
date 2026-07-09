import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, EmptyState, ScreenContainer } from '@/components';
import {
  AIErrorBoundary,
  PoseCameraView,
  useCameraAccess,
  type CameraFacing,
  type WorkoutMetrics,
} from '@/ai';
import { useSettings } from '@/context';
import { useHaptics } from '@/hooks';
import type { RootStackScreenProps } from '@/navigation';
import { buildSession, exerciseName } from '@/services';
import { addSessionToHistory } from '@/storage';
import { useTheme } from '@/theme';
import { CONFIDENCE_THRESHOLDS } from '@/types';

/** Cap processing throughput; the frame processor drops frames above this. */
const TARGET_FPS = 15;

const CameraStage = React.memo(PoseCameraView);

export function WorkoutSessionScreen({
  route,
  navigation,
}: RootStackScreenProps<'WorkoutSession'>) {
  const { exerciseId } = route.params;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { settings } = useSettings();
  const { impact, notify } = useHaptics();

  const [facing, setFacing] = useState<CameraFacing>('back');
  const { hasPermission, requestPermission, hasDevice } = useCameraAccess(facing);

  const [counting, setCounting] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [reps, setReps] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState('Ready');
  const [confidence, setConfidence] = useState(0);
  const [fps, setFps] = useState(0);
  const [modelReady, setModelReady] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const startedAtRef = useRef<Date | null>(null);
  const impactRef = useRef(impact);
  impactRef.current = impact;

  const minConfidence = CONFIDENCE_THRESHOLDS[settings.confidence];
  const mirror = facing === 'front' && settings.mirrorFrontCamera;

  const onMetrics = useCallback((m: WorkoutMetrics) => {
    setReps(m.reps);
    setPhaseLabel(m.phaseLabel);
    setConfidence(m.confidence);
    setFps(m.fps);
    if (m.repCompleted) impactRef.current('medium');
  }, []);

  const onModelReady = useCallback(() => setModelReady(true), []);
  const onError = useCallback((message: string) => setFatalError(message), []);

  const start = () => {
    startedAtRef.current = new Date();
    setReps(0);
    setResetToken((t) => t + 1);
    setCounting(true);
    impact('light');
  };

  const togglePause = () => {
    impact('light');
    setCounting((c) => !c);
  };

  const finish = useCallback(async () => {
    setCounting(false);
    const startedAt = startedAtRef.current;
    if (startedAt && reps > 0) {
      await addSessionToHistory(
        buildSession({ exerciseId, reps, startedAt, endedAt: new Date() }),
      );
      notify('success');
    }
    navigation.goBack();
  }, [exerciseId, reps, notify, navigation]);

  // --- Permission gates -----------------------------------------------------

  if (!hasPermission) {
    return (
      <ScreenContainer scroll={false}>
        <EmptyState
          icon="camera-outline"
          title="Camera access needed"
          message="RepCount counts your reps on-device by watching your form. The camera feed is processed locally and never leaves your phone."
          action={
            <View style={styles.permissionActions}>
              <Button label="Grant camera access" icon="camera" onPress={requestPermission} />
              <Button label="Go back" variant="ghost" onPress={() => navigation.goBack()} />
            </View>
          }
        />
      </ScreenContainer>
    );
  }

  if (!hasDevice) {
    return (
      <ScreenContainer scroll={false}>
        <EmptyState
          icon="videocam-off-outline"
          title="No camera found"
          message="This device doesn't expose a usable camera for the selected direction. Try flipping the camera or use a physical device."
          action={<Button label="Go back" variant="ghost" onPress={() => navigation.goBack()} />}
        />
      </ScreenContainer>
    );
  }

  const cameraActive = isFocused && fatalError === null;

  return (
    <View style={styles.flex}>
      <AIErrorBoundary onError={onError} fallback={<View style={styles.cameraFallback} />}>
        <CameraStage
          exerciseId={exerciseId}
          facing={facing}
          active={cameraActive}
          counting={counting}
          minConfidence={minConfidence}
          showSkeleton={settings.showSkeleton}
          mirror={mirror}
          targetFps={TARGET_FPS}
          resetToken={resetToken}
          skeletonColor={theme.colors.primary}
          jointColor={theme.colors.accent}
          onMetrics={onMetrics}
          onModelReady={onModelReady}
          onError={onError}
        />
      </AIErrorBoundary>

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + theme.spacing.sm }]}>
        <OverlayButton icon="chevron-back" onPress={() => navigation.goBack()} />
        <AppText variant="subtitle" color="onOverlay">
          {exerciseName(exerciseId)}
        </AppText>
        <OverlayButton
          icon="camera-reverse-outline"
          onPress={() => {
            impact('light');
            setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
          }}
        />
      </View>

      {/* Live metrics */}
      {fatalError ? (
        <View style={styles.centerOverlay} pointerEvents="none">
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={28} color="#FFFFFF" />
            <AppText variant="bodyStrong" color="onOverlay" center style={{ marginTop: 8 }}>
              Pose detection unavailable
            </AppText>
            <AppText variant="caption" color="onOverlay" center style={styles.errorHint}>
              This feature needs a development build (native camera + TFLite). {fatalError}
            </AppText>
          </View>
        </View>
      ) : (
        <View style={styles.metrics} pointerEvents="none">
          <AppText style={styles.repCount}>{reps}</AppText>
          <AppText variant="subtitle" color="onOverlay" style={styles.phase}>
            {counting ? phaseLabel : 'Paused'}
          </AppText>
          <View style={styles.badges}>
            <ConfidenceBadge confidence={confidence} minConfidence={minConfidence} />
            {settings.debugFps ? (
              <View style={styles.badge}>
                <AppText variant="caption" color="onOverlay">
                  {fps.toFixed(0)} FPS
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
      )}

      {/* Loading chip while the model warms up */}
      {!modelReady && !fatalError ? (
        <View style={[styles.loadingChip, { top: insets.top + 64 }]} pointerEvents="none">
          <ActivityIndicator color="#FFFFFF" size="small" />
          <AppText variant="caption" color="onOverlay" style={{ marginLeft: 8 }}>
            Loading pose model…
          </AppText>
        </View>
      ) : null}

      {/* Controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + theme.spacing.lg }]}>
        {counting ? (
          <View style={styles.controlRow}>
            <Button label="Pause" icon="pause" variant="secondary" onPress={togglePause} style={styles.controlBtn} />
            <Button label="Finish" icon="checkmark" onPress={finish} style={styles.controlBtn} />
          </View>
        ) : reps > 0 ? (
          <View style={styles.controlRow}>
            <Button label="Resume" icon="play" variant="secondary" onPress={togglePause} style={styles.controlBtn} />
            <Button label="Finish" icon="checkmark" onPress={finish} style={styles.controlBtn} />
          </View>
        ) : (
          <Button
            label="Start"
            icon="play"
            size="lg"
            disabled={!modelReady || fatalError !== null}
            onPress={start}
          />
        )}
      </View>
    </View>
  );
}

function ConfidenceBadge({
  confidence,
  minConfidence,
}: {
  confidence: number;
  minConfidence: number;
}) {
  const color = confidence >= 0.5 ? '#3FCF8E' : confidence >= minConfidence ? '#F5B23D' : '#FF6369';
  return (
    <View style={styles.badge}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="caption" color="onOverlay">
        {Math.round(confidence * 100)}%
      </AppText>
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
  cameraFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
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
  overlayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  pressed: { opacity: 0.7 },
  metrics: { position: 'absolute', top: '30%', left: 0, right: 0, alignItems: 'center' },
  repCount: {
    color: '#FFFFFF',
    fontSize: 96,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  phase: { marginTop: -4, letterSpacing: 1 },
  badges: { flexDirection: 'row', gap: 8, marginTop: 12 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  centerOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  errorCard: {
    maxWidth: 320,
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  errorHint: { marginTop: 8, opacity: 0.85 },
  loadingChip: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  controls: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 0,
  },
  controlRow: { flexDirection: 'row', gap: 12 },
  controlBtn: { flex: 1 },
  permissionActions: { alignSelf: 'stretch', gap: 12 },
});

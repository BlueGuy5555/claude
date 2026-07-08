import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, EmptyState, ScreenContainer } from '@/components';
import { useHaptics } from '@/hooks';
import type { RootStackScreenProps } from '@/navigation';
import { useTheme } from '@/theme';

/**
 * Live camera preview screen. Pose detection is intentionally NOT implemented
 * here — the screen only proves out camera permissions + preview and shows a
 * "coming soon" banner. No TensorFlow / ML dependencies are imported.
 */
export function WorkoutSessionScreen({
  navigation,
}: RootStackScreenProps<'WorkoutSession'>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { impact } = useHaptics();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');

  // Gently pulsing "recording" style dot for the coming-soon banner.
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
              ? 'RepCount shows a live preview so future updates can count your reps on-device. The camera feed never leaves your phone.'
              : 'Camera access is disabled. Enable it in your device Settings to use workout sessions.'
          }
          action={
            <View style={styles.permissionActions}>
              {permission.canAskAgain ? (
                <Button
                  label="Grant camera access"
                  icon="camera"
                  onPress={requestPermission}
                />
              ) : null}
              <Button
                label="Go back"
                variant="ghost"
                onPress={() => navigation.goBack()}
              />
            </View>
          }
        />
      </ScreenContainer>
    );
  }

  // Permission granted — show the live preview with an overlay.
  return (
    <View style={styles.flex}>
      <CameraView style={StyleSheet.absoluteFill} facing={facing} />

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
        <OverlayButton
          icon="camera-reverse-outline"
          onPress={() => {
            impact('light');
            setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
          }}
        />
      </View>

      {/* Coming-soon banner */}
      <View
        style={[styles.banner, { bottom: insets.bottom + theme.spacing.xxl }]}
        pointerEvents="none"
      >
        <View style={styles.bannerPill}>
          <Animated.View style={[styles.dot, dotStyle]} />
          <AppText variant="bodyStrong" color="onOverlay">
            AI Pose Detection Coming Soon
          </AppText>
        </View>
        <AppText variant="caption" color="onOverlay" center style={styles.bannerHint}>
          Automatic rep counting arrives in a future update.
        </AppText>
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
  banner: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
  bannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6369',
    marginRight: 10,
  },
  bannerHint: { marginTop: 10, opacity: 0.85 },
  permissionActions: { alignSelf: 'stretch', gap: 12 },
});

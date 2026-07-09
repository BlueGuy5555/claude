import * as Haptics from 'expo-haptics';
import { useCallback, useMemo } from 'react';

import { useSettings } from '@/context';

type ImpactStyle = 'light' | 'medium' | 'heavy';
type NotifyType = 'success' | 'warning' | 'error';

const IMPACT_MAP: Record<ImpactStyle, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

const NOTIFY_MAP: Record<NotifyType, Haptics.NotificationFeedbackType> = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
};

/**
 * Haptic feedback that automatically respects the user's "vibration" setting.
 * When vibration is disabled every call becomes a no-op, so callers never have
 * to check the setting themselves. Haptics are also unsupported on web, hence
 * the swallowed promise rejections.
 */
export function useHaptics() {
  const { settings } = useSettings();
  const enabled = settings.vibration;

  const impact = useCallback(
    (style: ImpactStyle = 'light') => {
      if (!enabled) return;
      void Haptics.impactAsync(IMPACT_MAP[style]).catch(() => undefined);
    },
    [enabled],
  );

  const notify = useCallback(
    (type: NotifyType = 'success') => {
      if (!enabled) return;
      void Haptics.notificationAsync(NOTIFY_MAP[type]).catch(() => undefined);
    },
    [enabled],
  );

  const selection = useCallback(() => {
    if (!enabled) return;
    void Haptics.selectionAsync().catch(() => undefined);
  }, [enabled]);

  return useMemo(() => ({ impact, notify, selection }), [impact, notify, selection]);
}

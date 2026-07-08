import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';

interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as destructive (red). */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A themed confirmation modal used for destructive actions (deleting a workout,
 * clearing history, resetting settings). Tapping the scrim cancels.
 */
export function ConfirmationDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View
        entering={FadeIn.duration(150)}
        style={[styles.scrim, { backgroundColor: theme.colors.overlay }]}
      >
        {/* Tap outside to dismiss. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

        <Animated.View
          entering={FadeInDown.duration(200)}
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.xl,
              padding: theme.spacing.xl,
            },
          ]}
        >
          <AppText variant="title">{title}</AppText>
          <AppText
            variant="body"
            color="textSecondary"
            style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.xl }}
          >
            {message}
          </AppText>

          <View style={styles.actions}>
            <Button label={cancelLabel} variant="secondary" onPress={onCancel} style={styles.action} />
            <Button
              label={confirmLabel}
              danger={destructive}
              onPress={onConfirm}
              style={styles.action}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  card: { width: '100%', maxWidth: 380 },
  actions: { flexDirection: 'row', gap: 12 },
  action: { flex: 1 },
});

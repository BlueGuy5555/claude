import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { EXERCISES } from '@/constants';
import type { ExerciseId } from '@/types';
import { useTheme } from '@/theme';

import { AppText } from './AppText';

interface ExercisePickerProps {
  current: ExerciseId;
  autoDetect: boolean;
  onSelect: (id: ExerciseId) => void;
  onToggleAuto: (on: boolean) => void;
  disabled?: boolean;
}

/**
 * Horizontal chip strip for choosing an exercise. The first chip toggles
 * automatic detection; picking any exercise is a manual override that always
 * wins over auto-detection.
 */
export function ExercisePicker({
  current,
  autoDetect,
  onSelect,
  onToggleAuto,
  disabled,
}: ExercisePickerProps) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={styles.scroll}
    >
      <Chip
        icon="sparkles-outline"
        label="Auto"
        active={autoDetect}
        onPress={() => onToggleAuto(!autoDetect)}
        disabled={disabled}
      />
      {EXERCISES.map((exercise) => (
        <Chip
          key={exercise.id}
          icon={exercise.icon}
          label={exercise.name}
          active={!autoDetect && current === exercise.id}
          onPress={() => onSelect(exercise.id)}
          disabled={disabled}
        />
      ))}
    </ScrollView>
  );

  function Chip({
    icon,
    label,
    active,
    onPress,
    disabled: chipDisabled,
  }: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    active: boolean;
    onPress: () => void;
    disabled?: boolean;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active, disabled: chipDisabled }}
        disabled={chipDisabled}
        onPress={onPress}
        style={[
          styles.chip,
          {
            backgroundColor: active ? theme.colors.primary : 'rgba(0,0,0,0.5)',
            opacity: chipDisabled ? 0.5 : 1,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={16}
          color={active ? theme.colors.onPrimary : '#FFFFFF'}
          style={styles.icon}
        />
        <AppText variant="bodyStrong" style={{ color: active ? theme.colors.onPrimary : '#FFFFFF', fontSize: 14 }}>
          {label}
        </AppText>
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  content: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  icon: { marginRight: 6 },
});

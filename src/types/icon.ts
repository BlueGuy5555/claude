import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

/**
 * Union of every valid Ionicons glyph name. Used anywhere the app passes an
 * icon name around (exercise metadata, history items, component props) so a
 * typo becomes a compile error rather than a blank icon at runtime.
 */
export type IconName = ComponentProps<typeof Ionicons>['name'];

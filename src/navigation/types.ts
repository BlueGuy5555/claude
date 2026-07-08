import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { ExerciseId } from '@/types';

/** All routes in the root stack and their params. */
export type RootStackParamList = {
  Home: undefined;
  WorkoutSession: { exerciseId?: ExerciseId } | undefined;
  WorkoutSummary: { sessionId: string };
  History: undefined;
  Statistics: undefined;
  Settings: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

// Makes `useNavigation()` fully typed everywhere without extra generics.
declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** All routes in the root stack and their params (none carry params yet). */
export type RootStackParamList = {
  Home: undefined;
  WorkoutSession: undefined;
  History: undefined;
  Statistics: undefined;
  Settings: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

// Makes `useNavigation()` fully typed everywhere without extra generics.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export { AngleCalculator } from './AngleCalculator';
export { PoseAnalyzer } from './PoseAnalyzer';
export {
  Ema,
  MovingAverage,
  VelocityEstimator,
  Confirmation,
  TemporalFilter,
} from './TemporalFilter';
export type { TemporalFilterConfig, TemporalFilterResult } from './TemporalFilter';
export { ExerciseStateMachine } from './ExerciseStateMachine';
export type { RepFrame, StepResult } from './ExerciseStateMachine';
export { ExerciseCounter } from './ExerciseCounter';
export { PushupCounter, SquatCounter } from './counters';
export { EXERCISE_DEFINITIONS } from './definitions';
export { createCounter } from './factory';

export type {
  RepState,
  ExercisePhase,
  PoseFeatures,
  SignalContext,
  ExerciseSignals,
  StateMachineConfig,
  ExerciseDefinition,
  RepUpdate,
  RepCounterLike,
} from './types';

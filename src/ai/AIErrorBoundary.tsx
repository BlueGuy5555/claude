import React from 'react';

interface Props {
  children: React.ReactNode;
  /** Rendered instead of the children after an error is caught. */
  fallback: React.ReactNode;
  /** Called once when an error is first caught. */
  onError?: (message: string) => void;
}

interface State {
  hasError: boolean;
}

/**
 * Guards the camera/ML subtree. On a real device with a development build the
 * pose pipeline runs normally; but if the native camera/TFLite modules are
 * unavailable (e.g. running in Expo Go) rendering the camera throws. Catching
 * it here means the app shows a helpful message instead of crashing.
 */
export class AIErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    this.props.onError?.(error.message);
  }

  render(): React.ReactNode {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

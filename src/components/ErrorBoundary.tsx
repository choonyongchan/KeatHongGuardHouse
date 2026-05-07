/**
 * @fileoverview Generic React error boundary component.
 * Catches unhandled errors in any child component tree and renders a fallback UI.
 */

import {
  Component,
  type ComponentType,
  type GetDerivedStateFromError,
  type PropsWithChildren,
  type ReactNode,
} from 'react';

/** Props for ErrorBoundary. */
export interface ErrorBoundaryProps extends PropsWithChildren {
  fallback?: ReactNode | ComponentType<{ error: unknown }>;
}

/** @internal */
interface ErrorBoundaryState {
  error?: unknown;
}

/**
 * React class-based error boundary.
 * Accepts a `fallback` prop — either a ReactNode or a component that receives the caught error.
 * If no fallback is provided, renders nothing on error.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {};

  // eslint-disable-next-line max-len
  static getDerivedStateFromError: GetDerivedStateFromError<ErrorBoundaryProps, ErrorBoundaryState> = (error) => ({ error });

  componentDidCatch(error: Error) {
    this.setState({ error });
  }

  /**
   * Renders children normally, or the fallback UI when an error has been caught.
   *
   * @returns Children, fallback component with error prop, fallback node, or null.
   */
  render() {
    const {
      state: {
        error,
      },
      props: {
        fallback: Fallback,
        children,
      },
    } = this;

    return 'error' in this.state
      ? typeof Fallback === 'function'
        ? <Fallback error={error} />
        : Fallback
      : children;
  }
}

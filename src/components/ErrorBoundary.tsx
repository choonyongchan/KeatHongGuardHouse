/**
 * @fileoverview Top-level error boundary: shows the error message instead of a blank screen.
 */

import { Component, type PropsWithChildren } from 'react';

export class ErrorBoundary extends Component<PropsWithChildren, { error?: unknown }> {
  state: { error?: unknown } = {};

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    if (!('error' in this.state)) return this.props.children;
    const { error } = this.state;
    return (
      <div style={{ padding: 24, color: 'var(--tg-theme-destructive-text-color)' }}>
        <p>Something went wrong:</p>
        <code style={{ fontSize: 12 }}>{error instanceof Error ? error.message : String(error)}</code>
      </div>
    );
  }
}

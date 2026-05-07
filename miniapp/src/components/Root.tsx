/**
 * @fileoverview Root — top-level component wrapping App in an error boundary.
 * TonConnect is removed; authentication is handled via Telegram initData.
 */

import { App } from '@/components/App.tsx';
import { ErrorBoundary } from '@/components/ErrorBoundary.tsx';

/**
 * Renders the error boundary fallback UI.
 *
 * @param props.error - The caught error.
 * @returns A styled error message block.
 */
function ErrorFallback({ error }: { error: unknown }) {
  return (
    <div style={{ padding: 24, color: 'var(--tg-theme-destructive-text-color)' }}>
      <p>Something went wrong:</p>
      <code style={{ fontSize: 12 }}>
        {error instanceof Error ? error.message : String(error)}
      </code>
    </div>
  );
}

/**
 * Application root. Mounts the ErrorBoundary and App.
 *
 * @returns The application root element.
 */
export function Root() {
  return (
    <ErrorBoundary fallback={ErrorFallback}>
      <App />
    </ErrorBoundary>
  );
}

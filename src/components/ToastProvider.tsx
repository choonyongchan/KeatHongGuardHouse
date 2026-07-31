import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { theme } from '../lib/theme.ts';

interface Toast {
  id: number;
  message: string;
}

interface ToastContextValue {
  showError: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 4000;

/**
 * Provides `showError` for surfacing errors as dismissible toasts, and
 * installs global `error`/`unhandledrejection` listeners so unhandled
 * errors are visible in production, where there is no browser console.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showError = useCallback((message: string) => {
    const id = nextId.current++;
    setToasts([{ id, message }]);
    setTimeout(() => dismiss(id), TOAST_DURATION_MS);
  }, [dismiss]);

  useEffect(() => {
    function handleError(event: ErrorEvent) {
      showError(event.message);
    }
    function handleRejection(event: PromiseRejectionEvent) {
      const reason: unknown = event.reason;
      showError(reason instanceof Error ? reason.message : String(reason));
    }

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [showError]);

  return (
    <ToastContext.Provider value={{ showError }}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: 12,
          left: 12,
          right: 12,
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            style={{
              background: theme.errorLight,
              border: `1px solid ${theme.errorBorder}`,
              color: theme.error,
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: 600,
              boxShadow: theme.shadow,
              pointerEvents: 'auto',
              cursor: 'pointer',
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Returns `{ showError }` for reporting errors as toasts. Must be used
 * within a `ToastProvider`.
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

import { useState } from 'react';
import { hapticFeedback } from '@tma.js/sdk-react';
import { track } from '@vercel/analytics/react';
import { useToast } from '../components/ToastProvider.tsx';

/**
 * Wraps an async UI action with the shared haptic → track → toast-on-error
 * flow. `busy` holds the key of the action in flight, for spinners.
 */
export function useRun() {
  const { showError } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function run<T>(key: string, fn: () => Promise<T>, event?: string): Promise<T | undefined> {
    hapticFeedback.impactOccurred('light');
    setBusy(key);
    try {
      const result = await fn();
      hapticFeedback.notificationOccurred('success');
      if (event) track(event);
      return result;
    } catch (e) {
      hapticFeedback.notificationOccurred('error');
      showError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  }

  return { run, busy };
}

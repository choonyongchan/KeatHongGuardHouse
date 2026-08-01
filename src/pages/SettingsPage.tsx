/**
 * @fileoverview SettingsPage — Tab 4. Notification subscription toggle and feedback form.
 */

import { useState } from 'react';
import useSWR from 'swr';
import {
  Cell,
  Section,
  Switch,
  Input,
  Button,
  Spinner,
} from '@telegram-apps/telegram-ui';
import { hapticFeedback } from '@tma.js/sdk-react';

import { getMe, setSubscription, submitFeedback } from '../lib/api.ts';
import type { UserProfile } from '../types.ts';

/**
 * Renders the notification subscription toggle cell.
 *
 * @param props.subscribed - Current subscription state.
 * @param props.onToggle - Called with the new desired state.
 * @param props.loading - Whether a toggle request is in-flight.
 * @returns A Cell with a Switch component.
 */
function SubscriptionCell({
  subscribed,
  onToggle,
  loading,
}: {
  subscribed: boolean;
  onToggle: (val: boolean) => void;
  loading: boolean;
}) {
  return (
    <Cell
      after={
        loading
          ? <Spinner size="s" />
          : <Switch checked={subscribed} onChange={(e) => onToggle(e.target.checked)} />
      }
      description="Notify me when groups open"
    >
      Notifications
    </Cell>
  );
}

/**
 * Inline feedback form with a textarea-style input and submit button.
 *
 * @param props.onClose - Called when the form should collapse.
 * @returns An inline panel for submitting feedback.
 */
function FeedbackPanel({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Submits the feedback message to the API.
   */
  async function handleSubmit() {
    if (!message.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await submitFeedback(message);
      hapticFeedback.notificationOccurred('success');
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '12px 16px 24px' }}>
      {done ? (
        <>
          <p style={{ color: 'var(--tg-theme-text-color)', textAlign: 'center', margin: '24px 0' }}>
            ✅ Thanks for your feedback!
          </p>
          <Button mode="filled" size="l" stretched onClick={onClose}>Close</Button>
        </>
      ) : (
        <>
          <Input
            placeholder="Tell us what you think… (max 1000 chars)"
            value={message}
            onChange={(e) => { setMessage(e.target.value); setError(null); }}
            status={error ? 'error' : undefined}
            header={error ?? undefined}
            maxLength={1000}
            multiple
          />
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <Button mode="outline" size="l" onClick={onClose}>Cancel</Button>
            <Button
              mode="filled"
              size="l"
              stretched
              onClick={() => void handleSubmit()}
              disabled={loading || !message.trim()}
            >
              {loading ? <Spinner size="s" /> : 'Submit'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Settings tab — subscription toggle and feedback form.
 *
 * @returns The settings page JSX element.
 */
export function SettingsPage() {
  const { data, mutate } = useSWR<UserProfile>('/api/users/me', getMe);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  async function handleToggle(val: boolean) {
    if (!data) return;
    setToggleLoading(true);
    setToggleError(null);
    try {
      hapticFeedback.impactOccurred('light');
      await setSubscription(val);
      await mutate({ ...data, subscribed: val }, false);
    } catch (e) {
      setToggleError(e instanceof Error ? e.message : 'Failed to update subscription');
    } finally {
      setToggleLoading(false);
    }
  }

  return (
    <div style={{ paddingBottom: 80, paddingTop: 16 }}>
      <Section header="Notifications">
        <SubscriptionCell
          subscribed={data?.subscribed ?? false}
          onToggle={(val) => void handleToggle(val)}
          loading={toggleLoading}
        />
        {toggleError && (
          <div style={{ padding: '4px 16px 8px', fontSize: 12, color: '#ef4444' }}>
            {toggleError}
          </div>
        )}
      </Section>

      <Section header="Support">
        <Cell
          onClick={() => setShowFeedback((v) => !v)}
          style={{ cursor: 'pointer' }}
        >
          Send Feedback
        </Cell>
        {showFeedback && <FeedbackPanel onClose={() => setShowFeedback(false)} />}
      </Section>

      <Section header="About">
        <Cell description="Connecting Neighbours One Group A Time">
          KeatHong GuardHouse v0.1.0
        </Cell>
      </Section>
    </div>
  );
}

/**
 * @fileoverview SettingsPage — Tab 4. Notification subscription toggle and feedback form.
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
import useSWR from 'swr';
import { Switch, Input, Button, Spinner } from '@telegram-apps/telegram-ui';
import { hapticFeedback } from '@tma.js/sdk-react';
import { track } from '@vercel/analytics/react';

import { getMe, setSubscription, submitFeedback } from '../lib/api.ts';
import type { UserProfile } from '../types.ts';
import { theme } from '../lib/theme.ts';

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
      color: theme.textSecondary, marginBottom: 8,
    }}>
      {label}
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div style={{
      background: theme.cardBg,
      borderRadius: 14,
      boxShadow: theme.shadow,
      marginBottom: 20,
      overflow: 'hidden',
    }}>
      {children}
    </div>
  );
}

/**
 * Renders the notification subscription toggle row.
 *
 * @param props.subscribed - Current subscription state.
 * @param props.onToggle - Called with the new desired state.
 * @param props.loading - Whether a toggle request is in-flight.
 * @returns A themed row with a Switch component.
 */
function SubscriptionRow({
  subscribed,
  onToggle,
  loading,
}: {
  subscribed: boolean;
  onToggle: (val: boolean) => void;
  loading: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px',
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: theme.textPrimary }}>Notifications</div>
        <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
          Notify me when groups open
        </div>
      </div>
      {loading
        ? <Spinner size="s" />
        : <Switch checked={subscribed} onChange={(e) => onToggle(e.target.checked)} />}
    </div>
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
      track('Submit Feedback');
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      {done ? (
        <>
          <p style={{ color: theme.textPrimary, textAlign: 'center', margin: '24px 0' }}>
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
      {/* Header */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ fontWeight: 800, fontSize: 22, color: theme.textPrimary }}>Settings</div>
      </div>

      <div style={{ padding: '0 16px' }}>
        <SectionLabel label="NOTIFICATIONS" />
        <Card>
          <SubscriptionRow
            subscribed={data?.subscribed ?? false}
            onToggle={(val) => void handleToggle(val)}
            loading={toggleLoading}
          />
          {toggleError && (
            <div style={{ padding: '0 16px 12px', fontSize: 12, color: theme.error }}>
              {toggleError}
            </div>
          )}
        </Card>

        <SectionLabel label="SUPPORT" />
        <Card>
          <div
            onClick={() => setShowFeedback((v) => !v)}
            style={{
              padding: '14px 16px', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, color: theme.textPrimary,
            }}
          >
            Send Feedback
          </div>
          {showFeedback && <FeedbackPanel onClose={() => setShowFeedback(false)} />}
        </Card>

        <SectionLabel label="ABOUT" />
        <Card>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: theme.textPrimary }}>
              KeatHong GuardHouse v0.1.0
            </div>
            <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
              Connecting Neighbours One Group A Time
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

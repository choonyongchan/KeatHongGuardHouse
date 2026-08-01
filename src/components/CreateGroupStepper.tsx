import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';
import { hapticFeedback } from '@tma.js/sdk-react';
import { createGroup } from '../lib/api.ts';
import type { FoodGroup, GroupVisibility } from '../types.ts';
import { copyInviteCode, shareInvite } from '../lib/share.ts';
import { theme } from '../lib/theme.ts';

interface GroupDraft {
  title: string;
  externalLink: string;
  maxMembers: number | null;   // null = No Limit
  customMembers: string;        // raw input when Custom selected
  expiryMinutes: number | null; // null = custom time chosen
  customTime: string;           // HH:MM string when Custom selected
  visibility: GroupVisibility;
}

const MEMBER_PRESETS = [2, 4, 8, 16, 32] as const;
const EXPIRY_PRESETS: { label: string; value: number }[] = [
  { label: '30m', value: 30 },
  { label: '1h',  value: 60 },
  { label: '2h',  value: 120 },
  { label: '4h',  value: 240 },
];

const hintStyle: CSSProperties = {
  fontSize: 13, color: theme.textSecondary, marginBottom: 10, marginTop: 0,
};

function chipStyle(selected: boolean, danger = false): CSSProperties {
  return {
    padding: '7px 14px',
    borderRadius: 20,
    border: selected
      ? `2px solid ${danger ? theme.error : theme.accent}`
      : `1.5px solid ${theme.border}`,
    background: selected ? (danger ? theme.errorLight : theme.accentLight) : 'transparent',
    color: selected ? (danger ? theme.error : theme.accent) : theme.textSecondary,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
  };
}

function inputStyle(hasError = false): CSSProperties {
  return {
    width: '100%',
    border: `1.5px solid ${hasError ? theme.error : theme.border}`,
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 13,
    color: theme.textPrimary,
    background: theme.cardBg,
    outline: 'none',
    boxSizing: 'border-box',
  };
}

interface StepProps {
  draft: GroupDraft;
  onChange: (patch: Partial<GroupDraft>) => void;
  error: string | null;
}

function StepTitle({ draft, onChange, error }: StepProps) {
  return (
    <div>
      <p style={hintStyle}>Give your group a name people will recognise</p>
      <input
        placeholder="e.g. Supper at Al-Ameen"
        value={draft.title}
        onChange={(e) => onChange({ title: e.target.value })}
        maxLength={60}
        autoComplete="off"
        style={inputStyle(!!error)}
        aria-label="Group title"
      />
      {error && <p style={{ color: theme.error, fontSize: 11, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

function StepLink({ draft, onChange, error }: StepProps) {
  return (
    <div>
      <p style={hintStyle}>Paste your GrabFood or Foodpanda cart link (optional)</p>
      <input
        placeholder="https://food.grab.com/…"
        value={draft.externalLink}
        onChange={(e) => onChange({ externalLink: e.target.value })}
        inputMode="url"
        autoComplete="off"
        style={inputStyle(!!error)}
        aria-label="Order link"
      />
      {error && <p style={{ color: theme.error, fontSize: 11, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

function StepMembers({ draft, onChange, error }: StepProps) {
  const isCustomSelected = draft.maxMembers !== null &&
    !MEMBER_PRESETS.includes(draft.maxMembers as typeof MEMBER_PRESETS[number]);
  const isNoLimit = draft.maxMembers === null;

  function selectPreset(n: number) {
    onChange({ maxMembers: n, customMembers: '' });
  }
  function selectNoLimit() {
    onChange({ maxMembers: null, customMembers: '' });
  }
  function selectCustom() {
    onChange({ maxMembers: -1, customMembers: '' });
  }

  return (
    <div>
      <p style={hintStyle}>How many people can join?</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {MEMBER_PRESETS.map((n) => (
          <button key={n} onClick={() => selectPreset(n)} style={chipStyle(draft.maxMembers === n)}>
            {n}
          </button>
        ))}
        <button onClick={selectNoLimit} style={chipStyle(isNoLimit)}>No Limit</button>
        <button onClick={selectCustom} style={chipStyle(isCustomSelected)}>Custom</button>
      </div>
      {isCustomSelected && (
        <input
          type="number"
          min={2}
          placeholder="Enter number (min 2)"
          value={draft.customMembers}
          onChange={(e) => {
            const val = e.target.value;
            onChange({ customMembers: val, maxMembers: val ? Math.max(2, parseInt(val, 10)) : -1 });
          }}
          style={inputStyle(!!error)}
          aria-label="Custom member count"
        />
      )}
      {error && <p style={{ color: theme.error, fontSize: 11, marginTop: 4 }}>{error}</p>}

      <p style={{ ...hintStyle, marginTop: 18 }}>Who can find this group?</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => onChange({ visibility: 'public' })} style={chipStyle(draft.visibility === 'public')}>
          🌐 Public
        </button>
        <button onClick={() => onChange({ visibility: 'private' })} style={chipStyle(draft.visibility === 'private')}>
          🔒 Private
        </button>
      </div>
      <p style={{ fontSize: 12, color: theme.textSecondary, marginTop: 6 }}>
        {draft.visibility === 'public'
          ? 'Anyone can find it in the Browse tab.'
          : 'Only joinable by code or link — not shown in Browse.'}
      </p>
    </div>
  );
}

function StepExpiry({ draft, onChange, error }: StepProps) {
  const isCustomSelected = draft.expiryMinutes === null;
  const selectedValue = draft.expiryMinutes;

  function selectPreset(value: number) {
    onChange({ expiryMinutes: value, customTime: '' });
  }
  function selectCustom() {
    onChange({ expiryMinutes: null, customTime: '' });
  }

  return (
    <div>
      <p style={hintStyle}>Group closes after this time</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {EXPIRY_PRESETS.map(({ label, value }) => (
          <button key={value} onClick={() => selectPreset(value)} style={chipStyle(selectedValue === value)}>
            {label}
          </button>
        ))}
        <button onClick={selectCustom} style={chipStyle(isCustomSelected)}>Custom</button>
      </div>
      {isCustomSelected && (
        <div>
          <input
            type="time"
            value={draft.customTime}
            onChange={(e) => onChange({ customTime: e.target.value })}
            style={inputStyle(!!error)}
            aria-label="Custom close time"
          />
          {draft.customTime && (
            <p style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
              Closes at {draft.customTime}
            </p>
          )}
        </div>
      )}
      {error && <p style={{ color: theme.error, fontSize: 11, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

interface StepInviteProps {
  group: FoodGroup;
  onViewDetails: () => void;
}

function StepInvite({ group, onViewDetails }: StepInviteProps) {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  function flashCopyFeedback(message: string) {
    setCopyFeedback(message);
    setTimeout(() => setCopyFeedback(null), 2000);
  }

  async function handleCopyCode() {
    hapticFeedback.impactOccurred('light');
    try {
      await copyInviteCode(group.code);
      flashCopyFeedback('Code copied!');
    } catch {
      flashCopyFeedback('Could not copy');
    }
  }

  async function handleShare() {
    hapticFeedback.impactOccurred('light');
    try {
      const result = await shareInvite(group.code, group.title);
      if (result === 'copied') flashCopyFeedback('Link copied!');
    } catch {
      flashCopyFeedback('Could not share');
    }
  }

  return (
    <div>
      <p style={hintStyle}>Get the word out to your neighbours</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: theme.textSecondary, marginBottom: 12 }}>
        {group.visibility === 'public' ? (
          <>
            <span>🔍</span> Friends can find it in the <strong style={{ color: theme.textPrimary }}>&nbsp;Browse&nbsp;</strong> tab
          </>
        ) : (
          <>
            <span>🔒</span> Private — only people with the code or link can join
          </>
        )}
      </div>

      <div style={{
        background: theme.accentLight,
        border: `1.5px solid ${theme.accentBorder}`,
        borderRadius: 12,
        padding: '14px 16px',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 28, fontWeight: 800, letterSpacing: 3,
          color: theme.textPrimary, fontFamily: 'monospace',
          marginBottom: 12, wordBreak: 'break-all',
        }}>
          {group.code}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => void handleCopyCode()}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              background: theme.cardBg, color: theme.textPrimary,
              border: `1.5px solid ${theme.accentBorder}`,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            📋 Copy code
          </button>
          <button
            onClick={() => void handleShare()}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              background: theme.accent, color: '#fff',
              border: 'none',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            ↗ Share link
          </button>
        </div>
        {copyFeedback && (
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.accent, marginTop: 8 }}>
            {copyFeedback}
          </div>
        )}
      </div>

      <button
        onClick={onViewDetails}
        style={{
          width: '100%', marginTop: 16, padding: '11px 0', borderRadius: 10,
          border: 'none', background: theme.accent, color: '#fff',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}
      >
        View group details →
      </button>
    </div>
  );
}

function validateStep(step: number, draft: GroupDraft): string | null {
  if (step === 0) {
    if (!draft.title.trim()) return 'Please enter a name';
    if (draft.title.length > 60) return 'Name must be under 60 characters';
  }
  if (step === 1) {
    if (draft.externalLink && !draft.externalLink.startsWith('http')) return 'Link must start with http';
  }
  if (step === 2) {
    if (draft.maxMembers === -1) return 'Please enter a valid number (min 2)';
  }
  if (step === 3) {
    if (draft.expiryMinutes === null) {
      if (!draft.customTime) return 'Please pick a time';
      const [h, m] = draft.customTime.split(':').map(Number);
      const chosen = new Date();
      chosen.setHours(h, m, 0, 0);
      if (chosen.getTime() - Date.now() < 15 * 60 * 1000) return 'Must be at least 15 minutes from now';
    }
  }
  return null;
}

function resolveExpiryMinutes(draft: GroupDraft): number {
  if (draft.expiryMinutes !== null) return draft.expiryMinutes;
  const [h, m] = draft.customTime.split(':').map(Number);
  const chosen = new Date();
  chosen.setHours(h, m, 0, 0);
  return Math.max(1, Math.round((chosen.getTime() - Date.now()) / 60_000));
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 20 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 4, borderRadius: 2,
          background: i <= step ? theme.accent : theme.border,
          transition: 'background 0.2s',
        }} />
      ))}
      <span style={{ fontSize: 11, color: theme.textMuted, whiteSpace: 'nowrap', marginLeft: 4 }}>
        {step + 1} of {total}
      </span>
    </div>
  );
}

const STEP_HEADINGS = [
  'What are you ordering?',
  'Paste your order link',
  'How many spots?',
  'When does it close?',
  'Invite your friends',
];

interface CreateGroupStepperProps {
  onCreated: (group: FoodGroup) => void;
}

export function CreateGroupStepper({ onCreated }: CreateGroupStepperProps) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<GroupDraft>({
    title: '',
    externalLink: '',
    maxMembers: 4,
    customMembers: '',
    expiryMinutes: 60,
    customTime: '',
    visibility: 'public',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<FoodGroup | null>(null);

  function handleChange(patch: Partial<GroupDraft>) {
    setDraft((d) => ({ ...d, ...patch }));
    setError(null);
  }

  function handleNext() {
    const err = validateStep(step, draft);
    if (err) { setError(err); return; }
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    const err = validateStep(step, draft);
    if (err) { setError(err); return; }
    setLoading(true);
    setError(null);
    try {
      const group = await createGroup({
        title: draft.title.trim(),
        externalLink: draft.externalLink.trim(),
        maxMembers: draft.maxMembers === -1 ? null : draft.maxMembers,
        expiryMinutes: resolveExpiryMinutes(draft),
        visibility: draft.visibility,
      });
      hapticFeedback.notificationOccurred('success');
      setCreatedGroup(group);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create group');
    } finally {
      setLoading(false);
    }
  }

  const stepProps: StepProps = { draft, onChange: handleChange, error };
  const isSubmitStep = step === 3;
  const isInviteStep = step === 4;

  return (
    <div style={{ padding: '16px 16px 24px' }}>
      <ProgressBar step={step} total={5} />

      <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800, color: theme.textPrimary }}>
        {STEP_HEADINGS[step]}
      </h2>

      {step === 0 && <StepTitle {...stepProps} />}
      {step === 1 && <StepLink {...stepProps} />}
      {step === 2 && <StepMembers {...stepProps} />}
      {step === 3 && <StepExpiry {...stepProps} />}
      {isInviteStep && createdGroup && (
        <StepInvite group={createdGroup} onViewDetails={() => onCreated(createdGroup)} />
      )}

      {isSubmitStep && error && (
        <p style={{ color: theme.error, fontSize: 13, marginTop: 8 }}>{error}</p>
      )}

      {!isInviteStep && (
        <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
          {step > 0 && (
            <button
              onClick={() => { setStep((s) => s - 1); setError(null); }}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 10,
                border: `1.5px solid ${theme.border}`,
                background: 'transparent', color: theme.textSecondary,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              ← Back
            </button>
          )}
          <button
            onClick={isSubmitStep ? handleSubmit : handleNext}
            disabled={loading}
            style={{
              flex: 2, padding: '11px 0', borderRadius: 10,
              border: 'none',
              background: loading ? theme.accentBorder : theme.accent,
              color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            }}
            aria-label={isSubmitStep ? 'Create group' : 'Next step'}
          >
            {loading ? <Spinner size="s" /> : isSubmitStep ? 'Create Group ✓' : 'Next →'}
          </button>
        </div>
      )}
    </div>
  );
}

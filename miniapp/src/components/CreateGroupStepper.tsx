/**
 * @fileoverview CreateGroupStepper — 4-step wizard for creating a new food group.
 * Steps: 1) Title → 2) Link → 3) Max members → 4) Expiry → Confirm
 */

import { useState } from 'react';
import { Button, Input, Spinner } from '@telegram-apps/telegram-ui';
import { createGroup } from '../lib/api.ts';
import type { FoodGroup } from '../types.ts';

/** The form state collected across all steps. */
interface GroupDraft {
  title: string;
  externalLink: string;
  maxMembers: number;
  expiryMinutes: number;
}

const MEMBER_PRESETS = [2, 3, 4, 5, 6] as const;
const EXPIRY_PRESETS: { label: string; value: number }[] = [
  { label: '30m', value: 30 },
  { label: '1h', value: 60 },
  { label: '2h', value: 120 },
  { label: '4h', value: 240 },
];

// ── Step sub-components ───────────────────────────────────────────────────────

/** Props shared by all step components. */
interface StepProps {
  draft: GroupDraft;
  onChange: (patch: Partial<GroupDraft>) => void;
  error: string | null;
}

/**
 * Step 1: Group title input.
 *
 * @param props - StepProps.
 */
function StepTitle({ draft, onChange, error }: StepProps) {
  return (
    <div>
      <p style={hintStyle}>What are you ordering?</p>
      <Input
        placeholder="e.g. Supper at Al-Ameen"
        value={draft.title}
        onChange={(e) => onChange({ title: e.target.value })}
        status={error ? 'error' : undefined}
        header={error ?? undefined}
        maxLength={60}
      />
    </div>
  );
}

/**
 * Step 2: Optional GrabFood or external link.
 *
 * @param props - StepProps.
 */
function StepLink({ draft, onChange, error }: StepProps) {
  return (
    <div>
      <p style={hintStyle}>Paste your GrabFood / order link (optional)</p>
      <Input
        placeholder="https://grab.com/..."
        value={draft.externalLink}
        onChange={(e) => onChange({ externalLink: e.target.value })}
        status={error ? 'error' : undefined}
        header={error ?? undefined}
        inputMode="url"
      />
    </div>
  );
}

/**
 * Step 3: Select maximum number of members via preset chips.
 *
 * @param props - StepProps.
 */
function StepMembers({ draft, onChange }: StepProps) {
  return (
    <div>
      <p style={hintStyle}>How many people in your group?</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {MEMBER_PRESETS.map((n) => (
          <button
            key={n}
            onClick={() => onChange({ maxMembers: n })}
            style={chipStyle(draft.maxMembers === n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Step 4: Select group expiry duration via preset chips.
 *
 * @param props - StepProps.
 */
function StepExpiry({ draft, onChange }: StepProps) {
  return (
    <div>
      <p style={hintStyle}>How long should the group stay open?</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {EXPIRY_PRESETS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => onChange({ expiryMinutes: value })}
            style={chipStyle(draft.expiryMinutes === value)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Confirmation screen summarising the draft before submission.
 *
 * @param draft - The completed group draft.
 */
function StepConfirm({ draft }: { draft: GroupDraft }) {
  const expiryLabel =
    EXPIRY_PRESETS.find((p) => p.value === draft.expiryMinutes)?.label ??
    `${draft.expiryMinutes}m`;

  return (
    <div style={{ fontSize: 14, color: 'var(--tg-theme-text-color)', lineHeight: 1.6 }}>
      <Row label="Title"   value={draft.title} />
      <Row label="Link"    value={draft.externalLink || '(none)'} />
      <Row label="Members" value={`up to ${draft.maxMembers}`} />
      <Row label="Expires" value={`in ${expiryLabel}`} />
    </div>
  );
}

/** Small label-value row for the confirmation screen. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
      <span style={{ color: 'var(--tg-theme-hint-color)', minWidth: 72 }}>{label}</span>
      <span style={{ wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * Validates the draft for a specific step.
 *
 * @param step - Current step index (0-based).
 * @param draft - The current draft state.
 * @returns Error message string, or null if valid.
 */
function validateStep(step: number, draft: GroupDraft): string | null {
  if (step === 0 && (!draft.title.trim() || draft.title.length > 60)) {
    return 'Title must be 1–60 characters';
  }
  if (step === 1 && draft.externalLink && !draft.externalLink.startsWith('http')) {
    return 'Link must start with http';
  }
  return null;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const hintStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--tg-theme-hint-color)',
  marginBottom: 10,
};

function chipStyle(selected: boolean): React.CSSProperties {
  return {
    padding: '8px 20px',
    borderRadius: 20,
    border: selected
      ? '2px solid var(--tg-theme-button-color)'
      : '2px solid var(--tg-theme-hint-color)',
    background: selected ? 'var(--tg-theme-button-color)' : 'transparent',
    color: selected ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-text-color)',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
  };
}

// ── Main component ────────────────────────────────────────────────────────────

const STEP_TITLES = ["What's the order?", 'Add a link', 'Group size', 'Expiry', 'Confirm'];

/** Props for CreateGroupStepper. */
interface CreateGroupStepperProps {
  /** Called with the newly created group on success. */
  onCreated: (group: FoodGroup) => void;
}

/**
 * Multi-step group creation wizard.
 * Validates each step locally before advancing; submits on the final confirm step.
 *
 * @param props - CreateGroupStepperProps.
 * @returns A self-contained stepper UI with navigation buttons.
 */
export function CreateGroupStepper({ onCreated }: CreateGroupStepperProps) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<GroupDraft>({
    title: '',
    externalLink: '',
    maxMembers: 4,
    expiryMinutes: 60,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /** Patches the draft and clears the error for the current field. */
  function handleChange(patch: Partial<GroupDraft>) {
    setDraft((d) => ({ ...d, ...patch }));
    setError(null);
  }

  /** Advances to the next step after validating the current one. */
  function handleNext() {
    const err = validateStep(step, draft);
    if (err) { setError(err); return; }
    setStep((s) => s + 1);
  }

  /** Submits the completed draft to the API. */
  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const group = await createGroup(draft);
      onCreated(group);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create group');
    } finally {
      setLoading(false);
    }
  }

  const stepProps: StepProps = { draft, onChange: handleChange, error };
  const isConfirm = step === 4;

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {/* Step indicator */}
      <p style={{ ...hintStyle, marginBottom: 16 }}>
        Step {step + 1} of {STEP_TITLES.length} · {STEP_TITLES[step]}
      </p>

      {/* Step content */}
      {step === 0 && <StepTitle {...stepProps} />}
      {step === 1 && <StepLink {...stepProps} />}
      {step === 2 && <StepMembers {...stepProps} />}
      {step === 3 && <StepExpiry {...stepProps} />}
      {step === 4 && <StepConfirm draft={draft} />}

      {/* Error from API */}
      {isConfirm && error && (
        <p style={{ color: 'var(--tg-theme-destructive-text-color)', fontSize: 13, marginTop: 12 }}>
          {error}
        </p>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        {step > 0 && (
          <Button mode="outline" size="l" onClick={() => setStep((s) => s - 1)} style={{ flex: 1 }}>
            Back
          </Button>
        )}
        <Button
          mode="filled"
          size="l"
          onClick={isConfirm ? handleSubmit : handleNext}
          disabled={loading}
          style={{ flex: 2 }}
        >
          {loading ? <Spinner size="s" /> : isConfirm ? 'Create Group 🍱' : 'Next'}
        </Button>
      </div>
    </div>
  );
}

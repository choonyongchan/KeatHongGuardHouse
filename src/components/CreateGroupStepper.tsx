import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';
import { hapticFeedback } from '@tma.js/sdk-react';
import { track } from '@vercel/analytics/react';
import { createGroup } from '../lib/api.ts';
import type { FoodGroup } from '../types.ts';
import { ShareCodeBlock } from './ShareCodeBlock.tsx';
import { theme } from '../lib/theme.ts';

interface GroupDraft {
  title: string;
  externalLink: string;
  expiryMinutes: number;
}

const EXPIRY_PRESETS: { label: string; value: number }[] = [
  { label: '1h',  value: 60 },
  { label: '4h',  value: 240 },
  { label: '12h', value: 720 },
  { label: '24h', value: 1440 },
];

const hintStyle: CSSProperties = {
  fontSize: 13, color: theme.textSecondary, marginBottom: 10, marginTop: 0,
};

function chipStyle(selected: boolean): CSSProperties {
  return {
    padding: '7px 14px',
    borderRadius: 20,
    border: selected ? `2px solid ${theme.accent}` : `1.5px solid ${theme.border}`,
    background: selected ? theme.accentLight : 'transparent',
    color: selected ? theme.accent : theme.textSecondary,
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

interface FormProps {
  draft: GroupDraft;
  onChange: (patch: Partial<GroupDraft>) => void;
  titleError: string | null;
  linkError: string | null;
}

function CreateForm({ draft, onChange, titleError, linkError }: FormProps) {
  return (
    <div>
      <p style={hintStyle}>Give your group a name people will recognise</p>
      <input
        placeholder="e.g. Supper at Al-Ameen"
        value={draft.title}
        onChange={(e) => onChange({ title: e.target.value })}
        maxLength={60}
        autoComplete="off"
        style={inputStyle(!!titleError)}
        aria-label="Group title"
      />
      {titleError && <p style={{ color: theme.error, fontSize: 11, marginTop: 4 }}>{titleError}</p>}

      <p style={{ ...hintStyle, marginTop: 18 }}>Paste your GrabFood or Foodpanda cart link (optional)</p>
      <input
        placeholder="https://food.grab.com/…"
        value={draft.externalLink}
        onChange={(e) => onChange({ externalLink: e.target.value })}
        inputMode="url"
        autoComplete="off"
        style={inputStyle(!!linkError)}
        aria-label="Order link"
      />
      {linkError && <p style={{ color: theme.error, fontSize: 11, marginTop: 4 }}>{linkError}</p>}

      <p style={{ ...hintStyle, marginTop: 18 }}>Group closes after this time</p>
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
      <p style={{ fontSize: 12, color: theme.textSecondary, marginTop: 6 }}>
        Keeps the Browse tab tidy — the group auto-closes once this time passes. You can add more people or make it
        private any time from the group details.
      </p>
    </div>
  );
}

interface InviteProps {
  group: FoodGroup;
  onViewDetails: () => void;
}

function InviteView({ group, onViewDetails }: InviteProps) {
  return (
    <div>
      <p style={hintStyle}>Get the word out to your neighbours</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: theme.textSecondary, marginBottom: 12 }}>
        <span>🔍</span> Friends can find it in the <strong style={{ color: theme.textPrimary }}>&nbsp;Browse&nbsp;</strong> tab
      </div>

      <ShareCodeBlock code={group.code} title={group.title} shareLabel="Share link" />

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

function validateTitle(title: string): string | null {
  if (!title.trim()) return 'Please enter a name';
  if (title.length > 60) return 'Name must be under 60 characters';
  return null;
}

function validateLink(link: string): string | null {
  if (link && !link.startsWith('http')) return 'Link must start with http';
  return null;
}

interface CreateGroupStepperProps {
  onCreated: (group: FoodGroup) => void;
}

export function CreateGroupStepper({ onCreated }: CreateGroupStepperProps) {
  const [draft, setDraft] = useState<GroupDraft>({
    title: '',
    externalLink: '',
    expiryMinutes: 60,
  });
  const [titleError, setTitleError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<FoodGroup | null>(null);

  function handleChange(patch: Partial<GroupDraft>) {
    setDraft((d) => ({ ...d, ...patch }));
    setTitleError(null);
    setLinkError(null);
  }

  async function handleSubmit() {
    const tErr = validateTitle(draft.title);
    const lErr = validateLink(draft.externalLink);
    setTitleError(tErr);
    setLinkError(lErr);
    if (tErr || lErr) return;

    setLoading(true);
    try {
      const group = await createGroup({
        title: draft.title.trim(),
        externalLink: draft.externalLink.trim(),
        maxMembers: null,
        expiryMinutes: draft.expiryMinutes,
        visibility: 'public',
      });
      hapticFeedback.notificationOccurred('success');
      track('Create Group', { code: group.code });
      setCreatedGroup(group);
    } catch (e) {
      setTitleError(e instanceof Error ? e.message : 'Failed to create group');
    } finally {
      setLoading(false);
    }
  }

  if (createdGroup) {
    return (
      <div style={{ padding: '16px 16px 24px' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800, color: theme.textPrimary }}>
          Invite your friends
        </h2>
        <InviteView group={createdGroup} onViewDetails={() => onCreated(createdGroup)} />
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 16px 24px' }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800, color: theme.textPrimary }}>
        Start a group order
      </h2>

      <CreateForm draft={draft} onChange={handleChange} titleError={titleError} linkError={linkError} />

      <button
        onClick={() => void handleSubmit()}
        disabled={loading}
        style={{
          width: '100%', marginTop: 24, padding: '11px 0', borderRadius: 10,
          border: 'none',
          background: loading ? theme.accentBorder : theme.accent,
          color: '#fff',
          fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
        }}
        aria-label="Create group"
      >
        {loading ? <Spinner size="s" /> : 'Create Group ✓'}
      </button>
    </div>
  );
}

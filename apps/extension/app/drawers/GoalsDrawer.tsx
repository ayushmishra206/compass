import { useState, type CSSProperties } from 'react';
import { Row, Stack, Text } from '@compass/ui';
import type { StoredGoal } from '@compass/db';
import { goalProgress, useGoals, weeksRemaining, type NewGoal } from '../hooks/useGoals.js';

const btnAccent: CSSProperties = {
  padding: '7px 14px',
  fontSize: 12,
  borderRadius: 999,
  background: 'var(--accent)',
  color: '#1a0e02',
  border: 0,
};
const btnGhost: CSSProperties = {
  padding: '7px 12px',
  fontSize: 12,
  borderRadius: 999,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'inherit',
};
const inputStyle: CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 12,
  borderRadius: 6,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'var(--color-ink)',
  boxSizing: 'border-box',
};

/** End of the calendar quarter containing `now` — the default goal horizon. */
function quarterEnd(now = new Date()): string {
  const endMonth = Math.floor(now.getMonth() / 3) * 3 + 3;
  return new Date(now.getFullYear(), endMonth, 0).toISOString().slice(0, 10);
}

function NewGoalForm({
  onCreate,
  onCancel,
}: {
  onCreate: (g: NewGoal) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  const [endDate, setEndDate] = useState(quarterEnd());
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await onCreate({
        title: title.trim(),
        why: why.trim() || undefined,
        horizon: 'quarter',
        startDate: new Date().toISOString().slice(0, 10),
        endDate,
      });
      onCancel();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack gap={2} style={{ marginBottom: 22 }}>
      <input
        style={inputStyle}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What do you want to be true by the end of the quarter?"
        aria-label="Goal title"
      />
      <input
        style={inputStyle}
        value={why}
        onChange={(e) => setWhy(e.target.value)}
        placeholder="Why it matters (optional)"
        aria-label="Why this goal matters"
      />
      <Row gap={2} align="center">
        <input
          type="date"
          style={{ ...inputStyle, width: 'auto' }}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          aria-label="Target date"
        />
        <button type="button" style={btnAccent} onClick={submit} disabled={busy || !title.trim()}>
          {busy ? 'Adding…' : 'Add goal'}
        </button>
        <button type="button" style={btnGhost} onClick={onCancel}>
          Cancel
        </button>
      </Row>
    </Stack>
  );
}

function GoalCard({
  goal,
  decomposing,
  onDecompose,
  onDelete,
  onToggleMilestone,
}: {
  goal: StoredGoal;
  decomposing: boolean;
  onDecompose: () => Promise<string | null>;
  onDelete: () => Promise<void>;
  onToggleMilestone: (id: string, done: boolean) => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const progress = goalProgress(goal);
  const weeks = weeksRemaining(goal);

  return (
    <div>
      <Row gap={3} align="baseline" style={{ marginBottom: 6 }}>
        <Text variant="mono" tone="accent">
          {goal.horizon} · {weeks}w
        </Text>
        <Text variant="mono" tone="dim" style={{ marginLeft: 'auto' }}>
          {Math.round(progress * 100)}%
        </Text>
      </Row>

      <Text variant="title" as="h3" style={{ fontSize: 22, lineHeight: 1.2, margin: '0 0 10px' }}>
        {goal.title}
      </Text>

      {goal.why && (
        <Text
          variant="serif-body"
          italic
          style={{ fontSize: 13.5, lineHeight: 1.55, margin: '0 0 12px' }}
        >
          &ldquo;{goal.why}&rdquo;
        </Text>
      )}

      <div
        style={{
          background: 'var(--color-hair)',
          borderRadius: 2,
          overflow: 'hidden',
          height: 3,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'var(--accent)',
            borderRadius: 2,
            width: `${progress * 100}%`,
          }}
        />
      </div>

      {goal.firstWeekFocus && (
        <Text variant="body" tone="secondary" style={{ fontSize: 12.5, margin: '0 0 12px' }}>
          <Text variant="mono" as="span" tone="dim">
            START HERE{' '}
          </Text>
          {goal.firstWeekFocus}
        </Text>
      )}

      {goal.milestones.length > 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            border: '1px solid var(--color-hair)',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          {goal.milestones.map((m) => (
            <Row
              key={m.id}
              gap={3}
              align="center"
              style={{
                padding: '9px 12px',
                background: 'rgba(255,255,255,0.03)',
                borderBottom: '1px solid var(--color-hair)',
              }}
            >
              <Text variant="mono" tone="dim" style={{ flex: '0 0 50px' }}>
                WK {m.weekIndex}
              </Text>
              <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={m.done}
                  onChange={(e) => void onToggleMilestone(m.id, e.target.checked)}
                  aria-label={`Mark "${m.title}" ${m.done ? 'incomplete' : 'complete'}`}
                />
                <Text
                  variant="body"
                  as="span"
                  tone={m.done ? 'dim' : 'secondary'}
                  style={{ fontSize: 12.5, textDecoration: m.done ? 'line-through' : 'none' }}
                >
                  {m.title}
                </Text>
              </label>
              {m.done && (
                <Text variant="body" as="span" tone="accent">
                  ✓
                </Text>
              )}
            </Row>
          ))}
        </div>
      ) : (
        <Text variant="body" tone="muted" style={{ fontSize: 12, marginBottom: 10 }}>
          No plan yet. Compass can break this into weekly milestones.
        </Text>
      )}

      {goal.risks.length > 0 && (
        <Stack gap={1} style={{ marginTop: 12 }}>
          <Text variant="mono" tone="dim">
            Watch for
          </Text>
          {goal.risks.map((r) => (
            <Text key={r} variant="body" tone="muted" style={{ fontSize: 11.5 }}>
              · {r}
            </Text>
          ))}
        </Stack>
      )}

      <Row gap={2} style={{ marginTop: 14 }}>
        <button
          type="button"
          style={btnGhost}
          disabled={decomposing}
          onClick={() => {
            setError(null);
            void onDecompose().then(setError);
          }}
        >
          {decomposing
            ? 'Thinking…'
            : goal.milestones.length > 0
              ? 'Re-plan'
              : 'Break into milestones'}
        </button>
        <button type="button" style={btnGhost} onClick={() => void onDelete()}>
          Delete
        </button>
      </Row>

      {error && (
        <Text variant="body" tone="dim" style={{ fontSize: 11, marginTop: 8 }}>
          {error}
        </Text>
      )}
    </div>
  );
}

export function GoalsDrawer() {
  const { state, decomposing, create, remove, decompose, toggleMilestone } = useGoals();
  const [adding, setAdding] = useState(false);

  if (state.kind === 'loading') {
    return (
      <Text variant="body" tone="muted">
        Loading goals…
      </Text>
    );
  }
  if (state.kind === 'error') {
    return (
      <Stack gap={2}>
        <Text variant="heading">Couldn&rsquo;t load goals</Text>
        <Text variant="body" tone="muted">
          {state.message}
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap={5}>
      {adding ? (
        <NewGoalForm onCreate={create} onCancel={() => setAdding(false)} />
      ) : (
        <Row>
          <button type="button" style={btnAccent} onClick={() => setAdding(true)}>
            + New goal
          </button>
        </Row>
      )}

      {state.goals.length === 0 && !adding && (
        <Stack gap={2} style={{ padding: '24px 0' }}>
          <Text variant="heading">No goals yet</Text>
          <Text variant="body" tone="muted" style={{ maxWidth: 340 }}>
            Add one thing you want to be true a quarter from now. Compass will break it into weekly
            milestones and quote it back to you in the morning brief.
          </Text>
        </Stack>
      )}

      {state.goals.map((g) => (
        <GoalCard
          key={g.id}
          goal={g}
          decomposing={decomposing === g.id}
          onDecompose={() => decompose(g.id)}
          onDelete={() => remove(g.id)}
          onToggleMilestone={toggleMilestone}
        />
      ))}
    </Stack>
  );
}

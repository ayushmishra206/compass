import { useState } from 'react';

interface RelatedPillProps {
  srcId: string;
  targetId: string;
  targetTitle: string;
  initialRationale: string | null;
  onFetchRationale: (
    srcId: string,
    targetId: string,
  ) => Promise<{ rationale: string } | { rationale: null; reason: 'locked' | 'error' }>;
  onDismiss: (srcId: string, targetId: string) => Promise<void>;
}

export function RelatedPill({
  srcId,
  targetId,
  targetTitle,
  initialRationale,
  onFetchRationale,
  onDismiss,
}: RelatedPillProps) {
  const [expanded, setExpanded] = useState(false);
  const [rationale, setRationale] = useState<string | null>(initialRationale);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  const onClick = async () => {
    const willExpand = !expanded;
    setExpanded(willExpand);
    if (willExpand && rationale === null) {
      setLoading(true);
      setError(null);
      const r = await onFetchRationale(srcId, targetId);
      if (r.rationale !== null) setRationale(r.rationale);
      else setError(r.reason === 'locked' ? 'Unlock to load reason' : 'Reason unavailable');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: '10px 12px',
        border: '1px solid var(--color-hair)',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.03)',
        marginBottom: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={onClick}
          style={{
            flex: 1,
            background: 'transparent',
            border: 0,
            color: 'var(--color-ink)',
            textAlign: 'left',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Related: {targetTitle} {expanded ? '▾' : '▸'}
        </button>
        <button
          aria-label="Dismiss related"
          onClick={async () => {
            setHidden(true);
            await onDismiss(srcId, targetId);
          }}
          style={{
            background: 'transparent',
            border: 0,
            color: 'var(--color-ink-4)',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          ×
        </button>
      </div>
      {expanded && (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            fontStyle: 'italic',
            color: 'var(--color-ink-3)',
          }}
        >
          {loading ? 'Loading reason…' : (error ?? rationale)}
        </div>
      )}
    </div>
  );
}

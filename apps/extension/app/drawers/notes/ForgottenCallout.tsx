interface ForgottenCalloutProps {
  noteId: string;
  title: string;
  daysAgo: number;
  onOpen: (noteId: string) => void;
}

export function ForgottenCallout({ noteId, title, daysAgo, onOpen }: ForgottenCalloutProps) {
  return (
    <div
      role="status"
      style={{
        padding: '10px 12px',
        marginBottom: 12,
        borderRadius: 10,
        background: 'var(--accent-wash)',
        color: 'var(--accent-soft)',
        fontSize: 12,
      }}
    >
      You wrote about &ldquo;{title}&rdquo; {daysAgo} days ago —{' '}
      <button
        onClick={() => onOpen(noteId)}
        style={{
          background: 'transparent',
          border: 0,
          color: 'var(--accent)',
          cursor: 'pointer',
        }}
      >
        revisit?
      </button>
    </div>
  );
}

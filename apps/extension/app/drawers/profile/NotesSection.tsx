import { useEffect, useState } from 'react';
import { getUserProfile, setUserProfile } from '@compass/core';

export function NotesSection() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    void getUserProfile().then((p) => setEnabled(p.autoLinkEnabled));
  }, []);

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    await setUserProfile({ autoLinkEnabled: next });
  };

  if (enabled === null) return null;

  return (
    <section style={{ padding: '12px 0', borderBottom: '1px solid var(--color-hair)' }}>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--color-ink-3)',
          marginBottom: 8,
        }}
      >
        Notes
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
        <input type="checkbox" checked={enabled} onChange={toggle} />
        Auto-link new notes
      </label>
      <div style={{ marginTop: 4, fontSize: 11, color: 'var(--color-ink-4)' }}>
        Compute related-note suggestions on save (local). Rationale is fetched only on click.
      </div>
    </section>
  );
}

import { useLocation } from 'wouter';
import { IconButton, IconPlus, IconSearch, Kbd, Topbar } from '@compass/ui';
import { useShell } from '@app/state/shell.js';

const TITLES: Record<string, string[]> = {
  '/': ['Morning'],
  '/notes': ['Notes'],
  '/focus': ['Focus'],
  '/goals': ['Goals'],
  '/inbox': ['Inbox', 'Actions'],
  '/blocker': ['Site Blocker'],
  '/settings': ['Settings'],
};

export function CompassTopbar() {
  const [location] = useLocation();
  const { openOverlay } = useShell();
  const keyBase = Object.keys(TITLES).find((k) =>
    k === '/' ? location === '/' : location.startsWith(k),
  );
  const crumbs = (keyBase ? TITLES[keyBase] : ['Compass']) ?? ['Compass'];
  const dateStr = new Date('2026-04-20T07:42').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Topbar
      breadcrumb={
        <>
          {crumbs.map((c, i) => (
            <span key={i}>
              {i > 0 && <span className="text-[var(--ink-4)] mx-2">/</span>}
              <span>{c}</span>
            </span>
          ))}
        </>
      }
      date={location === '/' ? <span>{dateStr} · 7:42 am</span> : undefined}
      search={
        <button
          type="button"
          onClick={() => openOverlay('cmdK')}
          className="flex items-center gap-2 px-2.5 py-1.5 border border-[var(--hair)] rounded-[10px] bg-[var(--panel)] w-[280px] text-[var(--ink-3)]"
        >
          <IconSearch size={14} />
          <span className="flex-1 text-left text-[13px]">Search notes, emails, goals…</span>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </button>
      }
      actions={
        <IconButton aria-label="New note">
          <IconPlus size={16} />
        </IconButton>
      }
    />
  );
}

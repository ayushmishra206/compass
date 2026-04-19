import { Link, useLocation } from 'wouter';
import {
  BrandMark,
  ICONS,
  IconMore,
  IconButton,
  Progress,
  Sidebar,
  type IconName,
} from '@compass/ui';
import { useShell } from '@app/state/shell.js';
import { USER, NOTES, GOALS, INBOX_ACTIONS, BLOCK_RULES } from '@compass/core/fixtures';

const NAV_ITEMS: Array<{ to: string; label: string; icon: IconName; count?: number }> = [
  { to: '/', label: 'New Tab', icon: 'home' },
  { to: '/notes', label: 'Notes', icon: 'note', count: NOTES.length },
  { to: '/focus', label: 'Focus', icon: 'focus' },
  {
    to: '/goals',
    label: 'Goals',
    icon: 'goal',
    count: GOALS.filter((g) => g.status !== 'achieved').length,
  },
  {
    to: '/inbox',
    label: 'Inbox Actions',
    icon: 'inbox',
    count: INBOX_ACTIONS.filter((a) => a.actions.length).length,
  },
  {
    to: '/blocker',
    label: 'Site Blocker',
    icon: 'block',
    count: BLOCK_RULES.length,
  },
];

export function CompassSidebar() {
  const { density } = useShell();
  const [location] = useLocation();
  const compact = density === 'compact';

  return (
    <Sidebar
      density={density}
      brand={
        <div className="flex items-center gap-2.5 px-2 pt-1.5 pb-[18px]">
          <BrandMark />
          {!compact && (
            <>
              <div className="font-serif text-[19px] font-medium tracking-[-0.01em]">Compass</div>
              <div className="ml-auto font-mono text-[10px] text-[var(--ink-4)] uppercase tracking-[0.02em]">
                plus
              </div>
            </>
          )}
        </div>
      }
      nav={
        <>
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.to}
              {...item}
              active={isActive(location, item.to)}
              compact={compact}
            />
          ))}
          {!compact && (
            <div className="mt-3.5 px-2.5 pb-1.5 font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)]">
              Agent
            </div>
          )}
          <NavItem
            to="/settings"
            label="Settings & AI budget"
            icon="gear"
            active={isActive(location, '/settings')}
            compact={compact}
          />
        </>
      }
      footer={
        <>
          {!compact && (
            <div className="p-2.5 border border-[var(--hair)] rounded-[12px] bg-[var(--panel)]">
              <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-3)]">
                <span>April AI budget</span>
                <span>$0.84 / $2.00</span>
              </div>
              <div className="mt-2">
                <Progress value={0.42} label="Monthly AI budget" />
              </div>
              <div className="flex justify-between mt-1.5 font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-3)]">
                <span>BYOK · openai</span>
                <span>42%</span>
              </div>
            </div>
          )}
          {!compact && (
            <div className="flex items-center gap-2.5 px-2 py-1">
              <div className="w-[26px] h-[26px] rounded-full grid place-items-center text-white text-[11px] font-semibold bg-gradient-to-br from-[oklch(0.7_0.08_60)] to-[oklch(0.5_0.12_40)]">
                {USER.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="text-[12.5px] leading-[1.2]">
                <div>{USER.name}</div>
                <div className="text-[var(--ink-4)] text-[11px]">Compass Plus</div>
              </div>
              <IconButton aria-label="User menu" className="ml-auto">
                <IconMore size={14} />
              </IconButton>
            </div>
          )}
        </>
      }
    />
  );
}

function isActive(location: string, to: string) {
  if (to === '/') return location === '/';
  return location.startsWith(to);
}

function NavItem({
  to,
  label,
  icon,
  count,
  active,
  compact,
}: {
  to: string;
  label: string;
  icon: IconName;
  count?: number;
  active: boolean;
  compact: boolean;
}) {
  const IconCmp = ICONS[icon];
  return (
    <Link
      href={to}
      className={`flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-[14px] leading-[1.2] w-full text-left transition-colors ${
        active
          ? 'bg-[var(--accent-wash)] text-[var(--accent-ink)]'
          : 'text-[var(--ink-2)] hover:bg-[var(--panel-2)] hover:text-[var(--ink)]'
      } ${compact ? 'justify-center !p-2.5' : ''}`}
    >
      <IconCmp size={16} className="flex-shrink-0" />
      {!compact && <span className="flex-1">{label}</span>}
      {!compact && count !== undefined && count > 0 && (
        <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)]">
          {count}
        </span>
      )}
    </Link>
  );
}

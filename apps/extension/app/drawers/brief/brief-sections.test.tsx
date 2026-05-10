import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { BriefTLDR } from './BriefTLDR';
import { PomodorosSection } from './PomodorosSection';
import { WatchoutsSection } from './WatchoutsSection';
import { RecoverySection } from './RecoverySection';
import { QuotedGoalSection } from './QuotedGoalSection';
import { BriefFooter } from './BriefFooter';
import { EodReflectionView } from './EodReflectionView';
import { LockedEmpty } from './LockedEmpty';
import { TooEarlyEmpty } from './TooEarlyEmpty';
import { ErrorEmpty } from './ErrorEmpty';

describe('Brief sub-components', () => {
  it('BriefTLDR renders text + optional mood', () => {
    const { container } = render(<BriefTLDR text="Light schedule today." mood="Calm." />);
    expect(screen.getByText('Light schedule today.')).toBeInTheDocument();
    expect(screen.getByText('Calm.')).toBeInTheDocument();
    expect(container.firstChild).toBeTruthy();
  });

  it('PomodorosSection renders empty state when items is empty', () => {
    render(<PomodorosSection items={[]} />);
    expect(screen.getByText(/Suggested focus blocks land with Calendar/)).toBeInTheDocument();
  });

  it('PomodorosSection renders rows when populated', () => {
    render(<PomodorosSection items={[{ startLocal: '09:00', endLocal: '10:00', theme: 'PRD' }]} />);
    expect(screen.getByText(/PRD/)).toBeInTheDocument();
  });

  it('WatchoutsSection renders nothing when empty', () => {
    const { container } = render(<WatchoutsSection items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('RecoverySection renders empty state when null', () => {
    render(<RecoverySection note={null} />);
    expect(screen.getByText(/Connect Fitbit\/Whoop/)).toBeInTheDocument();
  });

  it('QuotedGoalSection renders empty state when null', () => {
    render(<QuotedGoalSection goal={null} />);
    expect(screen.getByText(/Set goals to anchor your day/)).toBeInTheDocument();
  });

  it('BriefFooter renders provider + cost + buttons', async () => {
    render(
      <BriefFooter
        provider="openrouter"
        cost={0.0003}
        rating={null}
        onRate={vi.fn()}
        onRegenerate={vi.fn()}
      />,
    );
    expect(screen.getByText(/openrouter/)).toBeInTheDocument();
    expect(screen.getByText(/0.0003/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thumbs up' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thumbs down' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument();
  });

  it('EodReflectionView renders sections that have data', () => {
    render(
      <EodReflectionView
        output={{
          wins: ['Shipped PRD'],
          tomorrowOneThing: 'Eng review prep',
          journalPrompt: 'What moved the day?',
        }}
      />,
    );
    expect(screen.getByText(/Shipped PRD/)).toBeInTheDocument();
    expect(screen.getByText('Eng review prep')).toBeInTheDocument();
    expect(screen.getByText('What moved the day?')).toBeInTheDocument();
  });

  it('LockedEmpty renders the unlock CTA', () => {
    render(<LockedEmpty />);
    expect(screen.getByText(/Your daily brief is waiting/)).toBeInTheDocument();
  });

  it('TooEarlyEmpty renders ready time', () => {
    render(<TooEarlyEmpty readyAt="2026-05-10T08:00:00" />);
    expect(screen.getByText(/Your morning brief will be ready at/)).toBeInTheDocument();
  });

  it('ErrorEmpty renders message + retry button', async () => {
    const onRetry = vi.fn();
    render(<ErrorEmpty message="Network error" onRetry={onRetry} />);
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('axe: each component is clean', async () => {
    const fragments = [
      <BriefTLDR key="t" text="Test" />,
      <PomodorosSection key="p" items={[]} />,
      <RecoverySection key="r" note={null} />,
      <QuotedGoalSection key="q" goal={null} />,
      <LockedEmpty key="l" />,
      <TooEarlyEmpty key="te" readyAt="2026-05-10T08:00:00" />,
      <ErrorEmpty key="e" message="X" onRetry={vi.fn()} />,
    ];
    for (const frag of fragments) {
      const { container, unmount } = render(frag);
      expect(await axe(container)).toHaveNoViolations();
      unmount();
    }
  });
});

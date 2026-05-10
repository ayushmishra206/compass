import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe } from 'jest-axe';
import { DailyTimesSection } from './DailyTimesSection';

import type * as CompassCore from '@compass/core';
vi.mock('@compass/core', async (importOriginal) => {
  const actual = await importOriginal<typeof CompassCore>();
  return {
    ...actual,
    getUserProfile: vi.fn(async () => ({
      id: 'u1',
      createdAt: '2026-05-01T00:00:00Z',
      timezone: 'America/New_York',
      locale: 'en-US',
      workHours: { start: '09:00', end: '17:00' },
      briefingHour: 8,
      reflectionHour: 18,
    })),
    setUserProfile: vi.fn(async (patch) => ({
      id: 'u1',
      createdAt: '2026-05-01T00:00:00Z',
      timezone: 'America/New_York',
      locale: 'en-US',
      workHours: { start: '09:00', end: '17:00' },
      briefingHour: 8,
      reflectionHour: 18,
      ...patch,
    })),
  };
});
import { setUserProfile } from '@compass/core';

vi.mock('@compass/runtime', () => ({ rpc: vi.fn(async () => ({ ok: true })) }));
import { rpc } from '@compass/runtime';

describe('DailyTimesSection', () => {
  beforeEach(() => {
    vi.mocked(setUserProfile).mockClear();
    vi.mocked(rpc).mockClear();
  });

  it('renders briefingHour, reflectionHour, workHours, timezone, locale', async () => {
    render(<DailyTimesSection />);
    await waitFor(() => expect(screen.getByText(/Daily times/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByLabelText(/Morning brief/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/EOD reflection/i)).toBeInTheDocument();
    expect(screen.getByText(/America\/New_York/)).toBeInTheDocument();
    expect(screen.getByText(/en-US/)).toBeInTheDocument();
  });

  it('editing briefingHour calls setUserProfile + rpc(alarms.refresh)', async () => {
    render(<DailyTimesSection />);
    await waitFor(() => expect(screen.getByLabelText(/Morning brief/i)).toBeInTheDocument());

    const select = screen.getByLabelText(/Morning brief/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '9' } });

    await waitFor(() =>
      expect(setUserProfile).toHaveBeenCalledWith(expect.objectContaining({ briefingHour: 9 })),
    );
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('alarms.refresh', {}));
  });

  it('editing reflectionHour calls setUserProfile + rpc(alarms.refresh)', async () => {
    render(<DailyTimesSection />);
    await waitFor(() => expect(screen.getByLabelText(/EOD reflection/i)).toBeInTheDocument());

    const select = screen.getByLabelText(/EOD reflection/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '19' } });

    await waitFor(() =>
      expect(setUserProfile).toHaveBeenCalledWith(expect.objectContaining({ reflectionHour: 19 })),
    );
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('alarms.refresh', {}));
  });

  it('axe: zero violations', async () => {
    const { container } = render(<DailyTimesSection />);
    await waitFor(() => expect(screen.getByText(/Daily times/i)).toBeInTheDocument());
    expect(await axe(container)).toHaveNoViolations();
  });
});

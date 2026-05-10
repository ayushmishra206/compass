import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@compass/core', async () => {
  const actual = await vi.importActual('@compass/core');
  return {
    ...(actual as Record<string, unknown>),
    getUserProfile: vi.fn(),
    setUserProfile: vi.fn(),
  };
});

import { getUserProfile, setUserProfile } from '@compass/core';
import { NotesSection } from './NotesSection';

describe('NotesSection', () => {
  beforeEach(() => {
    (setUserProfile as ReturnType<typeof vi.fn>).mockReset();
    (getUserProfile as ReturnType<typeof vi.fn>).mockReset();
  });

  it('renders the Auto-link toggle reflecting profile state', async () => {
    (getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      autoLinkEnabled: true,
      briefingHour: 8,
      reflectionHour: 18,
      workHours: { start: '09:00', end: '17:00' },
    });
    render(<NotesSection />);
    await waitFor(() => expect(screen.getByLabelText(/Auto-link/i)).toBeChecked());
  });

  it('toggling fires setUserProfile', async () => {
    const user = userEvent.setup();
    (getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      autoLinkEnabled: true,
      briefingHour: 8,
      reflectionHour: 18,
      workHours: { start: '09:00', end: '17:00' },
    });
    render(<NotesSection />);
    await waitFor(() => expect(screen.getByLabelText(/Auto-link/i)).toBeChecked());
    await user.click(screen.getByLabelText(/Auto-link/i));
    expect(setUserProfile).toHaveBeenCalledWith({ autoLinkEnabled: false });
  });
});

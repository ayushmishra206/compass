import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Topbar } from './Topbar';
import { useShell } from '../state/shell';

vi.mock('../scene/useScene', () => ({
  useScene: () => ({
    imageUrl: null,
    label: 'Alpine',
    photographer: '',
    attribution: '',
    mood: 'alpine',
  }),
}));

describe('Topbar — lock chip', () => {
  beforeEach(() => {
    useShell.setState({
      encryptionEnabled: false,
      locked: false,
      drawer: { open: false, kind: null },
      unlockHint: false,
    });
  });

  it('does not render the chip when not locked', () => {
    render(<Topbar />);
    expect(screen.queryByRole('button', { name: /credentials locked/i })).not.toBeInTheDocument();
  });

  it('renders the chip when encryptionEnabled && locked', () => {
    useShell.setState({ encryptionEnabled: true, locked: true });
    render(<Topbar />);
    expect(screen.getByRole('button', { name: /credentials locked/i })).toBeInTheDocument();
  });

  it('clicking chip calls requestUnlock (opens profile drawer + unlockHint)', () => {
    useShell.setState({ encryptionEnabled: true, locked: true });
    render(<Topbar />);
    fireEvent.click(screen.getByRole('button', { name: /credentials locked/i }));
    expect(useShell.getState().drawer).toEqual({ open: true, kind: 'profile' });
    expect(useShell.getState().unlockHint).toBe(true);
  });
});

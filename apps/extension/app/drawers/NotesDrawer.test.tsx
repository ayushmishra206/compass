import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@compass/runtime', () => ({ rpc: vi.fn() }));
import { rpc } from '@compass/runtime';
import { NotesDrawer } from './NotesDrawer';
import { useNotesStore } from '../state/notesStore';

describe('NotesDrawer list mode', () => {
  beforeEach(() => {
    (rpc as unknown as ReturnType<typeof vi.fn>).mockReset();
    useNotesStore.setState({
      selectedNoteId: null,
      dirty: false,
      lastSavedAt: null,
      forgottenSeenThisSession: false,
    });
  });

  it('renders the list of notes from rpc', async () => {
    (rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      notes: [
        {
          id: 'n1',
          title: 'Q2 launch',
          excerpt: 'plans',
          updatedAt: '2026-05-09T10:00',
          tags: ['work'],
        },
        { id: 'n2', title: 'Standup', excerpt: 'misc', updatedAt: '2026-05-08T10:00', tags: [] },
      ],
    });
    render(<NotesDrawer />);
    await waitFor(() => expect(screen.getByText('Q2 launch')).toBeInTheDocument());
    expect(screen.getByText('Standup')).toBeInTheDocument();
  });

  it('clicking a note row sets selectedNoteId', async () => {
    const user = userEvent.setup();
    (rpc as unknown as ReturnType<typeof vi.fn>).mockImplementation((route: string) => {
      if (route === 'notes.list')
        return Promise.resolve({
          notes: [{ id: 'n1', title: 'A', excerpt: 'a', updatedAt: '', tags: [] }],
        });
      if (route === 'notes.get')
        return Promise.resolve({
          note: {
            id: 'n1',
            createdAt: '',
            updatedAt: '',
            title: 'A',
            body: 'a',
            tags: [],
            autolinkEnabled: true,
          },
          autoLinks: [],
        });
      return Promise.resolve({});
    });
    render(<NotesDrawer />);
    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());
    await user.click(screen.getByText('A'));
    await waitFor(() => expect(useNotesStore.getState().selectedNoteId).toBe('n1'));
  });

  it('shows empty state when no notes exist', async () => {
    (rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ notes: [] });
    render(<NotesDrawer />);
    await waitFor(() => expect(screen.getByText(/No notes yet/i)).toBeInTheDocument());
  });
});

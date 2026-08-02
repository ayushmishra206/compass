import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { InboxDrawer } from './InboxDrawer';
import type { InboxState } from '../hooks/useInbox';
import type { StoredMessage } from '@compass/db';

const sync = vi.fn(async () => null as string | null);
const wipe = vi.fn(async () => {});
let state: InboxState = { kind: 'loading' };
let syncing = false;

vi.mock('../hooks/useInbox.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useInbox: () => ({ state, syncing, sync, wipe }) };
});

const msg = (over: Partial<StoredMessage> = {}): StoredMessage => ({
  messageId: 'm1',
  threadId: 't1',
  fromEmail: 'jane@example.com',
  fromName: 'Jane',
  subject: 'Q3 deck',
  snippet: 'Can you review before Thursday?',
  receivedAt: '2026-08-02T09:00:00.000Z',
  lastProcessedAt: '2026-08-02T09:05:00.000Z',
  priority: 'p2',
  injectionFlags: [],
  actions: [],
  archived: false,
  ...over,
});

beforeEach(() => {
  state = { kind: 'loading' };
  syncing = false;
  vi.clearAllMocks();
});

describe('InboxDrawer', () => {
  it('shows a loading state', () => {
    render(<InboxDrawer />);
    expect(screen.getByText(/loading inbox/i)).toBeInTheDocument();
  });

  it('explains the read-only posture when not connected', () => {
    state = { kind: 'not-connected' };
    render(<InboxDrawer />);
    expect(screen.getByText(/gmail not connected/i)).toBeInTheDocument();
    expect(screen.getByText(/no ability to send/i)).toBeInTheDocument();
  });

  it('renders a message with its priority and sender', () => {
    state = { kind: 'ready', messages: [msg()] };
    render(<InboxDrawer />);
    expect(screen.getByText('Q3 deck')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
    expect(screen.getByText('This week')).toBeInTheDocument();
  });

  it('renders extracted actions with their owner', () => {
    state = {
      kind: 'ready',
      messages: [
        msg({
          actions: [
            { title: 'Review the deck', owner: 'me', commitmentType: 'task', confidence: 0.9 },
          ],
        }),
      ],
    };
    render(<InboxDrawer />);
    expect(screen.getByText('Review the deck')).toBeInTheDocument();
    expect(screen.getByText('YOU')).toBeInTheDocument();
  });

  it('warns on a message that tried to inject, and says nothing was acted on', () => {
    state = { kind: 'ready', messages: [msg({ injectionFlags: ['ignore_previous'] })] };
    render(<InboxDrawer />);
    expect(screen.getByText('suspicious')).toBeInTheDocument();
    expect(screen.getByText(/nothing was acted on/i)).toBeInTheDocument();
  });

  it('never renders the raw injection pattern text to the user', () => {
    state = { kind: 'ready', messages: [msg({ injectionFlags: ['exfiltrate'] })] };
    render(<InboxDrawer />);
    // The flag id is internal; the user sees a plain-language warning.
    expect(screen.queryByText('exfiltrate')).not.toBeInTheDocument();
  });

  it('invites a first scan when the index is empty', () => {
    state = { kind: 'ready', messages: [] };
    render(<InboxDrawer />);
    expect(screen.getByText(/nothing indexed yet/i)).toBeInTheDocument();
  });

  it('triggers a scan', async () => {
    state = { kind: 'ready', messages: [] };
    render(<InboxDrawer />);
    await userEvent.click(screen.getByRole('button', { name: /scan inbox/i }));
    expect(sync).toHaveBeenCalled();
  });

  it('surfaces a scan failure', async () => {
    sync.mockResolvedValueOnce('Gmail access expired. Reconnect in Profile.');
    state = { kind: 'ready', messages: [] };
    render(<InboxDrawer />);
    await userEvent.click(screen.getByRole('button', { name: /scan inbox/i }));
    expect(await screen.findByText(/access expired/i)).toBeInTheDocument();
  });

  it('offers a local wipe — the §12.8 kill switch', async () => {
    state = { kind: 'ready', messages: [msg()] };
    render(<InboxDrawer />);
    await userEvent.click(screen.getByRole('button', { name: /clear local copy/i }));
    expect(wipe).toHaveBeenCalled();
  });

  it('disables the scan button while scanning', () => {
    syncing = true;
    state = { kind: 'ready', messages: [] };
    render(<InboxDrawer />);
    expect(screen.getByRole('button', { name: /scanning/i })).toBeDisabled();
  });

  it('surfaces a load error', () => {
    state = { kind: 'error', message: 'db unavailable' };
    render(<InboxDrawer />);
    expect(screen.getByText('db unavailable')).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    state = { kind: 'ready', messages: [msg()] };
    const { container } = render(<InboxDrawer />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

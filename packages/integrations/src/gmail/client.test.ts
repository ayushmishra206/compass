import { describe, expect, it, vi } from 'vitest';
import {
  decodeBase64Url,
  extractPlainBody,
  getMessage,
  GmailError,
  listMessageIds,
  parseFrom,
  parseMessage,
} from './client';

const b64 = (s: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(s)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const ok = (body: unknown) => ({
  ok: true,
  status: 200,
  json: async () => body,
  text: async () => '',
});

describe('parseFrom', () => {
  it('splits a display name from an address', () => {
    expect(parseFrom('Jane Doe <jane@example.com>')).toEqual({
      name: 'Jane Doe',
      email: 'jane@example.com',
    });
  });

  it('strips quotes around the name', () => {
    expect(parseFrom('"Doe, Jane" <jane@example.com>').name).toBe('Doe, Jane');
  });

  it('handles a bare address', () => {
    expect(parseFrom('jane@example.com')).toEqual({ name: null, email: 'jane@example.com' });
  });

  it('lowercases the address', () => {
    expect(parseFrom('JANE@EXAMPLE.COM').email).toBe('jane@example.com');
  });

  it('handles a missing header', () => {
    expect(parseFrom(null)).toEqual({ name: null, email: null });
  });
});

describe('decodeBase64Url', () => {
  it('round-trips utf-8', () => {
    expect(decodeBase64Url(b64('héllo — 日本'))).toBe('héllo — 日本');
  });

  it('returns empty string on malformed input rather than throwing', () => {
    expect(decodeBase64Url('!!!not base64!!!')).toBe('');
  });
});

describe('extractPlainBody', () => {
  it('prefers text/plain', () => {
    const part = {
      mimeType: 'multipart/alternative',
      parts: [
        { mimeType: 'text/html', body: { data: b64('<p>html version</p>') } },
        { mimeType: 'text/plain', body: { data: b64('plain version') } },
      ],
    };
    expect(extractPlainBody(part)).toBe('plain version');
  });

  it('falls back to stripped html', () => {
    const part = {
      mimeType: 'text/html',
      body: { data: b64('<p>Hello <b>there</b></p>') },
    };
    expect(extractPlainBody(part)).toBe('Hello there');
  });

  it('drops script and style content entirely', () => {
    const part = {
      mimeType: 'text/html',
      body: { data: b64('<style>.x{}</style><script>alert(1)</script><p>Body</p>') },
    };
    const out = extractPlainBody(part);
    expect(out).toBe('Body');
    expect(out).not.toContain('alert');
  });

  it('recurses into nested multiparts', () => {
    const part = {
      mimeType: 'multipart/mixed',
      parts: [
        {
          mimeType: 'multipart/alternative',
          parts: [{ mimeType: 'text/plain', body: { data: b64('deep plain') } }],
        },
      ],
    };
    expect(extractPlainBody(part)).toBe('deep plain');
  });

  it('returns empty for an attachment-only message', () => {
    expect(extractPlainBody({ mimeType: 'application/pdf', body: { size: 100 } })).toBe('');
  });

  it('handles a missing payload', () => {
    expect(extractPlainBody(undefined)).toBe('');
  });
});

describe('parseMessage', () => {
  const raw = {
    id: 'm1',
    threadId: 't1',
    snippet: 'Can you review',
    internalDate: '1785661200000',
    payload: {
      headers: [
        { name: 'From', value: 'Jane <jane@example.com>' },
        { name: 'Subject', value: 'Q3 deck' },
      ],
      mimeType: 'text/plain',
      body: { data: b64('Please review before Thursday.') },
    },
  };

  it('maps headers and body', () => {
    const m = parseMessage(raw);
    expect(m.subject).toBe('Q3 deck');
    expect(m.fromEmail).toBe('jane@example.com');
    expect(m.body).toBe('Please review before Thursday.');
  });

  it('derives receivedAt from internalDate', () => {
    expect(parseMessage(raw).receivedAt).toBe(new Date(1785661200000).toISOString());
  });

  it('survives a message with no headers at all', () => {
    const m = parseMessage({ id: 'x' });
    expect(m.messageId).toBe('x');
    expect(m.subject).toBeNull();
    expect(m.body).toBe('');
  });
});

describe('listMessageIds', () => {
  it('defaults to the primary inbox in the last week', async () => {
    const fetchImpl = vi.fn(async (_u: string, _i?: RequestInit) =>
      ok({ messages: [{ id: 'a' }] }),
    );
    await listMessageIds({ accessToken: 'AT', fetchImpl: fetchImpl as unknown as typeof fetch });
    const url = new URL(String(fetchImpl.mock.calls[0]![0]));
    expect(url.searchParams.get('q')).toContain('in:inbox');
    expect(url.searchParams.get('q')).toContain('category:primary');
  });

  it('sends the bearer token', async () => {
    const fetchImpl = vi.fn(async (_u: string, _i?: RequestInit) => ok({ messages: [] }));
    await listMessageIds({ accessToken: 'AT', fetchImpl: fetchImpl as unknown as typeof fetch });
    const init = fetchImpl.mock.calls[0]![1] as RequestInit | undefined;
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer AT');
  });

  it('returns ids', async () => {
    const fetchImpl = vi.fn(async (_u: string, _i?: RequestInit) =>
      ok({ messages: [{ id: 'a' }, { id: 'b' }] }),
    );
    const ids = await listMessageIds({
      accessToken: 'AT',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(ids).toEqual(['a', 'b']);
  });

  it('tolerates an empty inbox', async () => {
    const fetchImpl = vi.fn(async (_u: string, _i?: RequestInit) => ok({}));
    expect(
      await listMessageIds({ accessToken: 'AT', fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).toEqual([]);
  });

  it('raises a typed error on 401', async () => {
    const fetchImpl = vi.fn(async (_u: string, _i?: RequestInit) => ({
      ok: false,
      status: 401,
      json: async () => ({}),
      text: async () => '',
    }));
    await expect(
      listMessageIds({ accessToken: 'AT', fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toMatchObject({ kind: 'unauthorized' });
  });
});

describe('getMessage', () => {
  it('requests the full format so the body is present', async () => {
    const fetchImpl = vi.fn(async (_u: string, _i?: RequestInit) => ok({ id: 'm1' }));
    await getMessage({
      accessToken: 'AT',
      messageId: 'm1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(String(fetchImpl.mock.calls[0]![0])).toContain('format=full');
  });

  it('url-encodes the message id', async () => {
    const fetchImpl = vi.fn(async (_u: string, _i?: RequestInit) => ok({ id: 'a/b' }));
    await getMessage({
      accessToken: 'AT',
      messageId: 'a/b',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(String(fetchImpl.mock.calls[0]![0])).toContain('a%2Fb');
  });
});

describe('GmailError', () => {
  it('marks 429 and 5xx retryable, 4xx not', () => {
    expect(new GmailError('rate_limited', 429).retryable).toBe(true);
    expect(new GmailError('server', 500).retryable).toBe(true);
    expect(new GmailError('forbidden', 403).retryable).toBe(false);
  });
});

describe('write surface', () => {
  it('exposes no send or modify capability', async () => {
    const mod = await import('./client');
    const names = Object.keys(mod).join(' ').toLowerCase();
    // AGENTS.md bans these outright; this is the test that keeps it true.
    expect(names).not.toContain('send');
    expect(names).not.toContain('draft');
    expect(names).not.toContain('trash');
    expect(names).not.toContain('delete');
  });
});

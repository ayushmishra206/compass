/**
 * Gmail API v3 client, read-only.
 *
 * Scope is `gmail.readonly` and nothing else. The PRD's §12 design reaches
 * `gmail.modify` for draft replies, but drafting is not in this phase, and
 * requesting a write scope for a feature that does not exist would violate
 * least privilege (invariant 4).
 *
 * There is no send path here and there must never be one: `messages.send` and
 * `drafts.send` are banned outright by AGENTS.md.
 */

const API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

export type GmailErrorKind = 'unauthorized' | 'forbidden' | 'rate_limited' | 'server' | 'unknown';

export class GmailError extends Error {
  readonly kind: GmailErrorKind;
  readonly status: number;
  readonly retryable: boolean;

  constructor(kind: GmailErrorKind, status: number) {
    super(`GMAIL_${kind.toUpperCase()}: ${status}`);
    this.name = 'GmailError';
    this.kind = kind;
    this.status = status;
    this.retryable = status === 429 || status >= 500;
  }
}

function classify(status: number): GmailErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  return 'unknown';
}

export interface GmailHeader {
  name?: string;
  value?: string;
}

export interface GmailMessagePart {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailMessagePart[];
}

export interface GmailRawMessage {
  id: string;
  threadId?: string;
  snippet?: string;
  internalDate?: string;
  payload?: { headers?: GmailHeader[] } & GmailMessagePart;
}

export interface ParsedMessage {
  messageId: string;
  threadId: string | null;
  fromEmail: string | null;
  fromName: string | null;
  subject: string | null;
  snippet: string | null;
  receivedAt: string;
  /** Plain-text body. Held in memory for extraction and never persisted. */
  body: string;
}

function header(headers: GmailHeader[] | undefined, name: string): string | null {
  const h = headers?.find((x) => x.name?.toLowerCase() === name.toLowerCase());
  return h?.value ?? null;
}

/** `Jane Doe <jane@example.com>` → name and address. */
export function parseFrom(raw: string | null): { name: string | null; email: string | null } {
  if (!raw) return { name: null, email: null };
  const angled = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (angled) {
    const name = angled[1]?.replace(/^"|"$/g, '').trim() || null;
    return { name, email: angled[2]?.trim().toLowerCase() ?? null };
  }
  const bare = raw.trim();
  return { name: null, email: bare.includes('@') ? bare.toLowerCase() : null };
}

export function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return '';
  }
}

/**
 * Extracts the plain-text body, preferring text/plain over text/html.
 *
 * HTML is stripped rather than rendered: passing markup to the model both
 * wastes tokens and gives an attacker another layer to hide instructions in.
 */
export function extractPlainBody(part: GmailMessagePart | undefined): string {
  if (!part) return '';

  if (part.mimeType === 'text/plain' && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }

  if (part.parts?.length) {
    const plain = part.parts.find((p) => p.mimeType === 'text/plain');
    if (plain?.body?.data) return decodeBase64Url(plain.body.data);
    for (const child of part.parts) {
      const found = extractPlainBody(child);
      if (found) return found;
    }
  }

  if (part.mimeType === 'text/html' && part.body?.data) {
    return decodeBase64Url(part.body.data)
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return '';
}

export function parseMessage(raw: GmailRawMessage): ParsedMessage {
  const headers = raw.payload?.headers;
  const from = parseFrom(header(headers, 'From'));
  const dateHeader = header(headers, 'Date');
  const receivedAt = raw.internalDate
    ? new Date(Number(raw.internalDate)).toISOString()
    : dateHeader
      ? new Date(dateHeader).toISOString()
      : new Date(0).toISOString();

  return {
    messageId: raw.id,
    threadId: raw.threadId ?? null,
    fromEmail: from.email,
    fromName: from.name,
    subject: header(headers, 'Subject'),
    snippet: raw.snippet ?? null,
    receivedAt,
    body: extractPlainBody(raw.payload),
  };
}

async function call<T>(path: string, accessToken: string, fetchImpl: typeof fetch): Promise<T> {
  const res = await fetchImpl(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new GmailError(classify(res.status), res.status);
  return (await res.json()) as T;
}

export async function listMessageIds(opts: {
  accessToken: string;
  query?: string;
  maxResults?: number;
  fetchImpl?: typeof fetch;
}): Promise<string[]> {
  const params = new URLSearchParams({
    maxResults: String(opts.maxResults ?? 25),
    // Default to the primary inbox: promotions and social generate volume
    // without generating commitments.
    q: opts.query ?? 'in:inbox category:primary newer_than:7d',
  });
  const res = await call<{ messages?: Array<{ id: string }> }>(
    `/messages?${params.toString()}`,
    opts.accessToken,
    opts.fetchImpl ?? fetch,
  );
  return (res.messages ?? []).map((m) => m.id);
}

export async function getMessage(opts: {
  accessToken: string;
  messageId: string;
  fetchImpl?: typeof fetch;
}): Promise<ParsedMessage> {
  const raw = await call<GmailRawMessage>(
    `/messages/${encodeURIComponent(opts.messageId)}?format=full`,
    opts.accessToken,
    opts.fetchImpl ?? fetch,
  );
  return parseMessage(raw);
}

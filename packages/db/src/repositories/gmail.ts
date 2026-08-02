import type { Db } from '../opfs';

/** Hard cap enforced on write, not just on read. §12.8: no body persisted. */
export const MAX_SNIPPET_CHARS = 500;

export interface ExtractedAction {
  title: string;
  owner: 'me' | 'other' | 'ambiguous';
  dueDate?: string | null;
  commitmentType: 'reply' | 'task' | 'meeting' | 'fyi';
  confidence: number;
}

export interface StoredMessage {
  messageId: string;
  threadId: string | null;
  fromEmail: string | null;
  fromName: string | null;
  subject: string | null;
  snippet: string | null;
  receivedAt: string;
  lastProcessedAt: string | null;
  priority: 'p1' | 'p2' | 'p3' | 'p4' | null;
  injectionFlags: string[];
  actions: ExtractedAction[];
  archived: boolean;
}

export interface GmailRepo {
  upsert(
    messages: Array<
      Omit<
        StoredMessage,
        'actions' | 'injectionFlags' | 'priority' | 'lastProcessedAt' | 'archived'
      >
    >,
  ): Promise<void>;
  list(limit?: number): Promise<StoredMessage[]>;
  get(messageId: string): Promise<StoredMessage | null>;
  /** Records extraction output. injectionFlags are pattern ids, never content. */
  saveExtraction(
    messageId: string,
    input: {
      priority: 'p1' | 'p2' | 'p3' | 'p4';
      actions: ExtractedAction[];
      injectionFlags: string[];
      processedAt: string;
    },
  ): Promise<void>;
  unprocessed(limit: number): Promise<StoredMessage[]>;
  /** §12.8 kill switch: wipes the whole index. */
  wipe(): Promise<void>;
  /** Drops rows older than the retention window. */
  pruneOlderThan(iso: string): Promise<number>;
}

function toMessage(r: Array<unknown>): StoredMessage {
  return {
    messageId: r[0] as string,
    threadId: (r[1] as string | null) ?? null,
    fromEmail: (r[2] as string | null) ?? null,
    fromName: (r[3] as string | null) ?? null,
    subject: (r[4] as string | null) ?? null,
    snippet: (r[5] as string | null) ?? null,
    receivedAt: r[6] as string,
    lastProcessedAt: (r[7] as string | null) ?? null,
    priority: (r[8] as StoredMessage['priority']) ?? null,
    injectionFlags: JSON.parse((r[9] as string) || '[]') as string[],
    actions: JSON.parse((r[10] as string) || '[]') as ExtractedAction[],
    archived: r[11] === 1,
  };
}

const COLS = `message_id, thread_id, from_email, from_name, subject, snippet,
              received_at, last_processed_at, priority, injection_flags,
              actions_json, archived`;

export function createGmailRepo(db: Db): GmailRepo {
  return {
    async upsert(messages) {
      for (const m of messages) {
        // Truncate here rather than trusting callers — this is the last point
        // before the value is durable.
        const snippet = (m.snippet ?? '').slice(0, MAX_SNIPPET_CHARS);
        db.exec({
          sql: `INSERT INTO gmail_messages_index
                  (message_id, thread_id, from_email, from_name, subject, snippet, received_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(message_id) DO UPDATE SET
                  thread_id   = excluded.thread_id,
                  from_email  = excluded.from_email,
                  from_name   = excluded.from_name,
                  subject     = excluded.subject,
                  snippet     = excluded.snippet,
                  received_at = excluded.received_at`,
          bind: [
            m.messageId,
            m.threadId,
            m.fromEmail,
            m.fromName,
            m.subject,
            snippet,
            m.receivedAt,
          ],
        });
      }
    },

    async list(limit = 50) {
      const rows = db.exec({
        sql: `SELECT ${COLS} FROM gmail_messages_index
              WHERE archived = 0 ORDER BY received_at DESC LIMIT ?`,
        bind: [limit],
        returnValue: 'resultRows',
      }) as Array<Array<unknown>>;
      return rows.map(toMessage);
    },

    async get(messageId) {
      const rows = db.exec({
        sql: `SELECT ${COLS} FROM gmail_messages_index WHERE message_id = ?`,
        bind: [messageId],
        returnValue: 'resultRows',
      }) as Array<Array<unknown>>;
      return rows[0] ? toMessage(rows[0]) : null;
    },

    async saveExtraction(messageId, input) {
      db.exec({
        sql: `UPDATE gmail_messages_index
              SET priority = ?, actions_json = ?, injection_flags = ?, last_processed_at = ?
              WHERE message_id = ?`,
        bind: [
          input.priority,
          JSON.stringify(input.actions),
          JSON.stringify(input.injectionFlags),
          input.processedAt,
          messageId,
        ],
      });
    },

    async unprocessed(limit) {
      const rows = db.exec({
        sql: `SELECT ${COLS} FROM gmail_messages_index
              WHERE last_processed_at IS NULL AND archived = 0
              ORDER BY received_at DESC LIMIT ?`,
        bind: [limit],
        returnValue: 'resultRows',
      }) as Array<Array<unknown>>;
      return rows.map(toMessage);
    },

    async wipe() {
      db.exec('DELETE FROM gmail_messages_index');
    },

    async pruneOlderThan(iso) {
      const before = db.exec({
        sql: 'SELECT COUNT(*) FROM gmail_messages_index WHERE received_at < ?',
        bind: [iso],
        returnValue: 'resultRows',
      }) as Array<Array<unknown>>;
      db.exec({
        sql: 'DELETE FROM gmail_messages_index WHERE received_at < ?',
        bind: [iso],
      });
      return (before[0]?.[0] as number) ?? 0;
    },
  };
}

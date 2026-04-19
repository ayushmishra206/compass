import type { InboxAction } from '@compass/core';
import { INBOX_ACTIONS } from '@compass/core/fixtures';
import { delay } from './_util.js';

export interface GmailMessage {
  id: string;
}

/**
 * Stub: looks up the canned extract by message id. Phase 4 replaces with the
 * real Gmail action-extraction pipeline (sanitize + LLM + schema).
 */
export async function extractGmailActions(msg: GmailMessage): Promise<InboxAction | null> {
  await delay(800);
  return INBOX_ACTIONS.find((a) => a.id === msg.id) ?? null;
}

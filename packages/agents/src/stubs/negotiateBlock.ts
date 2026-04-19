import type { BlockRule, NegotiationTurn } from '@compass/core';
import { delay } from './_util.js';

/**
 * Stub: yields a single assistant turn with a canned calm-coach response and
 * a `grant_5min` offer. Phase 3 replaces with streamed LLM negotiation.
 */
export async function* negotiateBlock(
  _rule: BlockRule,
  _reason: string,
): AsyncIterable<NegotiationTurn> {
  await delay(700);
  yield {
    role: 'assistant',
    text: 'Five minutes is usually closer to twenty-five for me too. Would a 5-minute window now — or a real break between Pomodoros — serve you better?',
    offer: 'grant_5min',
  };
}

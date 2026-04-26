import { delay } from './_util.js';

const FINAL_DRAFT = `Hey Mira — here are the three scenarios for Thursday:

1. Hold at $39. Retention is our strongest lever; adding friction at the price point without feature lift is a wash.
2. Raise to $49 with the AI pillars gated. Cleanest story but likely a 6-month dip before AI cohort catches up.
3. $49 with a 30-day trial and AI-on-by-default. My preference — softens the price raise and lets the Daily Agent prove itself.

Happy to walk through at 9 am. I'll bring cohort math.

— Ayush`;

/**
 * Stub: streams the canned draft 8 characters at a time after an initial
 * 800 ms "thinking" pause. Yields partial strings (growing prefix).
 */
export async function* draftReply(_action: { id: string }): AsyncIterable<string> {
  await delay(800);
  for (let i = 0; i < FINAL_DRAFT.length; i += 8) {
    yield FINAL_DRAFT.slice(0, Math.min(i + 8, FINAL_DRAFT.length));
    await delay(20);
  }
}

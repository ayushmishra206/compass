import type { Brief } from '@compass/core';
import { BRIEF } from '@compass/core/fixtures';
import { delay } from './_util.js';

export interface BriefInputs {
  now: string;
  [k: string]: unknown;
}

/** Stub: returns the canned prototype brief after 1.8 s. */
export async function generateMorningBrief(_inputs: BriefInputs): Promise<Brief> {
  await delay(1800);
  return BRIEF;
}

import { describe, expect, it } from 'vitest';
import { generateMorningBrief } from './generateMorningBrief.js';

describe('generateMorningBrief stub', () => {
  it('returns a valid Brief shape', async () => {
    const b = await generateMorningBrief({ now: '2026-04-20T07:10:00' });
    expect(b.oneLineMood).toBeTruthy();
    expect(b.pomodoros).toHaveLength(3);
    expect(b.topPriority.suggestedFocusMinutes).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from 'vitest';
import { TelemetryEventSchema } from './telemetry';

describe('TelemetryEvent schema', () => {
  it('parses a happy-path fixture', () => {
    const ok = TelemetryEventSchema.safeParse({
      id: 'te1',
      pseudonymousUserId: 'user123',
      ts: '2026-04-26T10:00:00Z',
      name: 'brief.generated',
      properties: {
        duration_ms: 1200,
        success: true,
      },
    });
    expect(ok.success).toBe(true);
  });

  it('rejects a missing required field', () => {
    expect(TelemetryEventSchema.safeParse({ id: 'te1' }).success).toBe(false);
  });
});

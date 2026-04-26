import { describe, it, expect } from 'vitest';
import { PingInputSchema, PingOutputSchema } from './ping';

describe('Ping schemas', () => {
  it('PingInput parses a valid utterance', () => {
    expect(PingInputSchema.safeParse({ utterance: 'hello' }).success).toBe(true);
  });
  it('PingOutput accepts pong:true with echo', () => {
    expect(PingOutputSchema.safeParse({ pong: true, echo: 'x' }).success).toBe(true);
  });
  it('PingOutput rejects pong:false', () => {
    expect(PingOutputSchema.safeParse({ pong: false, echo: 'x' }).success).toBe(false);
  });
});

import type { ProviderId } from '@compass/core';

export class LlmKeyMissing extends Error {
  constructor() {
    super('No LLM key configured');
    this.name = 'LlmKeyMissing';
  }
}

export class LlmKeyInvalid extends Error {
  constructor(
    public readonly provider: ProviderId,
    message?: string,
  ) {
    super(message ?? `Invalid key for ${provider}`);
    this.name = 'LlmKeyInvalid';
  }
}

export class LlmRateLimited extends Error {
  constructor(public readonly retryAfterMs?: number) {
    super('Rate limited');
    this.name = 'LlmRateLimited';
  }
}

export class LlmUnavailable extends Error {
  constructor(
    public readonly httpStatus?: number,
    message?: string,
  ) {
    super(message ?? 'LLM unavailable');
    this.name = 'LlmUnavailable';
  }
}

export class LlmSchemaError extends Error {
  constructor(
    public readonly zodIssues: unknown,
    public readonly lastResponse: unknown,
  ) {
    super('Schema validation failed after retries');
    this.name = 'LlmSchemaError';
  }
}

export class LlmTimeout extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Timed out after ${timeoutMs}ms`);
    this.name = 'LlmTimeout';
  }
}

/**
 * Thrown when a request carrying untrusted content is paired with a
 * state-changing capability. PRD §19.4.1 / architectural invariant 5.
 *
 * This is not a recoverable condition — it means a caller wired an extraction
 * path to a tool that can act, which is the exact shape of a prompt-injection
 * exploit. It fails loudly rather than degrading.
 */
export class LlmUntrustedToolViolation extends Error {
  constructor(taskId: string, capability: string) {
    super(
      `Task '${taskId}' reads untrusted content and may not hold the state-changing capability '${capability}'.`,
    );
    this.name = 'LlmUntrustedToolViolation';
  }
}

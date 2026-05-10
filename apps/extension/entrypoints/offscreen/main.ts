import { createHandlerRegistry, installRequestListener } from '@compass/runtime';
import type { Routes } from '@compass/runtime';
import {
  startDb,
  getDb,
  createBriefRepo,
  createPomodoroRepo,
  createCostLedgerRepo,
} from '@compass/db';
import type { StoredBriefing } from '@compass/db';
import {
  getActiveCredentials,
  LlmCredentialsLocked,
  getUserProfile,
  PingOutputSchema,
  codeToAffinity,
} from '@compass/core';
import {
  callWithSchema,
  createAnthropicProvider,
  createOpenAiProvider,
  createOpenRouterProvider,
  executeTask as llmExecuteTask,
} from '@compass/llm';
import type { LlmRequest } from '@compass/llm';
import { generateMorningBrief, generateEodReflection, type LlmRouter } from '@compass/agents';

void startDb();

const registry = createHandlerRegistry();

registry.register('system.ping', async ({ utterance }) => {
  const creds = await getActiveCredentials();
  if (!creds.openrouter && !creds.openai && !creds.anthropic) {
    // Fall back to synthetic when no key configured (dev/offline mode).
    return { pong: true as const, echo: utterance };
  }
  // For Phase 1.5 ping path we still hit OpenRouter when present (matches existing UX);
  // the multi-provider router is exercised by Phase 2+ tasks via executeTask().
  const orKey = creds.openrouter?.apiKey;
  if (!orKey) {
    return { pong: true as const, echo: utterance };
  }
  const provider = createOpenRouterProvider({ apiKey: orKey });
  const out = await callWithSchema(
    provider,
    {
      taskId: 'system.ping',
      model: 'anthropic/claude-haiku-4-5',
      system:
        'You are a connectivity diagnostic. Respond ONLY with the literal JSON object {"pong": true, "echo": "<the user\'s utterance>"}.',
      messages: [{ role: 'user', content: `<utterance>${utterance}</utterance>` }],
      maxOutputTokens: 50,
      timeoutMs: 15_000,
      trusted: true,
      schema: PingOutputSchema,
    },
    PingOutputSchema,
  );
  return out;
});

registry.register('llm.validateKey', async ({ provider, apiKey }) => {
  if (provider === 'openrouter') {
    return createOpenRouterProvider({ apiKey }).validateKey(apiKey);
  }
  if (provider === 'openai') {
    return createOpenAiProvider({ apiKey }).validateKey(apiKey);
  }
  if (provider === 'anthropic') {
    return createAnthropicProvider({ apiKey }).validateKey(apiKey);
  }
  return { valid: false, error: `Unknown provider: ${String(provider)}` };
});

const SCENE_MANIFEST_URL = 'https://assets.compassdash.com/scenes/manifest.v1.json';

registry.register('scenes.getManifest', async (req) => {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (req.etag) headers['If-None-Match'] = req.etag;

  const res = await fetch(SCENE_MANIFEST_URL, { headers });
  if (!res.ok) {
    throw new Error(`scene manifest fetch failed: ${res.status}`);
  }
  const manifest = (await res.json()) as Routes['scenes.getManifest']['res']['manifest'];
  return { manifest, fetchedAt: Date.now() };
});

registry.register('weather.getCurrent', async (req) => {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', req.lat.toFixed(3));
  url.searchParams.set('longitude', req.lon.toFixed(3));
  url.searchParams.set('current', 'weather_code,temperature_2m');

  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`open-meteo fetch failed: ${res.status}`);
  const json = (await res.json()) as {
    current: { weather_code: number; temperature_2m: number };
  };

  const code = json.current.weather_code;
  return {
    code,
    tempC: json.current.temperature_2m,
    summary: weatherSummary(code),
    affinity: codeToAffinity(code),
    fetchedAt: Date.now(),
  };
});

function weatherSummary(code: number): string {
  if (code === 0 || code === 1) return 'Clear';
  if (code === 2 || code === 3) return 'Cloudy';
  if (code === 45 || code === 48) return 'Foggy';
  if (code >= 51 && code <= 67) return 'Rainy';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'Snowy';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 95) return 'Stormy';
  return 'Mixed';
}

async function getScenesPhotoDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  const compass = await root.getDirectoryHandle('compass.opfs', { create: true });
  const scenes = await compass.getDirectoryHandle('scenes', { create: true });
  return scenes.getDirectoryHandle('photos', { create: true });
}

async function readCachedPhoto(sha256: string): Promise<Blob | null> {
  try {
    const dir = await getScenesPhotoDir();
    const handle = await dir.getFileHandle(`${sha256}.jpg`);
    const file = await handle.getFile();
    return file;
  } catch {
    return null;
  }
}

async function writeCachedPhoto(sha256: string, bytes: ArrayBuffer): Promise<void> {
  const dir = await getScenesPhotoDir();
  const handle = await dir.getFileHandle(`${sha256}.jpg`, { create: true });
  const writable = await handle.createWritable();
  try {
    await writable.write(bytes);
  } finally {
    await writable.close();
  }
}

registry.register('scenes.fetchPhoto', async (req) => {
  const cached = await readCachedPhoto(req.sha256);
  if (cached) {
    return { blobUrl: URL.createObjectURL(cached) };
  }

  const res = await fetch(req.url, { mode: 'cors', credentials: 'omit' });
  if (!res.ok) throw new Error(`photo fetch failed: ${res.status}`);
  const bytes = await res.arrayBuffer();
  await writeCachedPhoto(req.sha256, bytes);
  return {
    blobUrl: URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' })),
  };
});

// ── Brief handlers ────────────────────────────────────────────────────────────

async function getBriefRepo() {
  const db = await getDb();
  return createBriefRepo(db);
}
async function getPomodoroRepo() {
  const db = await getDb();
  return createPomodoroRepo(db);
}
async function getCostLedger() {
  const db = await getDb();
  return createCostLedgerRepo(db);
}

const router: LlmRouter = {
  executeTask: async (req) => {
    // schema is typed unknown on LlmRouter but ZodTypeAny on llmExecuteTask;
    // both accept undefined and the runtime value is always a Zod schema.
    const schema = req.schema as LlmRequest['schema'];
    const res = await llmExecuteTask(
      req.taskId,
      { system: req.system, messages: req.messages, schema },
      { trusted: req.trusted },
    );
    // LlmResponse.parsed is optional; LlmRouter contract requires parsed: unknown.
    return { ...res, parsed: res.parsed as unknown };
  },
};

function todayLocalIso(timezone: string): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: timezone });
}

function nextOccurrenceAtHour(hour: number): string {
  const next = new Date();
  next.setHours(hour, 0, 0, 0);
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
  return next.toISOString();
}

registry.register('brief.morning', async ({ trigger: _t, force }) => {
  const briefRepo = await getBriefRepo();
  const profile = await getUserProfile();
  const today = todayLocalIso(profile.timezone);

  if (!force) {
    const existing = await briefRepo.getByDate(today, 'morning');
    if (existing) return { stored: existing };
  }

  try {
    await getActiveCredentials();
  } catch (e) {
    if (e instanceof LlmCredentialsLocked) return { skipped: 'locked' as const };
    throw e;
  }

  const result = await generateMorningBrief({
    briefRepo,
    pomodoroRepo: await getPomodoroRepo(),
    weatherRpc: async () => null, // Phase 1.6 weather wired in shell hook; offscreen call deferred
    router,
    costLedger: await getCostLedger(),
    now: () => new Date(),
    userProfile: profile,
  });

  const stored: StoredBriefing = {
    dateLocal: today,
    kind: 'morning',
    generatedAt: new Date().toISOString(),
    output: result.output,
    openedAt: null,
    userRating: null,
    providerUsed: result.providerUsed,
    costUsd: result.costUsd,
  };
  await briefRepo.upsert(stored);
  return { stored };
});

registry.register('brief.eod', async ({ trigger: _t, force }) => {
  const briefRepo = await getBriefRepo();
  const profile = await getUserProfile();
  const today = todayLocalIso(profile.timezone);

  if (!force) {
    const existing = await briefRepo.getByDate(today, 'eod');
    if (existing) return { stored: existing };
  }

  const morning = await briefRepo.getByDate(today, 'morning');
  if (!morning) return { skipped: 'no-morning-brief' as const };

  try {
    await getActiveCredentials();
  } catch (e) {
    if (e instanceof LlmCredentialsLocked) return { skipped: 'locked' as const };
    throw e;
  }

  const result = await generateEodReflection({
    briefRepo,
    pomodoroRepo: await getPomodoroRepo(),
    router,
    costLedger: await getCostLedger(),
    now: () => new Date(),
    userProfile: profile,
  });

  const stored: StoredBriefing = {
    dateLocal: today,
    kind: 'eod',
    generatedAt: new Date().toISOString(),
    output: result.output,
    openedAt: null,
    userRating: null,
    providerUsed: result.providerUsed,
    costUsd: result.costUsd,
  };
  await briefRepo.upsert(stored);
  return { stored };
});

registry.register('brief.getOrGenerate', async ({ kind }) => {
  const briefRepo = await getBriefRepo();
  const profile = await getUserProfile();
  const today = todayLocalIso(profile.timezone);

  const existing = await briefRepo.getByDate(today, kind);
  if (existing) return { kind: 'have-brief' as const, brief: existing };

  const targetHour = kind === 'morning' ? profile.briefingHour : profile.reflectionHour;
  if (new Date().getHours() < targetHour) {
    return { kind: 'too-early' as const, readyAt: nextOccurrenceAtHour(targetHour) };
  }

  try {
    await getActiveCredentials();
  } catch (e) {
    if (e instanceof LlmCredentialsLocked) return { kind: 'locked-no-brief' as const };
    throw e;
  }

  if (kind === 'morning') {
    const result = await generateMorningBrief({
      briefRepo,
      pomodoroRepo: await getPomodoroRepo(),
      weatherRpc: async () => null,
      router,
      costLedger: await getCostLedger(),
      now: () => new Date(),
      userProfile: profile,
    });
    const stored: StoredBriefing = {
      dateLocal: today,
      kind: 'morning',
      generatedAt: new Date().toISOString(),
      output: result.output,
      openedAt: null,
      userRating: null,
      providerUsed: result.providerUsed,
      costUsd: result.costUsd,
    };
    await briefRepo.upsert(stored);
    return { kind: 'have-brief' as const, brief: stored };
  } else {
    const morning = await briefRepo.getByDate(today, 'morning');
    if (!morning) return { kind: 'locked-no-brief' as const };
    const result = await generateEodReflection({
      briefRepo,
      pomodoroRepo: await getPomodoroRepo(),
      router,
      costLedger: await getCostLedger(),
      now: () => new Date(),
      userProfile: profile,
    });
    const stored: StoredBriefing = {
      dateLocal: today,
      kind: 'eod',
      generatedAt: new Date().toISOString(),
      output: result.output,
      openedAt: null,
      userRating: null,
      providerUsed: result.providerUsed,
      costUsd: result.costUsd,
    };
    await briefRepo.upsert(stored);
    return { kind: 'have-brief' as const, brief: stored };
  }
});

registry.register('brief.recordOpen', async ({ dateLocal, kind }) => {
  const briefRepo = await getBriefRepo();
  await briefRepo.recordOpen(dateLocal, kind, new Date().toISOString());
  return { ok: true as const };
});

registry.register('brief.recordRating', async ({ dateLocal, kind, rating }) => {
  const briefRepo = await getBriefRepo();
  await briefRepo.recordRating(dateLocal, kind, rating);
  return { ok: true as const };
});

registry.register('brief.streak', async () => {
  const briefRepo = await getBriefRepo();
  const status = await briefRepo.recentOpenStatus(60);
  let days = 0;
  let lastDate: string | null = null;
  for (const day of status) {
    if (day.opened) {
      days++;
      if (lastDate === null) lastDate = day.dateLocal;
    } else {
      break;
    }
  }
  return { days, lastDate };
});

// ── Ledger handlers ──────────────────────────────────────────────────────────

registry.register('ledger.getMonthlySpend', async ({ monthStartIso }) => {
  const repo = await getCostLedger();
  return await repo.monthlySpend(monthStartIso);
});

// ── Pomodoro handlers ─────────────────────────────────────────────────────────

registry.register('pomodoro.start', async ({ id, durationMin, theme }) => {
  const repo = await getPomodoroRepo();
  await repo.start({ id, durationMin, theme });
  return { ok: true as const };
});

registry.register('pomodoro.complete', async ({ id }) => {
  const repo = await getPomodoroRepo();
  await repo.complete(id);
  return { ok: true as const };
});

registry.register('pomodoro.abandon', async ({ id }) => {
  const repo = await getPomodoroRepo();
  await repo.abandon(id);
  return { ok: true as const };
});

// Phase 1.5 alarms: accept the heavy-doc-keepalive Port from withHeavyDocAlive().
// The Port being open is itself the keepalive — Chrome will not evict either side
// while at least one Port is connected. No work to do in the listener.
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'heavy-doc-keepalive') {
    // intentionally empty — open Port is the contract
  }
});

installRequestListener(registry);

console.log('Compass offscreen mounted; handlers registered.');

import { LlmCredentialsSchema, type LlmCredentials } from '../types/credentials';

const STORAGE_KEY = 'llm.creds.v1';

export async function getActiveCredentials(): Promise<LlmCredentials> {
  const raw = await chrome.storage.local.get(STORAGE_KEY);
  const parsed = LlmCredentialsSchema.safeParse(raw[STORAGE_KEY]);
  if (parsed.success) return parsed.data;
  return { default: null };
}

export async function setActiveCredentials(creds: LlmCredentials): Promise<void> {
  const validated = LlmCredentialsSchema.parse(creds);
  await chrome.storage.local.set({ [STORAGE_KEY]: validated });
}

export async function clearActiveCredentials(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}

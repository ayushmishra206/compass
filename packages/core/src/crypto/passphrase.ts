export const MIN_PASSPHRASE_LENGTH = 12;

export function passphraseStrength(p: string): 'weak' | 'medium' | 'strong' {
  if (p.length < MIN_PASSPHRASE_LENGTH) return 'weak';
  if (p.length < 20) return 'medium';
  return 'strong';
}

export function passphraseError(p: string): string | null {
  if (p.length < MIN_PASSPHRASE_LENGTH) {
    return `At least ${MIN_PASSPHRASE_LENGTH} characters.`;
  }
  return null;
}

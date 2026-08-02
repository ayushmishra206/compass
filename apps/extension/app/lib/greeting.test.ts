import { describe, expect, it } from 'vitest';
import { buildGreeting, buildSubline, dayPart, focusLabel } from './greeting';

const at = (hour: number) => new Date(2026, 7, 2, hour, 0, 0);

describe('dayPart', () => {
  it.each([
    [0, 'night'],
    [4, 'night'],
    [5, 'earlyMorning'],
    [7, 'earlyMorning'],
    [8, 'morning'],
    [11, 'morning'],
    [12, 'afternoon'],
    [16, 'afternoon'],
    [17, 'evening'],
    [21, 'evening'],
    [22, 'night'],
    [23, 'night'],
  ])('maps hour %i to %s', (hour, expected) => {
    expect(dayPart(hour)).toBe(expected);
  });
});

describe('buildGreeting', () => {
  it('uses the name when there is one', () => {
    const g = buildGreeting(at(9), 'Ayush');
    expect(g.lead).toBe('Good morning, ');
    expect(g.emphasis).toBe('Ayush');
  });

  it('adapts the lead to the hour', () => {
    expect(buildGreeting(at(14), 'Ayush').lead).toBe('Good afternoon, ');
    expect(buildGreeting(at(23), 'Ayush').lead).toBe('Still up, ');
  });

  it('trims a padded name', () => {
    expect(buildGreeting(at(9), '  Ayush  ').emphasis).toBe('Ayush');
  });

  it('falls back to the time of day when there is no name', () => {
    const g = buildGreeting(at(9), null);
    expect(g.emphasis).toBe('morning');
    expect(`${g.lead}${g.emphasis}${g.trailing}`).toBe('Good morning.');
  });

  it('treats an all-whitespace name as no name', () => {
    expect(buildGreeting(at(9), '   ').emphasis).toBe('morning');
  });

  it('treats undefined as no name', () => {
    expect(buildGreeting(at(9)).emphasis).toBe('morning');
  });

  it('never produces the old fixed slogan', () => {
    for (let h = 0; h < 24; h++) {
      const g = buildGreeting(at(h), 'Ayush');
      expect(`${g.lead}${g.emphasis}${g.trailing}`).not.toContain('Move with momentum');
    }
  });

  it('always produces a complete sentence', () => {
    for (let h = 0; h < 24; h++) {
      for (const name of ['Ayush', null]) {
        const g = buildGreeting(at(h), name);
        const full = `${g.lead}${g.emphasis}${g.trailing}`;
        expect(full.length).toBeGreaterThan(3);
        expect(full.endsWith('.')).toBe(true);
      }
    }
  });
});

describe('buildSubline', () => {
  const fallback = { dawn: 'Clear ridge, slow climb.', fog: 'Soft edges.' };

  it('prefers the brief mood and tldr', () => {
    expect(
      buildSubline({
        briefMood: 'Rested and lightly loaded.',
        briefTldr: 'Two meetings, one deep block.',
        sceneMood: 'dawn',
        fallbackBySceneMood: fallback,
      }),
    ).toBe('Rested and lightly loaded. Two meetings, one deep block.');
  });

  it('uses the tldr alone when there is no mood line', () => {
    expect(
      buildSubline({
        briefMood: null,
        briefTldr: 'Two meetings.',
        sceneMood: 'dawn',
        fallbackBySceneMood: fallback,
      }),
    ).toBe('Two meetings.');
  });

  it('falls back to scene flavour when there is no brief', () => {
    expect(
      buildSubline({
        briefMood: null,
        briefTldr: null,
        sceneMood: 'fog',
        fallbackBySceneMood: fallback,
      }),
    ).toBe('Soft edges.');
  });

  it('returns empty rather than undefined for an unknown scene', () => {
    expect(
      buildSubline({
        briefMood: null,
        briefTldr: null,
        sceneMood: 'nonexistent',
        fallbackBySceneMood: fallback,
      }),
    ).toBe('');
  });

  it('ignores whitespace-only brief fields', () => {
    expect(
      buildSubline({
        briefMood: '  ',
        briefTldr: '',
        sceneMood: 'fog',
        fallbackBySceneMood: fallback,
      }),
    ).toBe('Soft edges.');
  });
});

describe('focusLabel', () => {
  it('formats minutes under an hour', () => {
    expect(focusLabel(45)).toBe('45 min');
  });

  it('formats whole hours', () => {
    expect(focusLabel(120)).toBe('2 hr');
  });

  it('formats mixed hours and minutes', () => {
    expect(focusLabel(90)).toBe('1h 30m');
  });

  it('defaults to a pomodoro when unset', () => {
    expect(focusLabel(null)).toBe('25 min');
    expect(focusLabel(undefined)).toBe('25 min');
    expect(focusLabel(0)).toBe('25 min');
  });
});

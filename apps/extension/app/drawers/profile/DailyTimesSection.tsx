import { useEffect, useState, type CSSProperties } from 'react';
import { getUserProfile, setUserProfile, type UserProfile } from '@compass/core';
import { rpc } from '@compass/runtime';

const sectionLabelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-ink-3)',
  marginBottom: 10,
};
const sectionWrap: CSSProperties = {
  marginBottom: 26,
  paddingBottom: 18,
  borderBottom: '1px solid var(--color-hair)',
};
const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  margin: '8px 0',
  fontSize: 12.5,
  color: 'var(--color-ink-2)',
};
const selectStyle: CSSProperties = {
  padding: '6px 10px',
  fontSize: 12,
  borderRadius: 6,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'var(--color-ink)',
};
const inputStyle: CSSProperties = {
  ...selectStyle,
  width: 90,
};
const readOnlyStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  color: 'var(--color-ink-3)',
};

const HOURS = Array.from({ length: 24 }, (_, h) => h);
function formatHourLabel(h: number): string {
  const ampm = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${ampm}`;
}

export function DailyTimesSection() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    void getUserProfile().then(setProfile);
  }, []);

  const update = async (patch: Partial<UserProfile>) => {
    const next = await setUserProfile(patch);
    setProfile(next);
    if (patch.briefingHour !== undefined || patch.reflectionHour !== undefined) {
      await rpc('alarms.refresh', {});
    }
  };

  if (!profile) return <div style={sectionWrap} />;

  return (
    <div style={sectionWrap}>
      <div style={sectionLabelStyle}>Daily times</div>

      <div style={rowStyle}>
        <label htmlFor="briefingHour">Morning brief</label>
        <select
          id="briefingHour"
          value={profile.briefingHour}
          onChange={(e) => void update({ briefingHour: parseInt(e.target.value, 10) })}
          style={selectStyle}
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {formatHourLabel(h)}
            </option>
          ))}
        </select>
      </div>

      <div style={rowStyle}>
        <label htmlFor="reflectionHour">EOD reflection</label>
        <select
          id="reflectionHour"
          value={profile.reflectionHour}
          onChange={(e) => void update({ reflectionHour: parseInt(e.target.value, 10) })}
          style={selectStyle}
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {formatHourLabel(h)}
            </option>
          ))}
        </select>
      </div>

      <div style={rowStyle}>
        <label htmlFor="workStart">Work hours</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            id="workStart"
            aria-label="Work start time"
            type="time"
            value={profile.workHours.start}
            onChange={(e) =>
              void update({ workHours: { ...profile.workHours, start: e.target.value } })
            }
            style={inputStyle}
          />
          <input
            id="workEnd"
            aria-label="Work end time"
            type="time"
            value={profile.workHours.end}
            onChange={(e) =>
              void update({ workHours: { ...profile.workHours, end: e.target.value } })
            }
            style={inputStyle}
          />
        </div>
      </div>

      <div style={rowStyle}>
        <span>Timezone</span>
        <span style={readOnlyStyle}>{profile.timezone}</span>
      </div>

      <div style={rowStyle}>
        <span>Locale</span>
        <span style={readOnlyStyle}>{profile.locale}</span>
      </div>
    </div>
  );
}

import { rpc, withHeavyDocAlive } from '@compass/runtime';

export interface AlarmEvents {
  addListener(listener: (alarm: { name: string }) => void): void;
}

function defaultEvents(): AlarmEvents {
  return chrome.alarms.onAlarm as unknown as AlarmEvents;
}

export function registerAlarmHandlers(events: AlarmEvents = defaultEvents()): void {
  events.addListener((alarm) => {
    if (alarm.name === 'morning-brief') {
      void withHeavyDocAlive(() => rpc('brief.morning', { trigger: 'alarm' }));
    } else if (alarm.name === 'eod-reflection') {
      void withHeavyDocAlive(() => rpc('brief.eod', { trigger: 'alarm' }));
    }
    // Unknown alarm names: drop silently.
  });
}

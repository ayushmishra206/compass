import { rpc, withHeavyDocAlive } from '@compass/runtime';

export interface AlarmEvents {
  addListener(listener: (alarm: { name: string }) => void): void;
}

function defaultEvents(): AlarmEvents {
  return chrome.alarms.onAlarm as unknown as AlarmEvents;
}

export function registerAlarmHandlers(events: AlarmEvents = defaultEvents()): void {
  events.addListener((alarm) => {
    void withHeavyDocAlive(() => rpc('system.ping', { utterance: alarm.name }));
  });
}

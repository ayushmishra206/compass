import { useEffect, useMemo, useRef, useState } from 'react';
import {
  pickMoodByHour,
  pickScene,
  type Scene,
  type SceneManifest,
  type WxAffinity,
} from '@compass/core';
import { useShell } from '../state/shell.js';
import { useGeolocation } from './useGeolocation.js';
import { rpc } from '@compass/runtime';

interface SceneView {
  imageUrl: string | null;
  label: string;
  photographer: string;
  attribution: string;
  mood: ReturnType<typeof pickMoodByHour>;
}

const MANIFEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const WEATHER_TTL_MS = 90 * 60 * 1000;

function readCached<T>(key: string): { value: T; ts: number } | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { value: T; ts: number };
  } catch {
    return null;
  }
}

function writeCached<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify({ value, ts: Date.now() }));
}

function dateSeed(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useScene(): SceneView {
  const weatherEnabled = useShell((s) => s.weatherEnabled);
  const pinnedScene = useShell((s) => s.pinnedScene);
  const { coords } = useGeolocation({ enabled: weatherEnabled });

  const [manifest, setManifest] = useState<SceneManifest | null>(
    () => readCached<SceneManifest>('compass.scenes.manifest')?.value ?? null,
  );
  const [weather, setWeather] = useState<WxAffinity | null>(
    () => readCached<{ affinity: WxAffinity }>('compass.weather.cache')?.value?.affinity ?? null,
  );
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [tickMs, setTickMs] = useState(() => Date.now());
  const lastShaRef = useRef<string | null>(null);

  useEffect(() => {
    const cached = readCached<SceneManifest>('compass.scenes.manifest');
    const stale = !cached || Date.now() - cached.ts > MANIFEST_TTL_MS;
    if (!stale && cached) {
      setManifest(cached.value);
      return;
    }
    // rpc() awaits the heavy.wakeup handshake internally, so this is safe
    // even on a cold extension start when the offscreen doc isn't alive yet.
    void rpc('scenes.getManifest', {}).then((res) => {
      setManifest(res.manifest);
      writeCached('compass.scenes.manifest', res.manifest);
    });
  }, []);

  useEffect(() => {
    if (!weatherEnabled || !coords) {
      setWeather(null);
      return;
    }
    const cached = readCached<{ affinity: WxAffinity; lat: number; lon: number }>(
      'compass.weather.cache',
    );
    const fresh =
      cached &&
      Date.now() - cached.ts < WEATHER_TTL_MS &&
      cached.value.lat === coords.lat &&
      cached.value.lon === coords.lon;
    if (fresh) {
      setWeather(cached.value.affinity);
      return;
    }
    void rpc('weather.getCurrent', coords).then((res) => {
      setWeather(res.affinity);
      writeCached('compass.weather.cache', {
        affinity: res.affinity,
        lat: coords.lat,
        lon: coords.lon,
      });
    });
  }, [weatherEnabled, coords?.lat, coords?.lon]);

  useEffect(() => {
    const id = setInterval(() => setTickMs(Date.now()), 15 * 60 * 1000);
    const onVis = () => setTickMs(Date.now());
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const picked: Scene | null = useMemo(() => {
    if (!manifest) return null;
    const now = new Date(tickMs);
    if (pinnedScene) {
      const fakeNow = new Date(now);
      const hourMap = { dawn: 4, fog: 9, ocean: 13, alpine: 17, desert: 21 } as const;
      fakeNow.setHours(hourMap[pinnedScene]);
      return pickScene(fakeNow, weather, manifest, dateSeed(now));
    }
    return pickScene(now, weather, manifest, dateSeed(now));
  }, [manifest, weather, pinnedScene, tickMs]);

  useEffect(() => {
    if (!picked) return;
    if (lastShaRef.current === picked.sha256) return;
    lastShaRef.current = picked.sha256;
    void rpc('scenes.fetchPhoto', { url: picked.url, sha256: picked.sha256 }).then((res) =>
      setImageUrl(res.blobUrl),
    );
  }, [picked?.sha256]);

  return {
    imageUrl,
    label: picked ? `${picked.mood.charAt(0).toUpperCase()}${picked.mood.slice(1)}` : '—',
    photographer: picked?.photographer ?? '',
    attribution: picked?.attribution ?? '',
    mood: picked?.mood ?? pickMoodByHour(new Date().getHours()),
  };
}

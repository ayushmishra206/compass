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
const LAST_IMAGE_KEY = 'compass.scenes.lastImageUrl';

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

// The compass-assets manifest currently bakes `w=2400&q=80` into every Unsplash
// URL. On high-DPI displays that gets visibly soft; bump to w=2880 / q=90 and
// let Unsplash auto-format negotiate WebP for Chrome. Until the upstream
// manifest is regenerated, transform on the client.
function upgradeUnsplashUrl(url: string): string {
  if (!url.includes('images.unsplash.com')) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('w', '2880');
    u.searchParams.set('q', '90');
    u.searchParams.set('auto', 'format');
    u.searchParams.set('fit', 'max');
    return u.toString();
  } catch {
    return url;
  }
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
  // Seed from the last successful render. The browser HTTP cache almost
  // certainly still has the bytes, so the user sees a photo on first paint
  // instead of staring at --color-bg while the offscreen RPC roundtrips.
  const [imageUrl, setImageUrl] = useState<string | null>(
    () => localStorage.getItem(LAST_IMAGE_KEY) ?? null,
  );
  const [tickMs, setTickMs] = useState(() => Date.now());
  const lastShaRef = useRef<string | null>(null);

  useEffect(() => {
    const cached = readCached<SceneManifest>('compass.scenes.manifest');
    const stale = !cached || Date.now() - cached.ts > MANIFEST_TTL_MS;
    if (!stale && cached) {
      setManifest(cached.value);
      return;
    }
    let cancelled = false;
    // The first new tab after a cold extension start can race the offscreen-doc
    // creation: the SW receives the rpc broadcast and triggers ensureHeavyDoc,
    // but the offscreen handler isn't registered yet when our message arrives,
    // so the message is dropped silently. Retry a few times with backoff so the
    // user doesn't have to manually reload the new tab.
    const fetchManifest = async () => {
      const delaysMs = [0, 800, 1600, 3200];
      for (const delay of delaysMs) {
        if (cancelled) return;
        if (delay > 0) await new Promise((r) => setTimeout(r, delay));
        try {
          const res = await Promise.race([
            rpc('scenes.getManifest', {}),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('rpc timeout')), 4000),
            ),
          ]);
          if (cancelled) return;
          setManifest(res.manifest);
          writeCached('compass.scenes.manifest', res.manifest);
          return;
        } catch {
          // fall through to next retry
        }
      }
    };
    void fetchManifest();
    return () => {
      cancelled = true;
    };
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
    const highQualityUrl = upgradeUnsplashUrl(picked.url);
    // Paint immediately from the CDN URL — eliminates the black flash that
    // was occurring while the offscreen RPC fetched + cached the blob.
    setImageUrl(highQualityUrl);
    localStorage.setItem(LAST_IMAGE_KEY, highQualityUrl);
    // Warm the OPFS cache in the background so offline / re-open is instant.
    // Failure here does not regress visual quality — the CDN URL stays live.
    void rpc('scenes.fetchPhoto', { url: highQualityUrl, sha256: picked.sha256 })
      .then((res) => setImageUrl(res.blobUrl))
      .catch(() => {});
  }, [picked?.sha256]);

  return {
    imageUrl,
    label: picked ? `${picked.mood.charAt(0).toUpperCase()}${picked.mood.slice(1)}` : '—',
    photographer: picked?.photographer ?? '',
    attribution: picked?.attribution ?? '',
    mood: picked?.mood ?? pickMoodByHour(new Date().getHours()),
  };
}

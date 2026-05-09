export function relativeTime(input: Date | string): string {
  const t = typeof input === 'string' ? new Date(input).getTime() : input.getTime();
  const elapsedMs = Date.now() - t;
  const sec = Math.floor(elapsedMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return min === 1 ? '1 minute ago' : `${min} minutes ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr === 1 ? '1 hour ago' : `${hr} hours ago`;
  const day = Math.floor(hr / 24);
  return day === 1 ? '1 day ago' : `${day} days ago`;
}

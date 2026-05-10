// Notes pipeline helpers used by the offscreen RPC handlers.

const SHORT_LIMIT = 1500;
const WINDOW = 1200;

export function headingsOf(body: string): string[] {
  return body
    .split('\n')
    .filter((l) => /^#{1,6}\s/.test(l))
    .map((l) => l.trim());
}

export function isMinorEdit(prevBody: string, nextBody: string): boolean {
  const a = headingsOf(prevBody).join('\n');
  const b = headingsOf(nextBody).join('\n');
  if (a !== b) return false;
  return Math.abs(nextBody.length - prevBody.length) < 50;
}

/**
 * Chunk a note into one or more text segments, each prefixed with the title.
 * - Bodies ≤ 1500 chars → one chunk.
 * - Otherwise split on ATX headings, then sub-window 1200-char sliding windows.
 */
export function chunkNote(title: string, body: string): string[] {
  const head = title.trim();
  if (body.length <= SHORT_LIMIT) return [`${head}\n\n${body}`.trim()];

  const lines = body.split('\n');
  const headingPositions: number[] = [];
  let cursor = 0;
  for (const l of lines) {
    if (/^#{1,6}\s/.test(l)) headingPositions.push(cursor);
    cursor += l.length + 1;
  }
  if (headingPositions.length === 0 || headingPositions[0] !== 0) {
    headingPositions.unshift(0);
  }
  headingPositions.push(body.length);

  const sections: string[] = [];
  for (let i = 0; i < headingPositions.length - 1; i++) {
    const start = headingPositions[i]!;
    const end = headingPositions[i + 1]!;
    sections.push(body.slice(start, end).trim());
  }

  const out: string[] = [];
  for (const s of sections) {
    if (s.length <= WINDOW) {
      out.push(`${head}\n\n${s}`);
    } else {
      for (let off = 0; off < s.length; off += WINDOW) {
        out.push(`${head}\n\n${s.slice(off, off + WINDOW)}`);
      }
    }
  }
  return out;
}

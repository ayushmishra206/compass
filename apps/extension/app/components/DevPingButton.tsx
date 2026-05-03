import { useState } from 'react';
import { rpc } from '@compass/runtime';
import { Button } from '@compass/ui';

export function DevPingButton() {
  const [result, setResult] = useState<string>('');

  async function handleClick(): Promise<void> {
    setResult('…');
    try {
      const res = await rpc('system.ping', { utterance: `t-${Date.now()}` });
      setResult(JSON.stringify(res));
    } catch (err) {
      setResult(`error: ${(err as Error).message}`);
    }
  }

  return (
    <div className="border border-hair p-2 text-mono text-xs">
      <Button onClick={handleClick}>Run ping</Button>
      <pre className="mt-2">{result}</pre>
    </div>
  );
}

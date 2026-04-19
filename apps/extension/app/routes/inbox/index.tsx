import { useEffect, useState } from 'react';
import { INBOX_ACTIONS } from '@compass/core/fixtures';
import type { InboxAction, InboxPriority } from '@compass/core';
import {
  Badge,
  Button,
  Card,
  IconArrow,
  IconCalendar,
  IconCheck,
  IconClose,
  IconWand,
  Modal,
  ModalBody,
  ModalHeader,
} from '@compass/ui';
import { stubs } from '@compass/agents';
import { useShell } from '@app/state/shell.js';

const PRI_COLOR: Record<InboxPriority, string> = {
  p1: 'var(--accent-ink)',
  p2: 'var(--accent-ink)',
  p3: 'var(--ink-3)',
  p4: 'var(--ink-4)',
};

export function Inbox() {
  const [selId, setSelId] = useState('a1');
  const shell = useShell();
  const sel = INBOX_ACTIONS.find((a) => a.id === selId);

  return (
    <div className="grid grid-cols-[380px_1fr]">
      <div className="border-r border-[var(--hair)] min-h-[calc(100vh-58px)]">
        <div className="px-5 py-4 border-b border-[var(--hair)]">
          <div className="flex items-baseline gap-2.5">
            <div className="font-serif text-[20px] font-medium">Actions</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)]">
              last scan 6 min · next 12:15 pm
            </div>
          </div>
          <div className="flex gap-1.5 mt-2.5">
            <Badge variant="accent">3 need reply</Badge>
            <Badge>2 P1</Badge>
            <Badge>gmail.modify</Badge>
          </div>
        </div>
        {INBOX_ACTIONS.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => setSelId(it.id)}
            className="w-full text-left px-5 py-3.5 border-b border-[var(--hair)]"
            style={{
              background: selId === it.id ? 'var(--accent-wash)' : 'transparent',
            }}
          >
            <div className="flex items-baseline gap-2.5">
              <span
                className="font-mono text-[10px] font-medium uppercase"
                style={{ color: PRI_COLOR[it.priority] }}
              >
                {it.priority.toUpperCase()}
              </span>
              <div className="text-[13.5px] font-medium flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                {it.subject}
              </div>
              <span className="font-mono text-[10px] text-[var(--ink-4)]">{it.received}</span>
            </div>
            <div className="text-[12px] text-[var(--ink-3)] mt-1">{it.from}</div>
            {it.actions.length > 0 && (
              <div className="text-[12px] text-[var(--ink-2)] mt-1.5 flex gap-1.5 items-start">
                <span className="text-[var(--accent-ink)] mt-[1px]">
                  <IconArrow size={11} />
                </span>
                <span>{it.actions[0]!.title}</span>
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="px-9 pt-7 pb-20 max-w-[780px]">
        {sel && <ActionDetail action={sel} onDraft={() => shell.openOverlay('draft', sel)} />}
        {shell.overlay === 'draft' && <DraftModal onClose={shell.closeOverlay} />}
      </div>
    </div>
  );
}

function ActionDetail({ action, onDraft }: { action: InboxAction; onDraft: () => void }) {
  return (
    <>
      <div className="flex gap-2.5 items-center mb-2.5">
        <span
          className="font-mono text-[10px] font-medium uppercase"
          style={{ color: PRI_COLOR[action.priority] }}
        >
          {action.priority.toUpperCase()} priority
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)]">
          · extracted gpt-5.4-mini · confidence 0.91
        </span>
      </div>
      <h1 className="font-serif text-[28px] font-medium tracking-[-0.01em] mt-0 mb-1.5 leading-[1.2]">
        {action.subject}
      </h1>
      <div className="text-[13px] text-[var(--ink-3)] mb-[22px]">
        from <b>{action.from}</b> · {action.email} · {action.received}
      </div>

      {action.actions.length > 0 && (
        <Card padded className="mb-[22px]">
          <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] mb-2.5">
            Extracted action
          </div>
          {action.actions.map((a, i) => (
            <div key={i}>
              <div className="font-serif text-[20px] leading-[1.25] mb-2.5">{a.title}</div>
              <div className="flex flex-wrap gap-2 mb-3.5">
                <Badge>Owner · you</Badge>
                <Badge>
                  <IconCalendar size={10} /> due {a.due}
                </Badge>
                <Badge>{a.type}</Badge>
                <Badge>confidence {Math.round(a.confidence * 100)}%</Badge>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="accent"
                  leading={<IconWand size={12} />}
                  onClick={onDraft}
                >
                  Draft reply
                </Button>
                <Button size="sm" leading={<IconCheck size={12} />}>
                  Send to Todoist
                </Button>
                <Button size="sm" variant="ghost" leading={<IconClose size={12} />}>
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card padded>
        <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] mb-2.5">
          Snippet · local only · body never stored
        </div>
        <div className="font-serif text-[16px] text-[var(--ink-2)] italic leading-[1.6] max-w-[680px]">
          &ldquo;{action.snippet}&rdquo;
        </div>
      </Card>

      {action.hasDraft && (
        <div className="mt-[18px] p-4 bg-[var(--accent-wash)] rounded-[12px] text-[13px]">
          <b>Draft is ready</b> in your Gmail Drafts folder. Compass never sends — you do.
        </div>
      )}
    </>
  );
}

function DraftModal({ onClose }: { onClose: () => void }) {
  const [body, setBody] = useState('');
  const [phase, setPhase] = useState<'streaming' | 'done'>('streaming');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for await (const chunk of stubs.draftReply({ id: 'a1' })) {
        if (cancelled) return;
        setBody(chunk);
      }
      if (!cancelled) setPhase('done');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Modal open onClose={onClose} wide aria-label="Draft reply">
      <ModalHeader title="Draft reply" onClose={onClose} meta="gmail.draft · claude-sonnet-4-6" />
      <ModalBody>
        <div className="font-serif text-[15.5px] text-[var(--ink-2)] leading-[1.65] whitespace-pre-wrap min-h-[220px]">
          {body}
          {phase === 'streaming' && (
            <span
              className="inline-block w-[7px] h-[15px] bg-[var(--accent)] align-middle ml-0.5"
              style={{ animation: 'blink 1s steps(1) infinite' }}
            />
          )}
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <Button size="sm" variant="ghost">
            Regenerate shorter
          </Button>
          <Button size="sm" onClick={onClose}>
            Discard
          </Button>
          <Button size="sm" variant="accent" onClick={onClose} disabled={phase !== 'done'}>
            Save as Gmail draft
          </Button>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] text-center mt-3.5">
          saved locally · never sent automatically
        </div>
      </ModalBody>
    </Modal>
  );
}

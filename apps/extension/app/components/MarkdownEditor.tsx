import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';

export interface MarkdownEditorProps {
  value: string;
  onChange: (next: string) => void;
  debounceMs?: number;
  ariaLabel?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  debounceMs = 5000,
  ariaLabel = 'Note body',
}: MarkdownEditorProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  const debounceRef = useRef(debounceMs);
  useEffect(() => {
    onChangeRef.current = onChange;
    debounceRef.current = debounceMs;
  }, [onChange, debounceMs]);

  useEffect(() => {
    if (!ref.current) return;
    const updateListener = EditorView.updateListener.of((u) => {
      if (!u.docChanged) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      const next = u.state.doc.toString();
      timerRef.current = setTimeout(() => onChangeRef.current(next), debounceRef.current);
    });
    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown(),
        oneDark,
        updateListener,
        EditorView.theme({
          '&': { backgroundColor: 'transparent', height: '100%' },
          '.cm-content': { fontFamily: 'var(--font-mono)', fontSize: '13px' },
        }),
      ],
    });
    const view = new EditorView({ state, parent: ref.current });
    viewRef.current = view;
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- editor is built once and external value handled below
  }, []);

  // External value change (e.g., switching notes) — replace doc atomically.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (view.state.doc.toString() === value) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
  }, [value]);

  return <div ref={ref} aria-label={ariaLabel} style={{ minHeight: 320, width: '100%' }} />;
}

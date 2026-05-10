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
  // When set, the next docChanged came from a programmatic value-prop swap
  // (e.g., user switched to a different note). Skip scheduling a save in
  // that case — the new content belongs to the new note, not to the user.
  const applyingExternalValueRef = useRef(false);
  useEffect(() => {
    onChangeRef.current = onChange;
    debounceRef.current = debounceMs;
  }, [onChange, debounceMs]);

  useEffect(() => {
    if (!ref.current) return;
    const updateListener = EditorView.updateListener.of((u) => {
      if (!u.docChanged) return;
      if (applyingExternalValueRef.current) return;
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
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        // Flush the latest doc through onChange before unmount so unsaved
        // edits aren't dropped when the user navigates away mid-debounce.
        onChangeRef.current(view.state.doc.toString());
      }
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- editor is built once and external value handled below
  }, []);

  // External value change (e.g., switching notes) — flush any pending save
  // for the OLD doc first, then replace the doc atomically without scheduling
  // a save for the synthetic change (the new value belongs to the new note).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      onChangeRef.current(current);
    }
    applyingExternalValueRef.current = true;
    try {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    } finally {
      applyingExternalValueRef.current = false;
    }
  }, [value]);

  return <div ref={ref} aria-label={ariaLabel} style={{ minHeight: 320, width: '100%' }} />;
}

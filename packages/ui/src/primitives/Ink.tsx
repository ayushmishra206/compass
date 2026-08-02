import { createElement, forwardRef, type CSSProperties, type ReactNode, type Ref } from 'react';
import { cn } from '../utils/cn.js';
import { toneColor, type TextTone } from './Text.js';

type InlineTag = 'span' | 'em' | 'strong' | 'b' | 'i';

export interface InkProps {
  /** Ink-ladder tone. The only thing this primitive sets. */
  tone: TextTone;
  as?: InlineTag;
  /** `em`/`i` render upright by default; opt back into the slant explicitly. */
  italic?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const SLANTED_BY_DEFAULT: ReadonlySet<InlineTag> = new Set<InlineTag>(['em', 'i']);

/**
 * Inline colour-only text. Use inside a `<Text>` / `<OverlayText>` run when a
 * span needs a different ink tone but must inherit the surrounding typography —
 * `<Text>` would re-impose a variant's font stack and size.
 */
export const Ink = forwardRef(function Ink(
  { tone, as = 'span', italic, className, style, children, ...rest }: InkProps,
  ref: Ref<HTMLElement>,
) {
  const merged: CSSProperties = {
    color: toneColor[tone],
    ...(SLANTED_BY_DEFAULT.has(as) ? { fontStyle: italic ? 'italic' : 'normal' } : null),
    ...(italic ? { fontStyle: 'italic' } : null),
    ...style,
  };
  return createElement(
    as,
    {
      ref,
      className: cn('compass-ink', className),
      'data-tone': tone,
      style: merged,
      ...rest,
    },
    children,
  );
});

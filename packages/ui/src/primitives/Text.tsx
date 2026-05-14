import { createElement, forwardRef, type CSSProperties, type ReactNode, type Ref } from 'react';
import { cn } from '../utils/cn.js';

export type TextVariant = 'display' | 'title' | 'heading' | 'serif-body' | 'body' | 'mono';
export type TextTone = 'primary' | 'secondary' | 'muted' | 'dim' | 'accent';

const variantStyle: Record<TextVariant, CSSProperties> = {
  display: {
    fontFamily: 'var(--font-serif)',
    fontSize: 'clamp(48px, 7.2vw, 108px)',
    lineHeight: 0.95,
    letterSpacing: '-0.04em',
    fontWeight: 300,
    fontStyle: 'italic',
    margin: 0,
  },
  title: {
    fontFamily: 'var(--font-serif)',
    fontSize: 22,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
    fontWeight: 500,
    margin: 0,
  },
  heading: {
    fontFamily: 'var(--font-serif)',
    fontSize: 17,
    lineHeight: 1.4,
    letterSpacing: '-0.01em',
    fontWeight: 500,
    margin: 0,
  },
  'serif-body': {
    fontFamily: 'var(--font-serif)',
    fontSize: 13.5,
    lineHeight: 1.6,
    margin: 0,
  },
  body: {
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    lineHeight: 1.5,
    margin: 0,
  },
  mono: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontWeight: 500,
    margin: 0,
  },
};

const toneColor: Record<TextTone, string> = {
  primary: 'var(--color-ink)',
  secondary: 'var(--color-ink-2)',
  muted: 'var(--color-ink-3)',
  dim: 'var(--color-ink-4)',
  accent: 'var(--accent-soft)',
};

type AsTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div' | 'label' | 'em';

const defaultTagForVariant: Record<TextVariant, AsTag> = {
  display: 'h1',
  title: 'h2',
  heading: 'h3',
  'serif-body': 'p',
  body: 'p',
  mono: 'span',
};

const defaultToneForVariant: Record<TextVariant, TextTone> = {
  display: 'primary',
  title: 'primary',
  heading: 'primary',
  'serif-body': 'secondary',
  body: 'primary',
  mono: 'muted',
};

export interface TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  as?: AsTag;
  italic?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export const Text = forwardRef(function Text(
  { variant = 'body', tone, as, italic, className, style, children, ...rest }: TextProps,
  ref: Ref<HTMLElement>,
) {
  const Tag = as ?? defaultTagForVariant[variant];
  const resolvedTone = tone ?? defaultToneForVariant[variant];
  const merged: CSSProperties = {
    ...variantStyle[variant],
    color: toneColor[resolvedTone],
    ...(italic ? { fontStyle: 'italic' } : null),
    ...style,
  };
  return createElement(
    Tag,
    {
      ref,
      className: cn('compass-text', className),
      'data-variant': variant,
      'data-tone': resolvedTone,
      style: merged,
      ...rest,
    },
    children,
  );
});

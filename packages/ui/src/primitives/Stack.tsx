import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../utils/cn.js';

export type SpaceToken = 1 | 2 | 3 | 4 | 5 | 6;
export type Align = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type Justify = 'start' | 'center' | 'end' | 'between' | 'around';

const gapVar: Record<SpaceToken, string> = {
  1: 'var(--space-1)',
  2: 'var(--space-2)',
  3: 'var(--space-3)',
  4: 'var(--space-4)',
  5: 'var(--space-5)',
  6: 'var(--space-6)',
};

const alignValue: Record<Align, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
};

const justifyValue: Record<Justify, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
};

interface LayoutProps extends HTMLAttributes<HTMLDivElement> {
  gap?: SpaceToken;
  align?: Align;
  justify?: Justify;
  children?: ReactNode;
}

function build(direction: 'column' | 'row') {
  return forwardRef<HTMLDivElement, LayoutProps>(function Layout(
    { gap = 2, align, justify, className, style, children, ...rest },
    ref,
  ) {
    const merged: CSSProperties = {
      display: 'flex',
      flexDirection: direction,
      gap: gapVar[gap],
      alignItems: align ? alignValue[align] : undefined,
      justifyContent: justify ? justifyValue[justify] : undefined,
      ...style,
    };
    return (
      <div
        ref={ref}
        className={cn(direction === 'column' ? 'compass-stack' : 'compass-row', className)}
        style={merged}
        {...rest}
      >
        {children}
      </div>
    );
  });
}

export const Stack = build('column');
export const Row = build('row');
export type StackProps = LayoutProps;
export type RowProps = LayoutProps;

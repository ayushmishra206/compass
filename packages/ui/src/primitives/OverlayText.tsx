import { forwardRef, type Ref } from 'react';
import { Text, type TextProps } from './Text.js';

export type OverlayTextProps = TextProps;

export const OverlayText = forwardRef(function OverlayText(
  { style, ...rest }: OverlayTextProps,
  ref: Ref<HTMLElement>,
) {
  return (
    <Text ref={ref} {...rest} style={{ textShadow: 'var(--shadow-overlay-text)', ...style }} />
  );
});

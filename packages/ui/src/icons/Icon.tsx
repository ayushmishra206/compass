import { forwardRef, type SVGProps, type ReactNode } from 'react';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  /** Pixel size for both width and height. Defaults to 16. */
  size?: number;
  /** Stroke width. Defaults to 1.6 (matches the prototype's feather-style weight). */
  stroke?: number;
}

/**
 * Base `<svg>` wrapper shared by every named icon. Renders at `size`×`size`,
 * uses `currentColor` so consumers control tone via `className` or CSS.
 */
export const Icon = forwardRef<SVGSVGElement, IconProps & { children: ReactNode }>(function Icon(
  { size = 16, stroke = 1.6, children, className, ...rest },
  ref,
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
    >
      {children}
    </svg>
  );
});

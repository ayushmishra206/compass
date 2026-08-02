import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { OverlayText } from './OverlayText.js';

describe('OverlayText', () => {
  it('applies the canonical text-shadow recipe', () => {
    render(<OverlayText variant="display">hi</OverlayText>);
    expect(screen.getByText('hi')).toHaveStyle({
      textShadow: 'var(--shadow-overlay-text)',
    });
  });

  it('inherits Text variant + tone attributes', () => {
    render(
      <OverlayText variant="mono" tone="accent">
        meta
      </OverlayText>,
    );
    const el = screen.getByText('meta');
    expect(el).toHaveAttribute('data-variant', 'mono');
    expect(el).toHaveAttribute('data-tone', 'accent');
  });

  it('lets caller append additional style without dropping the shadow', () => {
    render(
      <OverlayText style={{ marginTop: 4 }} variant="body">
        ok
      </OverlayText>,
    );
    const el = screen.getByText('ok');
    expect(el).toHaveStyle({ marginTop: '4px' });
    expect(el).toHaveStyle({ textShadow: 'var(--shadow-overlay-text)' });
  });

  it('is a11y clean', async () => {
    const { container } = render(<OverlayText variant="display">Hello</OverlayText>);
    expect(await axe(container)).toHaveNoViolations();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { Textarea } from './Textarea.js';

describe('Textarea', () => {
  it('renders with placeholder', () => {
    render(<Textarea placeholder="reason" aria-label="r" />);
    expect(screen.getByPlaceholderText('reason')).toBeInTheDocument();
  });

  it('is a11y clean with aria-label', async () => {
    const { container } = render(<Textarea aria-label="reason" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

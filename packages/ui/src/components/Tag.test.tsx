import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { Tag } from './Tag.js';

describe('Tag', () => {
  it('renders children', () => {
    render(<Tag>compass</Tag>);
    expect(screen.getByText('compass')).toBeInTheDocument();
  });

  it('is a11y clean', async () => {
    const { container } = render(<Tag>x</Tag>);
    expect(await axe(container)).toHaveNoViolations();
  });
});

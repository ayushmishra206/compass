import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { Prose } from './Prose.js';

describe('Prose', () => {
  it('renders children as serif body', () => {
    render(
      <Prose>
        <p>hello</p>
      </Prose>,
    );
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('is a11y clean', async () => {
    const { container } = render(
      <Prose>
        <p>x</p>
      </Prose>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

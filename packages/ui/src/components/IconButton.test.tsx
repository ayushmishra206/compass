import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import { IconButton } from './IconButton.js';
import { IconSearch } from '../icons/index.js';

describe('IconButton', () => {
  it('renders an icon child with aria-label', () => {
    render(
      <IconButton aria-label="search">
        <IconSearch size={14} />
      </IconButton>,
    );
    expect(screen.getByRole('button', { name: 'search' })).toBeInTheDocument();
  });

  it('fires onClick', () => {
    const cb = vi.fn();
    render(
      <IconButton aria-label="go" onClick={cb}>
        <IconSearch size={14} />
      </IconButton>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(cb).toHaveBeenCalled();
  });

  it('is a11y clean when aria-label is provided', async () => {
    const { container } = render(
      <IconButton aria-label="search">
        <IconSearch size={14} />
      </IconButton>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

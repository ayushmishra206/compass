import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import { Input } from './Input.js';

describe('Input', () => {
  it('renders with placeholder', () => {
    render(<Input placeholder="sk-proj-…" aria-label="key" />);
    expect(screen.getByPlaceholderText('sk-proj-…')).toBeInTheDocument();
  });

  it('fires onChange', () => {
    const onChange = vi.fn();
    render(<Input aria-label="q" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'abc' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('mono variant applies font-mono', () => {
    render(<Input aria-label="k" mono />);
    expect(screen.getByRole('textbox')).toHaveClass('font-mono');
  });

  it('is a11y clean with aria-label', async () => {
    const { container } = render(<Input aria-label="search" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

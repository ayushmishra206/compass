import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { NewTab } from './index.js';

describe('NewTab surface', () => {
  it('renders morning brief + greeting', () => {
    render(<NewTab />);
    expect(screen.getByText(/Good morning/)).toBeInTheDocument();
    expect(screen.getByText(/Morning brief/)).toBeInTheDocument();
    expect(screen.getByText(/Ship PRD v1.0/)).toBeInTheDocument();
  });

  it('renders widget titles', () => {
    render(<NewTab />);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Inbox actions')).toBeInTheDocument();
    expect(screen.getByText('Active goals')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Focus blocker')).toBeInTheDocument();
  });

  it('is a11y clean', async () => {
    const { container } = render(<NewTab />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

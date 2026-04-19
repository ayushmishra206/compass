import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { Notes } from './notes/index.js';
import { Focus } from './focus/index.js';
import { Goals } from './goals/index.js';
import { Inbox } from './inbox/index.js';
import { Blocker } from './blocker/index.js';
import { Settings } from './settings/index.js';
import { Onboarding } from './onboarding/index.js';

describe('surfaces smoke-render', () => {
  it('Notes renders title + detail prose', () => {
    render(<Notes />);
    expect(screen.getAllByText(/Compass AI — architecture decisions/i).length).toBeGreaterThan(0);
  });

  it('Focus renders hero copy + duration picker', () => {
    render(<Focus />);
    expect(screen.getByText(/What are you moving today/)).toBeInTheDocument();
    expect(screen.getByLabelText('Daily focus')).toBeInTheDocument();
  });

  it('Goals renders with first goal selected', () => {
    render(<Goals />);
    expect(screen.getByRole('heading', { name: /Launch Compass AI upgrade/i })).toBeInTheDocument();
  });

  it('Inbox renders actions list', () => {
    render(<Inbox />);
    expect(screen.getByText(/Actions/)).toBeInTheDocument();
    expect(screen.getAllByText(/pricing/i).length).toBeGreaterThan(0);
  });

  it('Blocker renders rules', () => {
    render(<Blocker />);
    expect(screen.getByText(/Soft blocks, honest conversations/)).toBeInTheDocument();
    expect(screen.getByText('reddit.com')).toBeInTheDocument();
  });

  it('Settings renders provider section', () => {
    render(<Settings />);
    expect(screen.getByText(/AI providers & budget/)).toBeInTheDocument();
    expect(screen.getByText(/OpenAI Platform/)).toBeInTheDocument();
  });

  it('Onboarding renders step 1', () => {
    render(<Onboarding onClose={() => {}} />);
    expect(screen.getByText(/Welcome to Compass AI/)).toBeInTheDocument();
  });

  it('surfaces pass axe (sampled)', async () => {
    const { container } = render(<Settings />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

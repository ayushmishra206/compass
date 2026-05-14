import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { Row, Stack } from './Stack.js';

describe('Stack / Row layout primitives', () => {
  it('Stack uses column flow with gap token', () => {
    const { container } = render(<Stack gap={3}>x</Stack>);
    const el = container.querySelector('.compass-stack') as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.style.flexDirection).toBe('column');
    expect(el.style.gap).toBe('var(--space-3)');
  });

  it('Row uses row flow with gap token', () => {
    const { container } = render(<Row gap={5}>x</Row>);
    const el = container.querySelector('.compass-row') as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.style.flexDirection).toBe('row');
    expect(el.style.gap).toBe('var(--space-5)');
  });

  it('honours align and justify', () => {
    const { container } = render(
      <Row align="center" justify="between">
        x
      </Row>,
    );
    const el = container.querySelector('.compass-row') as HTMLElement;
    expect(el.style.alignItems).toBe('center');
    expect(el.style.justifyContent).toBe('space-between');
  });

  it('is a11y clean', async () => {
    const { container } = render(
      <Stack>
        <span>a</span>
        <span>b</span>
      </Stack>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

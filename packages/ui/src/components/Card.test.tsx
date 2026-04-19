import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { Card, CardHeader, CardBody } from './Card.js';

describe('Card', () => {
  it('renders children', () => {
    render(<Card data-testid="c">hi</Card>);
    expect(screen.getByTestId('c')).toHaveTextContent('hi');
  });

  it('applies padded variant', () => {
    render(
      <Card padded data-testid="c">
        x
      </Card>,
    );
    expect(screen.getByTestId('c')).toHaveClass('p-[22px]');
  });

  it('CardHeader + CardBody compose', async () => {
    const { container } = render(
      <Card>
        <CardHeader>title</CardHeader>
        <CardBody>body</CardBody>
      </Card>,
    );
    expect(screen.getByText('title')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Stage } from './Stage.js';

describe('Stage', () => {
  it('renders an image div with the provided url as background', () => {
    const { container } = render(<Stage imageUrl="blob:fake" />);
    const img = container.querySelector('.stage-img') as HTMLElement;
    expect(img).toBeTruthy();
    expect(img.style.backgroundImage).toBe('url("blob:fake")');
  });

  it('renders veil + grain layers on top of the image', () => {
    const { container } = render(<Stage imageUrl="blob:fake" />);
    expect(container.querySelector('.stage-veil')).toBeTruthy();
    expect(container.querySelector('.stage-grain')).toBeTruthy();
  });

  it('omits the image div when imageUrl is null', () => {
    const { container } = render(<Stage imageUrl={null} />);
    expect(container.querySelector('.stage-img')).toBeFalsy();
    expect(container.querySelector('.stage-veil')).toBeTruthy();
    expect(container.querySelector('.stage-grain')).toBeTruthy();
  });
});

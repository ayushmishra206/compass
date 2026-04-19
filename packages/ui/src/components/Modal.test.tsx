import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import { Modal, ModalHeader, ModalBody } from './Modal.js';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}} aria-label="x">
        <div>hi</div>
      </Modal>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders children when open', () => {
    render(
      <Modal open onClose={() => {}} aria-label="test">
        <div>hello</div>
      </Modal>,
    );
    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'test' })).toBeInTheDocument();
  });

  it('closes on backdrop click', () => {
    const cb = vi.fn();
    render(
      <Modal open onClose={cb} aria-label="x">
        <div>c</div>
      </Modal>,
    );
    fireEvent.click(screen.getByRole('presentation'));
    expect(cb).toHaveBeenCalled();
  });

  it('does not close on panel click', () => {
    const cb = vi.fn();
    render(
      <Modal open onClose={cb} aria-label="x">
        <div>c</div>
      </Modal>,
    );
    fireEvent.click(screen.getByRole('dialog'));
    expect(cb).not.toHaveBeenCalled();
  });

  it('closes on Escape', () => {
    const cb = vi.fn();
    render(
      <Modal open onClose={cb} aria-label="x">
        <button>btn</button>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(cb).toHaveBeenCalled();
  });

  it('wide variant widens panel', () => {
    render(
      <Modal open onClose={() => {}} wide aria-label="w">
        <div>c</div>
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toHaveClass('w-[min(860px,94vw)]');
  });

  it('is a11y clean with header + body', async () => {
    const { container } = render(
      <Modal open onClose={() => {}} aria-label="a">
        <ModalHeader title="T" onClose={() => {}} />
        <ModalBody>x</ModalBody>
      </Modal>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

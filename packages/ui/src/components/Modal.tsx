import { type ReactNode, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils/cn.js';
import { useFocusTrap } from '../hooks/useFocusTrap.js';
import { useEscape } from '../hooks/useEscape.js';
import { IconClose } from '../icons/index.js';
import { IconButton } from './IconButton.js';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Wider max-width (CmdK, decompose, draft modals). */
  wide?: boolean;
  children: ReactNode;
  /** Ignore backdrop clicks. Defaults to false. */
  dismissOnBackdrop?: boolean;
  className?: string;
  'aria-label': string;
}

/**
 * Portal-rendered dialog with backdrop blur, focus trap, and Esc dismissal.
 * The spec for these behaviors is in the Phase 0 design-system doc.
 */
export function Modal({
  open,
  onClose,
  wide,
  children,
  dismissOnBackdrop = true,
  className,
  ...aria
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);
  useEscape(onClose, open);

  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-[oklch(0.10_0.01_55_/_0.42)] backdrop-blur-[6px]"
      style={{ animation: 'fadeIn 180ms ease' }}
      onClick={dismissOnBackdrop ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        {...aria}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'bg-[var(--panel)] border border-[var(--hair)] rounded-[18px] shadow-[var(--sh-3)] overflow-hidden',
          wide ? 'w-[min(860px,94vw)]' : 'w-[min(560px,94vw)]',
          className,
        )}
        style={{ animation: 'slideUp 220ms ease' }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ModalHeader({
  title,
  onClose,
  meta,
}: {
  title: string;
  onClose: () => void;
  meta?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 px-[22px] py-[18px] border-b border-[var(--hair)]">
      <div className="font-serif text-[18px] font-medium">{title}</div>
      {meta && <div className="font-mono text-[10px] text-[var(--ink-4)] ml-2">{meta}</div>}
      <IconButton aria-label="Close modal" className="ml-auto" onClick={onClose}>
        <IconClose size={14} />
      </IconButton>
    </div>
  );
}

export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-[22px]', className)}>{children}</div>;
}

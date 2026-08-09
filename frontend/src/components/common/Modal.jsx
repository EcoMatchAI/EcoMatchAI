import { useEffect, useRef } from 'react';

/**
 * Shared dialog shell.
 *
 * Every modal in the app previously hand-rolled the same overlay markup, and
 * none of them could be dismissed with Escape or by clicking the backdrop —
 * a keyboard user who opened one had no way out. Centralising it also keeps the
 * radius, shadow and backdrop identical everywhere.
 *
 * Props:
 *   onClose   required — called on Escape, backdrop click, or the close button
 *   ariaLabel accessible name for the dialog
 *   size      Tailwind max-width class for the panel
 */
export const Modal = ({ onClose, ariaLabel, size = 'max-w-lg', children }) => {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    // Stop the page behind the dialog from scrolling under it.
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    // Move focus into the dialog so the next Tab lands inside it.
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      // Hand focus back to whatever opened the dialog.
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus();
      }
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={`bg-white rounded-3xl border border-slate-100 shadow-2xl w-full ${size} overflow-hidden flex flex-col max-h-[90vh] outline-none`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;

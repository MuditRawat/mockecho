import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  overlayId?: string;
  contentId?: string;
  cancelBtnId?: string;
  confirmBtnId?: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  overlayId = "delete-confirm-overlay",
  contentId = "delete-confirm-content",
  cancelBtnId = "delete-cancel-btn",
  confirmBtnId = "delete-confirm-btn"
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          id={overlayId}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onCancel();
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-interview-modal-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="bg-card-warm border border-border-warm rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative my-auto"
            id={contentId}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-3">
              <h3 id="delete-interview-modal-title" className="text-xl font-bold text-text-charcoal font-serif-editorial italic">
                Delete Interview?
              </h3>
              <div className="text-sm text-text-soft space-y-3 leading-relaxed">
                <p>This will permanently remove:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-text-soft">
                  <li>Interview report</li>
                  <li>Evaluation score</li>
                  <li>Practice history</li>
                  <li>Dashboard statistics derived from this interview</li>
                </ul>
                <p className="font-semibold text-accent-clay">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3 bg-bg-warm border border-border-warm hover:bg-border-warm/30 text-text-charcoal text-sm font-semibold rounded-xl transition cursor-pointer active:scale-95"
                id={cancelBtnId}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 py-3 bg-accent-clay hover:bg-accent-clay/90 text-white text-sm font-semibold rounded-xl transition cursor-pointer active:scale-95"
                id={confirmBtnId}
              >
                Delete Interview
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

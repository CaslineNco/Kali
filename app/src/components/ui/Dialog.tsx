import { AnimatePresence, motion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';

/** 通用浮层：半透明遮罩 + 居中卡片，Esc / 点遮罩关闭。 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  width = 380,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="dlg-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="dlg"
            style={{ width }}
            role="dialog"
            aria-modal
            aria-label={title}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={{ type: 'spring', stiffness: 520, damping: 36, mass: 0.7 }}
          >
            <h2 className="dlg-title">{title}</h2>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** 专注 / 娱乐 二选一 */
export function KindToggle({ value, onChange }: { value: 'focus' | 'fun'; onChange: (k: 'focus' | 'fun') => void }) {
  return (
    <div className="seg" role="radiogroup">
      {(['focus', 'fun'] as const).map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          className="seg-item"
          data-kind={k}
          data-on={value === k}
          onClick={() => onChange(k)}
        >
          {k === 'focus' ? 'Focus' : 'Leisure'}
        </button>
      ))}
    </div>
  );
}

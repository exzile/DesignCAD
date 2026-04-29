import { useEffect, useRef } from 'react';
import './ContextMenu.css';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  separator?: boolean;
  disabled?: boolean;
}

export function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Clamp inside viewport.
  const clampedX = Math.min(x, window.innerWidth - 220);
  const clampedY = Math.min(y, window.innerHeight - items.length * 28 - 8);

  return (
    <div
      ref={ref}
      className="slicer-context-menu"
      style={{ left: clampedX, top: clampedY }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={i} className="slicer-context-menu__separator" />;
        }
        return (
          <button
            key={i}
            type="button"
            className={`slicer-context-menu__item${item.danger ? ' is-danger' : ''}${item.disabled ? ' is-disabled' : ''}`}
            onClick={() => {
              if (item.disabled) return;
              item.onClick();
              onClose();
            }}
            disabled={item.disabled}
          >
            {item.icon && <span className="slicer-context-menu__icon">{item.icon}</span>}
            <span className="slicer-context-menu__label">{item.label}</span>
            {item.shortcut && (
              <span className="slicer-context-menu__shortcut">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

import { Lock, Unlock, X } from 'lucide-react';
import type { PlateObject } from '../../../../../types/slicer';
import type { ObjectUpdate } from './types';

export function ObjectPanelHeader({
  obj,
  locked,
  onUpdate,
  onClose,
}: {
  obj: PlateObject;
  locked: boolean;
  onUpdate: ObjectUpdate;
  onClose?: () => void;
}) {
  return (
    <div className="slicer-overlay-header">
      <div className="slicer-overlay-header-name">
        {obj.name}
      </div>
      <button
        title={locked ? 'Unlock model' : 'Lock model'}
        onClick={() => onUpdate({ locked: !locked })}
        className={`slicer-overlay-lock-button ${locked ? 'is-locked' : ''}`}
      >
        {locked ? <Lock size={13} /> : <Unlock size={13} />}
      </button>
      {onClose && (
        <button
          title="Close panel"
          onClick={onClose}
          className="slicer-overlay-close-button"
          aria-label="Close panel"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

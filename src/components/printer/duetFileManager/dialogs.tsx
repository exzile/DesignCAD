import { useState } from 'react';

interface RenameDialogProps {
  currentName: string;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
}

export function RenameDialog({ currentName, onConfirm, onCancel }: RenameDialogProps) {
  const [value, setValue] = useState(currentName);
  return (
    <div className="duet-file-mgr__dialog-overlay" onClick={onCancel}>
      <div className="duet-file-mgr__dialog" onClick={(e) => e.stopPropagation()}>
        <div className="duet-file-mgr__dialog-title">Rename</div>
        <input
          className="duet-file-mgr__dialog-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) onConfirm(value.trim());
            if (e.key === 'Escape') onCancel();
          }}
          autoFocus
        />
        <div className="duet-file-mgr__dialog-btns">
          <button className="duet-file-mgr__dialog-btn" onClick={onCancel}>Cancel</button>
          <button className="duet-file-mgr__dialog-btn--primary" onClick={() => value.trim() && onConfirm(value.trim())}>
            Rename
          </button>
        </div>
      </div>
    </div>
  );
}

interface NewFolderDialogProps {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function NewFolderDialog({ onConfirm, onCancel }: NewFolderDialogProps) {
  const [value, setValue] = useState('');
  return (
    <div className="duet-file-mgr__dialog-overlay" onClick={onCancel}>
      <div className="duet-file-mgr__dialog" onClick={(e) => e.stopPropagation()}>
        <div className="duet-file-mgr__dialog-title">New Folder</div>
        <input
          className="duet-file-mgr__dialog-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Folder name"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) onConfirm(value.trim());
            if (e.key === 'Escape') onCancel();
          }}
          autoFocus
        />
        <div className="duet-file-mgr__dialog-btns">
          <button className="duet-file-mgr__dialog-btn" onClick={onCancel}>Cancel</button>
          <button className="duet-file-mgr__dialog-btn--primary" onClick={() => value.trim() && onConfirm(value.trim())}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

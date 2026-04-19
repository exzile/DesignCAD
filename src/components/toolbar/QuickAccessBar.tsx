import { useState, useRef, useEffect } from 'react';
import {
  Save, FolderOpen, Undo2, Redo2, FileUp, Download,
  Moon, Sun, Bell, HelpCircle, Printer, Settings, User,
  FilePlus, ChevronRight,
} from 'lucide-react';
import { useCADStore } from '../../store/cadStore';
import { useComponentStore } from '../../store/componentStore';
import { usePrinterStore } from '../../store/printerStore';
import { useThemeStore } from '../../store/themeStore';

import type { RefObject, ChangeEvent } from 'react';

interface QuickAccessBarProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  loadFileInputRef: RefObject<HTMLInputElement | null>;
  onImport: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function QuickAccessBar({ fileInputRef, loadFileInputRef, onImport }: QuickAccessBarProps) {
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const theme = useThemeStore((s) => s.theme);

  const setStatusMessage = useCADStore((s) => s.setStatusMessage);
  const undoStackLength = useCADStore((s) => s.undoStack.length);
  const redoStackLength = useCADStore((s) => s.redoStack.length);
  const undoAction = useCADStore((s) => s.undo);
  const redoAction = useCADStore((s) => s.redo);
  const saveToFile = useCADStore((s) => s.saveToFile);
  const loadFromFile = useCADStore((s) => s.loadFromFile);
  const setShowExportDialog = useCADStore((s) => s.setShowExportDialog);
  const cadNewDocument = useCADStore((s) => s.newDocument);
  const featureCount = useCADStore((s) => s.features.length);
  const sketchCount = useCADStore((s) => s.sketches.length);
  const componentNewDocument = useComponentStore((s) => s.newDocument);

  const showPrinter = usePrinterStore((s) => s.showPrinter);
  const setShowPrinter = usePrinterStore((s) => s.setShowPrinter);
  const setActiveTab = usePrinterStore((s) => s.setActiveTab);
  const printerConnected = usePrinterStore((s) => s.connected);

  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [newFileConfirm, setNewFileConfirm] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  // Close the file menu when clicking outside
  useEffect(() => {
    if (!fileMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setFileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [fileMenuOpen]);

  const closeMenu = () => setFileMenuOpen(false);

  const hasContent = featureCount > 0 || sketchCount > 0;

  const doNewDocument = () => {
    cadNewDocument();
    componentNewDocument();
    setNewFileConfirm(false);
  };

  const handleNew = () => {
    closeMenu();
    if (hasContent) {
      setNewFileConfirm(true);
    } else {
      doNewDocument();
    }
  };

  return (
    <div className="ribbon-quick-access">
      <div className="ribbon-quick-left">
        {/* ── File menu ── */}
        <div className="file-menu-root" ref={fileMenuRef}>
          <button
            className={`file-menu-btn${fileMenuOpen ? ' open' : ''}`}
            onClick={() => setFileMenuOpen((v) => !v)}
          >
            File
          </button>
          {fileMenuOpen && (
            <div className="file-menu-dropdown">
              <button className="file-menu-item" onClick={handleNew}>
                <FilePlus size={15} />
                <span>New</span>
                <span className="file-menu-shortcut">Ctrl+N</span>
              </button>
              <div className="file-menu-separator" />
              <button className="file-menu-item" onClick={() => { loadFileInputRef.current?.click(); closeMenu(); }}>
                <FolderOpen size={15} />
                <span>Open…</span>
                <span className="file-menu-shortcut">Ctrl+O</span>
              </button>
              <button className="file-menu-item" onClick={() => { saveToFile(); closeMenu(); }}>
                <Save size={15} />
                <span>Save</span>
                <span className="file-menu-shortcut">Ctrl+S</span>
              </button>
              <div className="file-menu-separator" />
              <button className="file-menu-item" onClick={() => { fileInputRef.current?.click(); closeMenu(); }}>
                <FileUp size={15} />
                <span>Import…</span>
              </button>
              <button className="file-menu-item" onClick={() => { setShowExportDialog(true); closeMenu(); }}>
                <Download size={15} />
                <span>Export…</span>
                <ChevronRight size={13} style={{ marginLeft: 'auto' }} />
              </button>
            </div>
          )}
        </div>

        <div className="ribbon-quick-divider" />

        <button
          className={`ribbon-quick-btn${undoStackLength === 0 ? ' ribbon-quick-btn-disabled' : ''}`}
          title="Undo (Ctrl+Z)"
          onClick={undoAction}
          disabled={undoStackLength === 0}
        >
          <Undo2 size={14} />
        </button>
        <button
          className={`ribbon-quick-btn${redoStackLength === 0 ? ' ribbon-quick-btn-disabled' : ''}`}
          title="Redo (Ctrl+Y)"
          onClick={redoAction}
          disabled={redoStackLength === 0}
        >
          <Redo2 size={14} />
        </button>

        <input ref={fileInputRef} type="file" accept=".step,.stp,.f3d,.stl,.obj" hidden onChange={onImport} />
        <input
          ref={loadFileInputRef}
          type="file"
          accept=".dzn,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
              const text = evt.target?.result as string;
              if (text) loadFromFile(text);
            };
            reader.readAsText(file);
            if (loadFileInputRef.current) loadFileInputRef.current.value = '';
          }}
        />
      </div>
      <div className="ribbon-quick-center">
        <span className="ribbon-title">Untitled - Dzign3D</span>
      </div>
      <div className="ribbon-quick-right">
        <button className="ribbon-quick-btn" title="Toggle theme" onClick={toggleTheme}>
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
        </button>
        <button className="ribbon-quick-btn" title="Notifications" onClick={() => setStatusMessage('Notifications')}>
          <Bell size={14} />
        </button>
        <button className="ribbon-quick-btn" title="Help" onClick={() => setStatusMessage('Help')}>
          <HelpCircle size={14} />
        </button>
        <button
          className={`ribbon-quick-btn ${printerConnected ? 'connected' : ''}`}
          title={printerConnected ? 'Printer Monitor' : 'Printer Setup'}
          onClick={() => printerConnected ? setShowPrinter(!showPrinter) : (setShowPrinter(true), setActiveTab('settings'))}
        >
          <Printer size={14} />
        </button>
        <button className="ribbon-quick-btn" title="Settings" onClick={() => setStatusMessage('Settings: coming soon')}>
          <Settings size={14} />
        </button>
        <div className="ribbon-quick-divider" />
        <button className="ribbon-quick-btn user-btn" title="Profile">
          <User size={14} />
        </button>
      </div>

      {/* ── New-document confirmation modal ── */}
      {newFileConfirm && (
        <div className="new-doc-overlay" onClick={() => setNewFileConfirm(false)}>
          <div className="new-doc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="new-doc-title">Start a new document?</div>
            <div className="new-doc-body">
              You have unsaved work. Would you like to save before starting a new document?
            </div>
            <div className="new-doc-actions">
              <button
                className="new-doc-btn new-doc-btn-save"
                onClick={() => { saveToFile(); doNewDocument(); }}
              >
                Save &amp; New
              </button>
              <button
                className="new-doc-btn new-doc-btn-discard"
                onClick={doNewDocument}
              >
                Discard &amp; New
              </button>
              <button
                className="new-doc-btn new-doc-btn-cancel"
                onClick={() => setNewFileConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

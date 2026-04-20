import { useState, useRef, useEffect } from 'react';
import {
  Save, FolderOpen, Undo2, Redo2, FileUp, Download,
  Moon, Sun, Bell, HelpCircle, Printer, Settings, User,
  FilePlus, FileX, ChevronRight,
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
  // File menu only makes sense in the design workspace — the slicer and
  // printer workspaces have their own file/job concepts.
  const workspaceMode = useCADStore((s) => s.workspaceMode);
  const showFileMenu = workspaceMode === 'design';

  const showPrinter = usePrinterStore((s) => s.showPrinter);
  const setShowPrinter = usePrinterStore((s) => s.setShowPrinter);
  const setActiveTab = usePrinterStore((s) => s.setActiveTab);
  const printerConnected = usePrinterStore((s) => s.connected);

  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  // null = modal hidden; 'new' / 'close' = modal showing with action-specific copy
  const [confirmMode, setConfirmMode] = useState<'new' | 'close' | null>(null);
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
    setConfirmMode(null);
  };

  const handleNew = () => {
    closeMenu();
    if (hasContent) setConfirmMode('new');
    else doNewDocument();
  };

  // Close = always prompts a save choice, even when the workspace already
  // looks empty — the user explicitly chose to "close the current file" and
  // should always get the save-or-discard modal. After the choice, the
  // workspace is reset to an empty "Untitled" document.
  const handleClose = () => {
    closeMenu();
    setConfirmMode('close');
  };

  return (
    <div className="ribbon-quick-access">
      <div className="ribbon-quick-left">
        {/* ── File menu (design workspace only) ── */}
        {showFileMenu && (
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
              <button className="file-menu-item" onClick={handleClose}>
                <FileX size={15} />
                <span>Close</span>
                <span className="file-menu-shortcut">Ctrl+W</span>
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
        )}

        {/* File menu + undo/redo are design-workspace concepts; the slicer
            and printer workspaces have their own action history that would
            be confused by a shared undo button. */}
        {showFileMenu && (
          <>
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
          </>
        )}

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

      {/* ── New / Close confirmation modal (shared flow with per-action copy) ── */}
      {confirmMode && (
        <div className="new-doc-overlay" onClick={() => setConfirmMode(null)}>
          <div className="new-doc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="new-doc-title">
              {confirmMode === 'new' ? 'Start a new document?' : 'Close the current file?'}
            </div>
            <div className="new-doc-body">
              {confirmMode === 'new'
                ? (hasContent
                  ? 'You have unsaved work. Would you like to save before starting a new document?'
                  : 'Start with a fresh workspace?')
                : (hasContent
                  ? 'Would you like to save before closing? Closing will reset the workspace.'
                  : 'This will reset the workspace to an empty document.')}
            </div>
            <div className="new-doc-actions">
              <button
                className="new-doc-btn new-doc-btn-save"
                onClick={() => { saveToFile(); doNewDocument(); }}
              >
                {confirmMode === 'new' ? 'Save & New' : 'Save & Close'}
              </button>
              <button
                className="new-doc-btn new-doc-btn-discard"
                onClick={doNewDocument}
              >
                {confirmMode === 'new' ? 'Discard & New' : 'Discard & Close'}
              </button>
              <button
                className="new-doc-btn new-doc-btn-cancel"
                onClick={() => setConfirmMode(null)}
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

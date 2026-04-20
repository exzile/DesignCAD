import { useState, useCallback, useMemo } from 'react';
import { FileText, Play, Folder, Plus, Trash2, X, Check, RefreshCcw, Search } from 'lucide-react';
import { usePrinterStore } from '../../../store/printerStore';
import {
  panelStyle,
  sectionTitleStyle as labelStyle,
} from '../../../utils/printerPanelStyles';

const DEFAULT_MACRO_BODY = '; New macro\n; G-code commands below\n';

export default function MacroPanel() {
  const macros        = usePrinterStore((s) => s.macros);
  const runMacro      = usePrinterStore((s) => s.runMacro);
  const createMacro   = usePrinterStore((s) => s.createMacro);
  const deleteMacro   = usePrinterStore((s) => s.deleteMacro);
  const refreshMacros = usePrinterStore((s) => s.refreshMacros);
  const connected     = usePrinterStore((s) => s.connected);

  const [query,      setQuery]      = useState('');
  const [creating,   setCreating]   = useState(false);
  const [newName,    setNewName]    = useState('');
  const [newBody,    setNewBody]    = useState(DEFAULT_MACRO_BODY);
  const [busy,       setBusy]       = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const files = useMemo(() => macros.filter((m) => m.type === 'f'), [macros]);
  const dirs  = useMemo(() => macros.filter((m) => m.type === 'd'), [macros]);

  const filteredFiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter((m) => m.name.toLowerCase().includes(q));
  }, [files, query]);

  const handleCreate = useCallback(async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await createMacro(trimmed, newBody);
      setCreating(false);
      setNewName('');
      setNewBody(DEFAULT_MACRO_BODY);
    } finally {
      setBusy(false);
    }
  }, [createMacro, newName, newBody]);

  const handleDelete = useCallback(async (name: string) => {
    setBusy(true);
    try {
      await deleteMacro(name);
      setConfirmDel(null);
    } finally {
      setBusy(false);
    }
  }, [deleteMacro]);

  const cancelCreate = useCallback(() => {
    setCreating(false);
    setNewName('');
    setNewBody(DEFAULT_MACRO_BODY);
  }, []);

  return (
    <div style={panelStyle()}>
      <div style={labelStyle()} className="mc-header">
        <div className="duet-dash-section-title-row">
          <FileText size={14} /> Macros
          <span className="mc-count">{files.length}</span>
        </div>
        <div className="mc-header-actions">
          <button
            className="mc-icon-btn"
            onClick={() => refreshMacros()}
            title="Refresh macro list"
            disabled={!connected || busy}
          >
            <RefreshCcw size={11} />
          </button>
          <button
            className={`mc-new-btn${creating ? ' is-active' : ''}`}
            onClick={() => setCreating((v) => !v)}
            title="New macro"
            disabled={!connected || busy}
          >
            <Plus size={11} /> New
          </button>
        </div>
      </div>

      {creating && (
        <div className="mc-create-form">
          <input
            type="text"
            className="mc-input"
            placeholder="macro-name.g"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <textarea
            className="mc-textarea"
            placeholder="; G-code commands"
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            rows={4}
            spellCheck={false}
          />
          <div className="mc-create-actions">
            <button
              className="mc-btn-action mc-btn-action--cancel"
              onClick={cancelCreate}
              disabled={busy}
            >
              <X size={11} /> Cancel
            </button>
            <button
              className="mc-btn-action mc-btn-action--save"
              onClick={handleCreate}
              disabled={busy || !newName.trim()}
            >
              <Check size={11} /> Save
            </button>
          </div>
        </div>
      )}

      {files.length > 3 && (
        <div className="mc-search-row">
          <Search size={11} />
          <input
            type="text"
            className="mc-input mc-input--search"
            placeholder="Filter macros..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {macros.length === 0 && !creating && (
        <div className="mc-empty">
          {connected ? 'No macros yet — click New to create one.' : 'Connect to a printer to view macros.'}
        </div>
      )}

      {dirs.length > 0 && (
        <div className="mc-grid">
          {dirs.map((dir) => (
            <div key={dir.name} className="mc-card mc-card--dir" title={`Folder: ${dir.name}`}>
              <Folder size={11} />
              <span className="mc-card-name">{dir.name}/</span>
            </div>
          ))}
        </div>
      )}

      {filteredFiles.length > 0 && (
        <div className="mc-grid">
          {filteredFiles.map((macro) => {
            const isConfirm = confirmDel === macro.name;
            return (
              <div key={macro.name} className={`mc-card${isConfirm ? ' is-confirming' : ''}`}>
                <button
                  className="mc-card-run"
                  onClick={() => runMacro(macro.name)}
                  title={`Run ${macro.name}`}
                  disabled={busy || isConfirm}
                >
                  <Play size={10} />
                  <span className="mc-card-name">{macro.name.replace(/\.g$/i, '')}</span>
                </button>
                {isConfirm ? (
                  <div className="mc-card-confirm">
                    <button
                      className="mc-icon-btn mc-icon-btn--danger"
                      onClick={() => handleDelete(macro.name)}
                      disabled={busy}
                      title="Confirm delete"
                    >
                      <Check size={11} />
                    </button>
                    <button
                      className="mc-icon-btn"
                      onClick={() => setConfirmDel(null)}
                      disabled={busy}
                      title="Cancel"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ) : (
                  <button
                    className="mc-icon-btn mc-card-delete"
                    onClick={() => setConfirmDel(macro.name)}
                    title="Delete macro"
                    disabled={busy}
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {query.trim() && filteredFiles.length === 0 && files.length > 0 && (
        <div className="mc-empty">No macros match "{query}"</div>
      )}
    </div>
  );
}

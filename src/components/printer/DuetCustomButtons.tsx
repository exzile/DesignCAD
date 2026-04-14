import React, { useState, useCallback } from 'react';
import { Zap, Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';
import { usePrinterStore } from '../../store/printerStore';
import { colors as COLORS } from '../../utils/theme';
import {
  getDuetPrefs, updateDuetPrefs, type CustomButton,
} from '../../utils/duetPrefs';

// ---------------------------------------------------------------------------
// Styles (match the other dashboard panels)
// ---------------------------------------------------------------------------
const panelStyle: React.CSSProperties = {
  background: COLORS.panel,
  border: `1px solid ${COLORS.panelBorder}`,
  borderRadius: 8,
  padding: 16,
};

const sectionTitle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 11,
  color: COLORS.textDim,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontWeight: 600,
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
  gap: 8,
};

const buttonStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  padding: '10px 8px',
  background: COLORS.surface,
  border: `1px solid ${COLORS.panelBorder}`,
  borderRadius: 6,
  cursor: 'pointer',
  color: COLORS.text,
  fontSize: 12,
  fontWeight: 600,
  minHeight: 58,
};

const iconBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 10px',
  borderRadius: 4,
  border: `1px solid ${COLORS.panelBorder}`,
  background: COLORS.surface,
  color: COLORS.text,
  cursor: 'pointer',
  fontSize: 11,
};

const inputStyle: React.CSSProperties = {
  background: COLORS.inputBg,
  border: `1px solid ${COLORS.inputBorder}`,
  borderRadius: 4,
  color: COLORS.text,
  padding: '6px 8px',
  fontSize: 12,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function DuetCustomButtons() {
  const connected = usePrinterStore((s) => s.connected);
  const sendGCode = usePrinterStore((s) => s.sendGCode);

  const [buttons, setButtons] = useState<CustomButton[]>(() => getDuetPrefs().customButtons);
  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState('');
  const [draftGcode, setDraftGcode] = useState('');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);

  const persist = useCallback((next: CustomButton[]) => {
    updateDuetPrefs({ customButtons: next });
    setButtons(next);
  }, []);

  const handleRun = useCallback(async (btn: CustomButton) => {
    if (!connected) return;
    setRunning(btn.id);
    try {
      // Support multi-line G-code by sending each non-empty line in order
      for (const line of btn.gcode.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
        await sendGCode(line);
      }
    } finally {
      setRunning(null);
    }
  }, [connected, sendGCode]);

  const handleStartEdit = useCallback((btn?: CustomButton) => {
    setDraftId(btn?.id ?? null);
    setDraftLabel(btn?.label ?? '');
    setDraftGcode(btn?.gcode ?? '');
  }, []);

  const handleSaveDraft = useCallback(() => {
    const label = draftLabel.trim();
    const gcode = draftGcode.trim();
    if (!label || !gcode) return;
    if (draftId) {
      persist(buttons.map((b) => (b.id === draftId ? { ...b, label, gcode } : b)));
    } else {
      persist([...buttons, { id: `cb-${Date.now()}`, label, gcode }]);
    }
    setDraftId(null);
    setDraftLabel('');
    setDraftGcode('');
  }, [buttons, draftId, draftLabel, draftGcode, persist]);

  const handleCancelDraft = useCallback(() => {
    setDraftId(null);
    setDraftLabel('');
    setDraftGcode('');
  }, []);

  const handleDelete = useCallback((id: string) => {
    persist(buttons.filter((b) => b.id !== id));
  }, [buttons, persist]);

  const isDraftValid = draftLabel.trim().length > 0 && draftGcode.trim().length > 0;

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={sectionTitle}><Zap size={14} /> Custom Buttons</div>
        <button
          style={iconBtn}
          onClick={() => {
            setEditing((v) => !v);
            handleCancelDraft();
          }}
          title={editing ? 'Done editing' : 'Edit buttons'}
        >
          {editing ? <Check size={12} /> : <Pencil size={12} />}
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>

      {buttons.length === 0 && !editing && (
        <div style={{ color: COLORS.textDim, fontSize: 12, textAlign: 'center', padding: '12px 0' }}>
          No custom buttons yet. Click <strong>Edit</strong> to add some.
        </div>
      )}

      {buttons.length > 0 && (
        <div style={gridStyle}>
          {buttons.map((btn) => {
            const isRunning = running === btn.id;
            return (
              <div key={btn.id} style={{ position: 'relative' }}>
                <button
                  style={{
                    ...buttonStyle,
                    opacity: connected ? 1 : 0.5,
                    cursor: connected && !isRunning ? 'pointer' : 'not-allowed',
                  }}
                  onClick={() => handleRun(btn)}
                  disabled={!connected || isRunning}
                  title={btn.gcode}
                >
                  {isRunning ? <Loader2 size={16} className="spin" /> : <Zap size={16} />}
                  <span style={{ textAlign: 'center', lineHeight: 1.2 }}>{btn.label}</span>
                </button>
                {editing && (
                  <div style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    display: 'flex',
                    gap: 2,
                  }}>
                    <button
                      style={{ ...iconBtn, padding: 3, fontSize: 10 }}
                      onClick={() => handleStartEdit(btn)}
                      title="Edit"
                    >
                      <Pencil size={10} />
                    </button>
                    <button
                      style={{ ...iconBtn, padding: 3, fontSize: 10, color: COLORS.danger }}
                      onClick={() => handleDelete(btn.id)}
                      title="Delete"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div style={{
          marginTop: 12,
          padding: 12,
          background: COLORS.surface,
          borderRadius: 6,
          border: `1px solid ${COLORS.panelBorder}`,
        }}>
          <div style={{ ...sectionTitle, marginBottom: 10 }}>
            {draftId ? 'Edit button' : <><Plus size={12} /> New button</>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              style={inputStyle}
              type="text"
              placeholder="Label (e.g. Preheat PLA)"
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              maxLength={40}
            />
            <textarea
              style={{ ...inputStyle, fontFamily: 'monospace', minHeight: 60, resize: 'vertical' }}
              placeholder={'G-code (one command per line)\nM104 S200\nM140 S60'}
              value={draftGcode}
              onChange={(e) => setDraftGcode(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              {draftId && (
                <button style={iconBtn} onClick={handleCancelDraft}>
                  <X size={12} /> Cancel
                </button>
              )}
              <button
                style={{
                  ...iconBtn,
                  background: isDraftValid ? COLORS.accent : COLORS.surface,
                  color: isDraftValid ? '#fff' : COLORS.textDim,
                  borderColor: isDraftValid ? COLORS.accent : COLORS.panelBorder,
                  cursor: isDraftValid ? 'pointer' : 'not-allowed',
                }}
                onClick={handleSaveDraft}
                disabled={!isDraftValid}
              >
                {draftId ? <><Check size={12} /> Save</> : <><Plus size={12} /> Add</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

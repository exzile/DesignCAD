import React, { useEffect } from 'react';
import {
  History, RefreshCw, Play, CheckCircle, XCircle, Loader2, FileText,
} from 'lucide-react';
import { usePrinterStore } from '../../store/printerStore';
import { colors as COLORS } from '../../utils/theme';

// ---------------------------------------------------------------------------
// Local style helpers — match the other Duet sub-panels
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
  marginBottom: 10,
  fontWeight: 600,
};

const btnBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 10px',
  borderRadius: 4,
  border: `1px solid ${COLORS.panelBorder}`,
  background: COLORS.surface,
  color: COLORS.text,
  cursor: 'pointer',
  fontSize: 12,
};

const rowBase: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '140px 1fr auto auto',
  gap: 10,
  alignItems: 'center',
  padding: '8px 10px',
  borderTop: `1px solid ${COLORS.panelBorder}`,
  fontSize: 12,
};

function formatDuration(sec?: number): string {
  if (sec === undefined) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function kindBadge(kind: 'start' | 'finish' | 'cancel' | 'event') {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };
  if (kind === 'finish') {
    return { ...base, background: 'rgba(34,197,94,0.15)', color: COLORS.success };
  }
  if (kind === 'cancel') {
    return { ...base, background: 'rgba(239,68,68,0.15)', color: COLORS.danger };
  }
  if (kind === 'start') {
    return { ...base, background: 'rgba(80,120,255,0.15)', color: COLORS.accent };
  }
  return { ...base, background: COLORS.surface, color: COLORS.textDim };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function DuetPrintHistory() {
  const connected = usePrinterStore((s) => s.connected);
  const history = usePrinterStore((s) => s.printHistory);
  const loading = usePrinterStore((s) => s.printHistoryLoading);
  const refresh = usePrinterStore((s) => s.refreshPrintHistory);
  const startPrint = usePrinterStore((s) => s.startPrint);

  useEffect(() => {
    if (connected && history.length === 0 && !loading) {
      void refresh();
    }
    // Intentionally only on connect — avoid refetching on every history update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}>
      <div style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ ...sectionTitle, marginBottom: 0 }}>
            <History size={14} /> Print History
            <span style={{ color: COLORS.textDim, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
              ({history.length})
            </span>
          </div>
          <button
            style={btnBase}
            onClick={() => refresh()}
            disabled={loading}
            title="Refresh from 0:/sys/eventlog.txt"
          >
            {loading ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />}
            Refresh
          </button>
        </div>

        {loading && history.length === 0 && (
          <div style={{ color: COLORS.textDim, fontSize: 12, textAlign: 'center', padding: 20 }}>
            Loading event log…
          </div>
        )}

        {!loading && history.length === 0 && (
          <div style={{ color: COLORS.textDim, fontSize: 12, textAlign: 'center', padding: 20 }}>
            <FileText size={18} style={{ marginBottom: 6, opacity: 0.6 }} />
            <div>No print events recorded yet.</div>
            <div style={{ marginTop: 4, fontSize: 11 }}>
              Reads from <code>0:/sys/eventlog.txt</code>
            </div>
          </div>
        )}

        {history.map((entry, i) => {
          const Icon = entry.kind === 'finish'
            ? CheckCircle
            : entry.kind === 'cancel'
            ? XCircle
            : Play;
          return (
            <div key={`${entry.timestamp}-${i}`} style={rowBase}>
              <span style={{ fontFamily: 'monospace', color: COLORS.textDim }}>
                {entry.timestamp}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.file ?? entry.message}
                {entry.durationSec !== undefined && (
                  <span style={{ color: COLORS.textDim, marginLeft: 8 }}>
                    ({formatDuration(entry.durationSec)})
                  </span>
                )}
              </span>
              <span style={kindBadge(entry.kind)}>
                <Icon size={11} />
                {entry.kind}
              </span>
              {entry.file ? (
                <button
                  style={{ ...btnBase, padding: '3px 8px' }}
                  onClick={() => startPrint(entry.file!)}
                  title={`Re-print ${entry.file}`}
                >
                  <Play size={11} /> Re-print
                </button>
              ) : (
                <span />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

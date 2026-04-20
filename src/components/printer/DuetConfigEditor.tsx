import { useState } from 'react';
import {
  FileCode2, FolderOpen, ChevronRight, Settings2,
  Home, Layers, Play, Zap, Wrench, Plus,
} from 'lucide-react';
import DuetFileEditor from './DuetFileEditor';
import { usePrinterStore } from '../../store/printerStore';
import { colors as COLORS } from '../../utils/theme';

// ---------------------------------------------------------------------------
// Config file catalogue
// ---------------------------------------------------------------------------

interface ConfigFile {
  path: string;
  label: string;
  desc: string;
}

interface ConfigGroup {
  id: string;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
  files: ConfigFile[];
}

const CONFIG_GROUPS: ConfigGroup[] = [
  {
    id: 'core',
    label: 'System',
    Icon: Settings2,
    files: [
      { path: '0:/sys/config.g',          label: 'config.g',          desc: 'Main machine configuration — runs on boot' },
      { path: '0:/sys/config-override.g', label: 'config-override.g', desc: 'Runtime overrides saved by M500' },
    ],
  },
  {
    id: 'homing',
    label: 'Homing',
    Icon: Home,
    files: [
      { path: '0:/sys/homeall.g', label: 'homeall.g', desc: 'Home all axes (G28)' },
      { path: '0:/sys/homex.g',   label: 'homex.g',   desc: 'Home X axis' },
      { path: '0:/sys/homey.g',   label: 'homey.g',   desc: 'Home Y axis' },
      { path: '0:/sys/homez.g',   label: 'homez.g',   desc: 'Home Z axis' },
    ],
  },
  {
    id: 'bed',
    label: 'Bed',
    Icon: Layers,
    files: [
      { path: '0:/sys/bed.g',            label: 'bed.g',            desc: 'Bed leveling / mesh compensation (G32)' },
      { path: '0:/sys/deployprobe.g',    label: 'deployprobe.g',    desc: 'Deploy the Z probe' },
      { path: '0:/sys/retractprobe.g',   label: 'retractprobe.g',   desc: 'Retract the Z probe' },
    ],
  },
  {
    id: 'lifecycle',
    label: 'Print Lifecycle',
    Icon: Play,
    files: [
      { path: '0:/sys/start.g',  label: 'start.g',  desc: 'Runs at the start of every print' },
      { path: '0:/sys/stop.g',   label: 'stop.g',   desc: 'Runs when a print finishes normally' },
      { path: '0:/sys/pause.g',  label: 'pause.g',  desc: 'Runs when a print is paused' },
      { path: '0:/sys/resume.g', label: 'resume.g', desc: 'Runs when a paused print is resumed' },
      { path: '0:/sys/cancel.g', label: 'cancel.g', desc: 'Runs when a print is cancelled' },
    ],
  },
  {
    id: 'toolchange',
    label: 'Tool Change (T0)',
    Icon: Wrench,
    files: [
      { path: '0:/sys/tpre0.g',  label: 'tpre0.g',  desc: 'Runs before tool 0 is selected' },
      { path: '0:/sys/tpost0.g', label: 'tpost0.g', desc: 'Runs after tool 0 is selected' },
      { path: '0:/sys/tfree0.g', label: 'tfree0.g', desc: 'Runs when tool 0 is deselected' },
    ],
  },
  {
    id: 'other',
    label: 'Other',
    Icon: Zap,
    files: [
      { path: '0:/sys/sleep.g',                label: 'sleep.g',                desc: 'Runs when the machine goes to sleep (M1)' },
      { path: '0:/sys/resurrect-prologue.g',   label: 'resurrect-prologue.g',   desc: 'Print-recovery preamble' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = {
  root: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    overflow: 'hidden',
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    borderBottom: `1px solid ${COLORS.panelBorder}`,
    flexShrink: 0,
  },
  toolbarTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.text,
    flex: 1,
  },
  browseBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 10px',
    fontSize: 12,
    border: `1px solid ${COLORS.panelBorder}`,
    borderRadius: 4,
    background: COLORS.surface,
    color: COLORS.text,
    cursor: 'pointer',
  },
  scroll: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 20,
  },
  group: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 10,
    fontWeight: 700,
    color: COLORS.textDim,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    marginBottom: 4,
    userSelect: 'none' as const,
  },
  fileRow: (active: boolean, connected: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '7px 10px',
    borderRadius: 6,
    cursor: connected ? 'pointer' : 'not-allowed',
    background: active ? `${COLORS.accent}18` : 'transparent',
    border: `1px solid ${active ? COLORS.accent : 'transparent'}`,
    transition: 'background 0.1s, border-color 0.1s',
    opacity: connected ? 1 : 0.5,
  }),
  fileIcon: {
    color: COLORS.textDim,
    flexShrink: 0,
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    fontSize: 12,
    fontWeight: 500,
    color: COLORS.text,
    fontFamily: "'Consolas', 'JetBrains Mono', monospace",
  },
  fileDesc: {
    fontSize: 11,
    color: COLORS.textDim,
    marginTop: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  chevron: {
    color: COLORS.textDim,
    flexShrink: 0,
  },
  notConnected: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    flex: 1,
    color: COLORS.textDim,
    fontSize: 13,
  },
};

// ---------------------------------------------------------------------------
// Browse modal — lets the user type an arbitrary path
// ---------------------------------------------------------------------------

function BrowseModal({ onOpen, onClose }: { onOpen: (path: string) => void; onClose: () => void }) {
  const [path, setPath] = useState('0:/sys/');
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#2d2d2d', border: '1px solid #555', borderRadius: 6, padding: 20, minWidth: 420, color: '#ccc' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Open file</div>
        <input
          style={{ width: '100%', padding: '6px 8px', fontSize: 13, border: '1px solid #555', borderRadius: 4, background: '#1e1e1e', color: '#ccc', outline: 'none', boxSizing: 'border-box' }}
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && path.trim()) onOpen(path.trim());
            if (e.key === 'Escape') onClose();
          }}
          autoFocus
          placeholder="0:/sys/config.g"
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <button style={{ padding: '5px 12px', fontSize: 12, border: '1px solid #555', borderRadius: 4, background: '#353535', color: '#ccc', cursor: 'pointer' }} onClick={onClose}>Cancel</button>
          <button
            style={{ padding: '5px 12px', fontSize: 12, border: 'none', borderRadius: 4, background: '#0078d4', color: '#fff', cursor: 'pointer' }}
            onClick={() => path.trim() && onOpen(path.trim())}
          >
            Open
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DuetConfigEditor() {
  const connected = usePrinterStore((s) => s.connected);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [showBrowse, setShowBrowse] = useState(false);

  const handleOpen = (path: string) => {
    if (!connected) return;
    setShowBrowse(false);
    setOpenPath(path);
  };

  return (
    <div style={s.root}>
      {/* Toolbar */}
      <div style={s.toolbar}>
        <FileCode2 size={15} style={{ color: COLORS.textDim }} />
        <span style={s.toolbarTitle}>Configuration Files</span>
        <button style={s.browseBtn} onClick={() => setShowBrowse(true)} disabled={!connected} title="Open any file by path">
          <Plus size={13} /> Browse&hellip;
        </button>
      </div>

      {!connected ? (
        <div style={s.notConnected}>
          <FolderOpen size={32} />
          <span>Connect to a Duet board to edit configuration files</span>
        </div>
      ) : (
        <div style={s.scroll}>
          {CONFIG_GROUPS.map((group) => (
            <div key={group.id} style={s.group}>
              <div style={s.groupHeader}>
                <group.Icon size={11} />
                {group.label}
              </div>
              {group.files.map((file) => (
                <div
                  key={file.path}
                  style={s.fileRow(openPath === file.path, connected)}
                  onClick={() => handleOpen(file.path)}
                  role="button"
                  tabIndex={connected ? 0 : -1}
                  onKeyDown={(e) => e.key === 'Enter' && handleOpen(file.path)}
                >
                  <FileCode2 size={14} style={s.fileIcon} />
                  <div style={s.fileInfo}>
                    <div style={s.fileName}>{file.label}</div>
                    <div style={s.fileDesc}>{file.desc}</div>
                  </div>
                  <ChevronRight size={13} style={s.chevron} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {openPath && (
        <DuetFileEditor
          filePath={openPath}
          onClose={() => setOpenPath(null)}
        />
      )}

      {showBrowse && (
        <BrowseModal onOpen={handleOpen} onClose={() => setShowBrowse(false)} />
      )}
    </div>
  );
}

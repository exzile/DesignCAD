// =============================================================================
// FilamentSensorPanel — live status readout for filament runout / encoder
// monitors reported by the board's `sensors.filamentMonitors[]` object-model
// key.
//
// Each row shows:
//   - a coloured status dot (green ok / amber movement warning / red fault)
//   - extruder index (the array index IS the extruder drive)
//   - monitor type ("rotatingMagnet", "laser", etc.)
//   - enabled toggle → sends M591 D<n> S1/S0 to the board
//   - live measured vs. configured movement %, when present
//
// When the board isn't connected or reports no monitors we show a tiny hint
// rather than a blank card, because an empty Duet panel usually signals a
// config bug.
// =============================================================================

import { useCallback } from 'react';
import { FlaskConical } from 'lucide-react';
import { usePrinterStore } from '../../../store/printerStore';
import type { DuetFilamentMonitor, FilamentMonitorStatus } from '../../../types/duet';

function statusColor(s?: FilamentMonitorStatus): string {
  switch (s) {
    case 'ok':                return '#10b981'; // emerald
    case 'noFilament':        return '#ef4444'; // red
    case 'sensorError':       return '#ef4444';
    case 'tooLittleMovement': return '#f59e0b'; // amber
    case 'tooMuchMovement':   return '#f59e0b';
    case 'noDataReceived':    return '#9ca3af'; // gray
    case 'noMonitor':
    default:                  return '#6b7280';
  }
}

function statusLabel(s?: FilamentMonitorStatus): string {
  switch (s) {
    case 'ok':                return 'OK';
    case 'noFilament':        return 'No filament';
    case 'sensorError':       return 'Sensor error';
    case 'tooLittleMovement': return 'Too little movement';
    case 'tooMuchMovement':   return 'Too much movement';
    case 'noDataReceived':    return 'No data';
    case 'noMonitor':         return 'No monitor';
    default:                  return 'Unknown';
  }
}

interface RowProps {
  index: number;
  monitor: DuetFilamentMonitor;
  onToggle: (index: number, enabled: boolean) => void;
}

function FilamentMonitorRow({ index, monitor, onToggle }: RowProps) {
  const color = statusColor(monitor.status);
  const label = statusLabel(monitor.status);
  const percent = monitor.calibrated?.percentMin !== undefined && monitor.calibrated?.percentMax !== undefined
    ? `${monitor.calibrated.percentMin}–${monitor.calibrated.percentMax}%`
    : null;

  return (
    <div style={rowStyles.row}>
      <div style={{ ...rowStyles.dot, background: color }} title={label} />
      <div style={rowStyles.main}>
        <div style={rowStyles.titleRow}>
          <span style={rowStyles.extruder}>E{index}</span>
          <span style={rowStyles.type}>{monitor.type ?? 'unknown'}</span>
          <span style={{ ...rowStyles.badge, color, borderColor: color }}>{label}</span>
        </div>
        <div style={rowStyles.detailRow}>
          {monitor.filamentPresent !== undefined && (
            <span>{monitor.filamentPresent ? 'Filament present' : 'No filament'}</span>
          )}
          {percent && <span>Measured: {percent}</span>}
          {monitor.configured?.percentMin !== undefined && monitor.configured?.percentMax !== undefined && (
            <span>Allowed: {monitor.configured.percentMin}–{monitor.configured.percentMax}%</span>
          )}
        </div>
      </div>
      <label style={rowStyles.toggle} title="Enable / disable this monitor">
        <input
          type="checkbox"
          checked={monitor.enabled ?? false}
          onChange={(e) => onToggle(index, e.target.checked)}
        />
        <span>{monitor.enabled ? 'On' : 'Off'}</span>
      </label>
    </div>
  );
}

export default function FilamentSensorPanel() {
  const connected = usePrinterStore((s) => s.connected);
  const sendGCode = usePrinterStore((s) => s.sendGCode);
  const monitors = usePrinterStore(
    (s) => s.model.sensors?.filamentMonitors,
  ) as DuetFilamentMonitor[] | undefined;

  const handleToggle = useCallback(async (index: number, enabled: boolean) => {
    // M591 D<drive> S<0|1> — enables or disables the monitor without
    // re-configuring its type/parameters. Existing `configured` fields stay.
    await sendGCode(`M591 D${index} S${enabled ? 1 : 0}`);
  }, [sendGCode]);

  if (!connected) {
    return (
      <div style={emptyStyles.root}>
        <FlaskConical size={20} style={{ opacity: 0.4 }} />
        <span>Connect a printer to view filament sensors.</span>
      </div>
    );
  }

  const list = monitors ?? [];
  // RRF reports one entry per extruder drive, even if the slot has no
  // configured monitor. Hide those to keep the panel clean — a real monitor
  // reports a `type` other than undefined (`noMonitor` also gets filtered).
  const active = list
    .map((m, idx) => ({ m, idx }))
    .filter(({ m }) => m.type && m.type !== 'none' && m.status !== 'noMonitor');

  if (active.length === 0) {
    return (
      <div style={emptyStyles.root}>
        <FlaskConical size={20} style={{ opacity: 0.4 }} />
        <span>No filament monitors configured.</span>
        <span style={{ fontSize: 11, opacity: 0.6 }}>
          Use <code style={emptyStyles.code}>M591 D0 P... </code> in <code style={emptyStyles.code}>config.g</code> to add one.
        </span>
      </div>
    );
  }

  return (
    <div style={panelStyles.root}>
      {active.map(({ m, idx }) => (
        <FilamentMonitorRow
          key={idx}
          index={idx}
          monitor={m}
          onToggle={handleToggle}
        />
      ))}
    </div>
  );
}

const panelStyles: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 2px' },
};

const rowStyles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
    background: 'var(--panel-sub-bg, rgba(255,255,255,0.02))',
    border: '1px solid var(--panel-border, #2a2a2a)',
    borderRadius: 4,
  },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  main: { flex: 1, minWidth: 0 },
  titleRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const },
  extruder: { fontFamily: 'monospace', fontWeight: 600, fontSize: 12, opacity: 0.9 },
  type: { fontSize: 11, opacity: 0.6, fontStyle: 'italic' },
  badge: {
    fontSize: 10, padding: '1px 6px', borderRadius: 10, border: '1px solid',
    textTransform: 'uppercase' as const, letterSpacing: 0.4,
  },
  detailRow: {
    display: 'flex', gap: 12, fontSize: 11, opacity: 0.7, marginTop: 2, flexWrap: 'wrap' as const,
  },
  toggle: {
    display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer',
  },
};

const emptyStyles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 8px',
    color: 'var(--text-muted, #9aa0a6)', fontSize: 12, flexWrap: 'wrap' as const,
  },
  code: {
    fontFamily: 'monospace', background: 'var(--panel-sub-bg, rgba(255,255,255,0.05))',
    padding: '1px 4px', borderRadius: 3, fontSize: 10,
  },
};

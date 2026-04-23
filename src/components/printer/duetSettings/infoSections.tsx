import React from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Cpu,
  Gauge,
  Home,
  Info,
  Thermometer,
  Zap,
} from 'lucide-react';
import type { ImportResult } from '../../../utils/settingsExport';
import type { DuetBoard } from '../../../types/duet';

interface AxisInfo {
  acceleration?: number;
  homed?: boolean;
  jerk?: number;
  letter?: string;
  machinePosition?: number;
  max?: number;
  min?: number;
  speed?: number;
}

export function MachineSection({
  axes,
  board,
  connected,
}: {
  axes: AxisInfo[];
  board?: DuetBoard;
  connected: boolean;
}) {
  const mcuOk = board?.mcuTemp?.current !== undefined && board.mcuTemp.current < 70;
  const vinOk = board?.vIn?.current !== undefined && board.vIn.current >= 22 && board.vIn.current <= 26;

  return (
    <>
      <div className="duet-settings__page-title">Machine</div>
      {!connected && (
        <div className="duet-settings__banner duet-settings__banner--info">
          <Info size={16} /> Connect to a Duet board to see live machine details.
        </div>
      )}

      <div className="ds-machine-hero">
        <div className="ds-machine-hero-head">
          <div className="ds-machine-hero-icon"><Cpu size={22} /></div>
          <div className="ds-machine-hero-title">
            <div className="ds-machine-hero-name">
              {board?.name ?? board?.shortName ?? (connected ? 'Unknown board' : 'Not connected')}
            </div>
            <div className="ds-machine-hero-fw">
              {board ? (
                <>
                  <span>{board.firmwareName} <strong>{board.firmwareVersion}</strong></span>
                  {board.firmwareDate && <span className="ds-machine-hero-date"> · {board.firmwareDate}</span>}
                </>
              ) : (
                <span className="duet-settings__dim-text">No firmware information</span>
              )}
            </div>
          </div>
          <span className={`ds-status-pill ds-status-pill--${connected ? 'ok' : 'off'}`}>
            <span className="ds-status-dot" />
            {connected ? 'online' : 'offline'}
          </span>
        </div>

        <div className="ds-metric-grid">
          {board?.mcuTemp?.current !== undefined && (
            <div className={`ds-metric${mcuOk ? '' : ' ds-metric--warn'}`}>
              <div className="ds-metric-icon"><Thermometer size={14} /></div>
              <div className="ds-metric-body">
                <div className="ds-metric-label">MCU Temp</div>
                <div className="ds-metric-value">{board.mcuTemp.current.toFixed(1)}<small>°C</small></div>
              </div>
            </div>
          )}
          {board?.vIn?.current !== undefined && (
            <div className={`ds-metric${vinOk ? '' : ' ds-metric--warn'}`}>
              <div className="ds-metric-icon"><Zap size={14} /></div>
              <div className="ds-metric-body">
                <div className="ds-metric-label">VIN</div>
                <div className="ds-metric-value">{board.vIn.current.toFixed(1)}<small>V</small></div>
              </div>
            </div>
          )}
          {board?.v12?.current !== undefined && (
            <div className="ds-metric">
              <div className="ds-metric-icon"><Zap size={14} /></div>
              <div className="ds-metric-body">
                <div className="ds-metric-label">12V Rail</div>
                <div className="ds-metric-value">{board.v12.current.toFixed(1)}<small>V</small></div>
              </div>
            </div>
          )}
          {board?.maxMotors !== undefined && (
            <div className="ds-metric">
              <div className="ds-metric-icon"><Activity size={14} /></div>
              <div className="ds-metric-body">
                <div className="ds-metric-label">Max Motors</div>
                <div className="ds-metric-value">{board.maxMotors}</div>
              </div>
            </div>
          )}
          {board?.maxHeaters !== undefined && (
            <div className="ds-metric">
              <div className="ds-metric-icon"><Thermometer size={14} /></div>
              <div className="ds-metric-body">
                <div className="ds-metric-label">Max Heaters</div>
                <div className="ds-metric-value">{board.maxHeaters}</div>
              </div>
            </div>
          )}
          {board?.canAddress !== undefined && (
            <div className="ds-metric">
              <div className="ds-metric-icon"><Activity size={14} /></div>
              <div className="ds-metric-body">
                <div className="ds-metric-label">CAN Address</div>
                <div className="ds-metric-value">{board.canAddress}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="duet-settings__section">
        <div className="duet-settings__section-title ds-section-title-row">
          <Home size={14} /> Axes &amp; Motion
          {axes.length > 0 && <span className="ds-section-count">{axes.length}</span>}
        </div>
        {axes.length === 0 ? (
          <div className="ds-empty-hint">No axes reported.</div>
        ) : (
          <div className="ds-axes-grid">
            {axes.map((axis, index) => {
              const min = axis.min ?? 0;
              const max = axis.max ?? 0;
              const range = max - min;
              const position = axis.machinePosition ?? min;
              const percent = range > 0 ? Math.max(0, Math.min(100, ((position - min) / range) * 100)) : 0;
              return (
                <div key={index} className="ds-axis-card">
                  <div className="ds-axis-head">
                    <span className="ds-axis-letter">{axis.letter ?? `#${index}`}</span>
                    <span className={`ds-status-pill ds-status-pill--${axis.homed ? 'ok' : 'warn'} ds-status-pill--sm`}>
                      <Home size={9} /> {axis.homed ? 'homed' : 'not homed'}
                    </span>
                  </div>
                  <div className="ds-axis-range">
                    <div className="ds-axis-range-bar">
                      <div className="ds-axis-range-fill" style={{ width: `${percent}%` }} />
                      <div className="ds-axis-range-marker" style={{ left: `${percent}%` }} />
                    </div>
                    <div className="ds-axis-range-labels">
                      <span>{min.toFixed(0)}</span>
                      <span className="ds-axis-range-current">{position.toFixed(1)} mm</span>
                      <span>{max.toFixed(0)}</span>
                    </div>
                  </div>
                  <div className="ds-axis-stats">
                    <div className="ds-axis-stat">
                      <Gauge size={10} />
                      <span className="ds-axis-stat-label">Speed</span>
                      <span className="ds-axis-stat-value">{axis.speed?.toFixed(0) ?? '—'}<small> mm/s</small></span>
                    </div>
                    <div className="ds-axis-stat">
                      <Activity size={10} />
                      <span className="ds-axis-stat-label">Accel</span>
                      <span className="ds-axis-stat-value">{axis.acceleration?.toFixed(0) ?? '—'}<small> mm/s²</small></span>
                    </div>
                    <div className="ds-axis-stat">
                      <Zap size={10} />
                      <span className="ds-axis-stat-label">Jerk</span>
                      <span className="ds-axis-stat-value">{axis.jerk?.toFixed(0) ?? '—'}<small> mm/s</small></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export function BackupSection({
  downloadSettings,
  handleImport,
  importInputRef,
  importResult,
  importing,
}: {
  downloadSettings: () => void;
  handleImport: React.ChangeEventHandler<HTMLInputElement>;
  importInputRef: React.RefObject<HTMLInputElement | null>;
  importResult: ImportResult | null;
  importing: boolean;
}) {
  return (
    <>
      <div className="duet-settings__page-title">Backup &amp; Restore</div>
      <p className="duet-settings__about-text">
        Export all your workspace preferences to a <code>.json</code> file and import them on any device or browser - even after clearing site data. Model geometry and plate objects are <strong>not</strong> included; use the <em>Save (.dzn)</em> button for those.
      </p>

      <div className="duet-settings__section">
        <div className="duet-settings__section-title">What is exported</div>
        <ul className="duet-settings__about-text" style={{ paddingLeft: 18, margin: 0 }}>
          <li>Design workspace - grid, units, visual style, viewport layout, tolerances</li>
          <li>Prepare workspace - all slicer profiles (printer, material, print) &amp; active selections</li>
          <li>3D Print workspace - printer connection config &amp; all UI preferences</li>
          <li>Theme (light / dark)</li>
        </ul>
      </div>

      <div className="duet-settings__section">
        <div className="duet-settings__section-title">Export</div>
        <button className="duet-settings__btn duet-settings__btn--primary" onClick={downloadSettings} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={14} /> Download settings file
        </button>
      </div>

      <div className="duet-settings__section">
        <div className="duet-settings__section-title">Import</div>
        <input ref={importInputRef} type="file" accept=".json,application/json" hidden onChange={handleImport} />
        <button className="duet-settings__btn duet-settings__btn--secondary" onClick={() => importInputRef.current?.click()} disabled={importing} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {importing ? <Zap size={14} className="spin" /> : <CheckCircle size={14} />}
          {importing ? 'Importing...' : 'Choose settings file...'}
        </button>

        {importResult && (
          <div className={`duet-settings__banner duet-settings__banner--${importResult.ok ? 'success' : 'error'}`} style={{ marginTop: 12 }}>
            {importResult.ok ? (
              <>
                <CheckCircle size={14} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Import successful</strong>
                  <div style={{ marginTop: 4, fontSize: 12 }}>Applied: {importResult.appliedSections.join(', ')}</div>
                  {importResult.warnings.map((warning, index) => (
                    <div key={index} style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>
                      {warning}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <div><strong>Import failed</strong> - {importResult.error}</div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export function AboutSection({ board }: { board?: DuetBoard }) {
  return (
    <>
      <div className="duet-settings__page-title">About</div>
      <div className="duet-settings__section">
        <div className="duet-settings__section-title">Dzign3D - Printer Panel</div>
        <p className="duet-settings__about-text">
          Communicates with Duet3D boards (Duet 2, Duet 3, and compatible) using the RepRapFirmware REST API. Compatible with RepRapFirmware 3.x and the DuetWebControl 3.x protocol. Both standalone and SBC (DuetSoftwareFramework) modes are supported.
        </p>
      </div>

      <div className="duet-settings__section">
        <div className="duet-settings__section-title">Firmware</div>
        {board ? (
          <div className="duet-settings__info-grid">
            <span className="duet-settings__dim-text">Board</span>
            <span className="duet-settings__mono">{board.name ?? board.shortName ?? '—'}</span>
            <span className="duet-settings__dim-text">Firmware</span>
            <span className="duet-settings__mono">{board.firmwareName} {board.firmwareVersion}</span>
            {board.firmwareDate && (
              <>
                <span className="duet-settings__dim-text">Build date</span>
                <span className="duet-settings__mono">{board.firmwareDate}</span>
              </>
            )}
          </div>
        ) : (
          <div className="duet-settings__dim-text">Not connected.</div>
        )}
      </div>
    </>
  );
}

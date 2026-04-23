import {
  AlertCircle,
  CheckCircle,
  Info,
  Loader2,
  Moon,
  Pencil,
  Plus,
  Sun,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { ThemeMode } from '../../../store/themeStore';
import type {
  DateFormat,
  DuetPrefs,
  NotifSeverity,
  TemperatureUnit,
  Units,
} from '../../../utils/duetPrefs';
import { SettingRow, ToggleRow } from './common';

interface PrinterOption {
  id: string;
  name: string;
}

interface TestResultState {
  success: boolean;
  firmwareVersion?: string;
  error?: string;
}

interface ConnectionSectionProps {
  activePrinterId: string;
  canConnect: boolean;
  config: { hostname: string };
  connected: boolean;
  connecting: boolean;
  error: string | null;
  handleAddPrinter: () => void;
  handleConnect: () => void;
  handleDisconnect: () => void;
  handleRemovePrinter: () => void;
  handleRenamePrinter: () => void;
  handleTest: () => void;
  hostname: string;
  mode: 'standalone' | 'sbc';
  password: string;
  prefs: DuetPrefs;
  patchPrefs: (patch: Partial<DuetPrefs>) => void;
  printers: PrinterOption[];
  selectPrinter: (printerId: string) => void;
  setHostname: (value: string) => void;
  setMode: (value: 'standalone' | 'sbc') => void;
  setPassword: (value: string) => void;
  testResult: TestResultState | null;
  testing: boolean;
}

export function ConnectionSection({
  activePrinterId,
  canConnect,
  config,
  connected,
  connecting,
  error,
  handleAddPrinter,
  handleConnect,
  handleDisconnect,
  handleRemovePrinter,
  handleRenamePrinter,
  handleTest,
  hostname,
  mode,
  password,
  prefs,
  patchPrefs,
  printers,
  selectPrinter,
  setHostname,
  setMode,
  setPassword,
  testResult,
  testing,
}: ConnectionSectionProps) {
  return (
    <>
      <div className="duet-settings__page-title">Connection</div>

      <SettingRow
        label="Printer"
        hint="Select which printer this workspace connects to. Each printer keeps its own connection info and preferences."
        control={
          <div className="duet-settings__btn-row" style={{ gap: 6, marginTop: 0 }}>
            <select
              className="duet-settings__input"
              style={{ minWidth: 180 }}
              value={activePrinterId}
              onChange={(event) => {
                selectPrinter(event.target.value);
              }}
              disabled={connecting}
            >
              {printers.map((printer) => (
                <option key={printer.id} value={printer.id}>
                  {printer.name}
                </option>
              ))}
            </select>
            <button className="duet-settings__btn duet-settings__btn--secondary" onClick={handleAddPrinter} title="Add printer" disabled={connecting}>
              <Plus size={14} /> Add
            </button>
            <button className="duet-settings__btn duet-settings__btn--secondary" onClick={handleRenamePrinter} title="Rename printer" disabled={connecting}>
              <Pencil size={14} /> Rename
            </button>
            <button className="duet-settings__btn duet-settings__btn--danger" onClick={handleRemovePrinter} title="Remove printer" disabled={connecting || printers.length <= 1}>
              <Trash2 size={14} /> Remove
            </button>
          </div>
        }
      />

      {connected ? (
        <div className="duet-settings__banner duet-settings__banner--success">
          <Wifi size={16} /> Connected to Duet3D board at {config.hostname}
        </div>
      ) : (
        <div className="duet-settings__banner duet-settings__banner--info">
          <Info size={16} /> Connect to your Duet3D board via its REST API
        </div>
      )}

      <SettingRow
        label="Hostname / IP Address"
        hint="Enter the IP address or hostname of your Duet3D board (without http://)"
        control={
          <input
            className="duet-settings__input"
            type="text"
            value={hostname}
            onChange={(event) => setHostname(event.target.value)}
            placeholder="192.168.1.100 or myprinter.local"
            disabled={connected}
          />
        }
      />

      <SettingRow
        label="Board Password (optional)"
        hint="Only required if your board has a password set in config.g (M551)"
        control={
          <input
            className="duet-settings__input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Leave blank if no password is set"
            disabled={connected}
          />
        }
      />

      <SettingRow
        label="Connection Mode"
        hint={
          mode === 'standalone'
            ? 'Connect directly to the Duet board via its built-in WiFi/Ethernet.'
            : 'Connect via a Single Board Computer running DuetSoftwareFramework.'
        }
        control={
          <div className="duet-settings__mode-selector">
            <button className={`duet-settings__mode-btn${mode === 'standalone' ? ' is-active' : ''}`} onClick={() => setMode('standalone')} disabled={connected}>
              Standalone
            </button>
            <button className={`duet-settings__mode-btn${mode === 'sbc' ? ' is-active' : ''}`} onClick={() => setMode('sbc')} disabled={connected}>
              SBC (Raspberry Pi)
            </button>
          </div>
        }
      />

      <div className="duet-settings__btn-row">
        <button className={`duet-settings__btn duet-settings__btn--secondary${testing || connected ? ' duet-settings__btn--disabled' : ''}`} onClick={handleTest} disabled={testing || connected || !hostname.trim()}>
          {testing ? (
            <>
              <Loader2 size={14} className="spin" /> Testing...
            </>
          ) : (
            'Test Connection'
          )}
        </button>

        {connected ? (
          <button className="duet-settings__btn duet-settings__btn--danger" onClick={handleDisconnect}>
            <WifiOff size={14} /> Disconnect
          </button>
        ) : (
          <button className={`duet-settings__btn duet-settings__btn--primary${!canConnect ? ' duet-settings__btn--disabled' : ''}`} onClick={handleConnect} disabled={!canConnect}>
            {connecting ? (
              <>
                <Loader2 size={14} className="spin" /> Connecting...
              </>
            ) : (
              <>
                <Wifi size={14} /> Connect
              </>
            )}
          </button>
        )}
      </div>

      {testResult && (
        <div className={`duet-settings__banner ${testResult.success ? 'duet-settings__banner--success' : 'duet-settings__banner--error'}`}>
          {testResult.success ? (
            <>
              <CheckCircle size={16} />
              <div>
                <div className="duet-settings__banner-heading">Connection successful</div>
                {testResult.firmwareVersion && <div className="duet-settings__banner-detail">Firmware: {testResult.firmwareVersion}</div>}
              </div>
            </>
          ) : (
            <>
              <AlertCircle size={16} />
              <div>
                <div className="duet-settings__banner-heading">Connection failed</div>
                {testResult.error && <div className="duet-settings__banner-detail">{testResult.error}</div>}
              </div>
            </>
          )}
        </div>
      )}

      {error && !testResult && (
        <div className="duet-settings__banner duet-settings__banner--error">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="duet-settings__section" style={{ marginTop: 16 }}>
        <div className="duet-settings__section-title">Auto-Reconnect</div>
        <ToggleRow
          id="auto-reconnect-conn"
          checked={prefs.autoReconnect}
          onChange={(value) => patchPrefs({ autoReconnect: value })}
          label="Enable auto-reconnect"
          hint="Automatically attempt to reconnect when the connection drops."
        />
        {prefs.autoReconnect && (
          <>
            <SettingRow
              label="Reconnect Interval"
              hint="Time between reconnect attempts."
              control={
                <select className="duet-settings__select" value={prefs.reconnectInterval} onChange={(event) => patchPrefs({ reconnectInterval: Number(event.target.value) })}>
                  <option value={2000}>2 seconds</option>
                  <option value={5000}>5 seconds</option>
                  <option value={10000}>10 seconds</option>
                  <option value={30000}>30 seconds</option>
                  <option value={60000}>60 seconds</option>
                </select>
              }
            />
            <SettingRow
              label="Max Retries"
              hint="Maximum number of reconnect attempts before giving up."
              control={
                <select className="duet-settings__select" value={prefs.maxRetries} onChange={(event) => patchPrefs({ maxRetries: Number(event.target.value) })}>
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={0}>Unlimited</option>
                </select>
              }
            />
          </>
        )}
      </div>
    </>
  );
}

export function GeneralSection({
  patchPrefs,
  prefs,
}: {
  patchPrefs: (patch: Partial<DuetPrefs>) => void;
  prefs: DuetPrefs;
}) {
  return (
    <>
      <div className="duet-settings__page-title">General</div>
      <SettingRow
        label="Units"
        hint="Preferred unit system for display. Individual panels may override."
        control={
          <select className="duet-settings__select" value={prefs.units} onChange={(event) => patchPrefs({ units: event.target.value as Units })}>
            <option value="metric">Metric (mm)</option>
            <option value="imperial">Imperial (in)</option>
          </select>
        }
      />
      <SettingRow
        label="Webcam URL"
        hint="URL for the printer webcam stream. Leave blank to use the default (hostname/webcam/?action=stream)."
        control={
          <input
            className="duet-settings__input"
            type="text"
            value={prefs.webcamUrl}
            onChange={(event) => patchPrefs({ webcamUrl: event.target.value })}
            placeholder="e.g. http://192.168.1.100:8080/?action=stream"
          />
        }
      />
      <SettingRow
        label="Temperature Unit"
        hint="Display temperatures in Celsius or Fahrenheit."
        control={
          <select className="duet-settings__select" value={prefs.temperatureUnit} onChange={(event) => patchPrefs({ temperatureUnit: event.target.value as TemperatureUnit })}>
            <option value="C">Celsius (°C)</option>
            <option value="F">Fahrenheit (°F)</option>
          </select>
        }
      />
      <SettingRow
        label="Date Format"
        hint="Show dates as relative (e.g. '2 hours ago') or absolute (e.g. '2026-04-18 14:30')."
        control={
          <select className="duet-settings__select" value={prefs.dateFormat} onChange={(event) => patchPrefs({ dateFormat: event.target.value as DateFormat })}>
            <option value="relative">Relative</option>
            <option value="absolute">Absolute</option>
          </select>
        }
      />
      <SettingRow
        label="Language"
        hint="Additional languages are planned - English only today."
        control={
          <select className="duet-settings__select" value="en" disabled>
            <option value="en">English</option>
          </select>
        }
      />
    </>
  );
}

export function AppearanceSection({
  setTheme,
  theme,
}: {
  setTheme: (theme: ThemeMode) => void;
  theme: ThemeMode;
}) {
  return (
    <>
      <div className="duet-settings__page-title">Appearance</div>
      <SettingRow
        label="Theme"
        hint="Switch between light and dark themes. Applies immediately."
        control={
          <div className="duet-settings__mode-selector">
            {(['light', 'dark'] as ThemeMode[]).map((mode) => (
              <button key={mode} className={`duet-settings__mode-btn${theme === mode ? ' is-active' : ''}`} onClick={() => setTheme(mode)}>
                {mode === 'light' ? <Sun size={14} /> : <Moon size={14} />}
                {mode}
              </button>
            ))}
          </div>
        }
      />
    </>
  );
}

export function BehaviourSection({
  patchPrefs,
  prefs,
}: {
  patchPrefs: (patch: Partial<DuetPrefs>) => void;
  prefs: DuetPrefs;
}) {
  return (
    <>
      <div className="duet-settings__page-title">Behaviour</div>
      <ToggleRow
        id="confirm-tool-change"
        checked={prefs.confirmToolChange}
        onChange={(value) => patchPrefs({ confirmToolChange: value })}
        label="Confirm tool changes"
        hint="Ask for confirmation before switching the active tool (T command)."
      />
      <ToggleRow
        id="silent-prompts"
        checked={prefs.silentPrompts}
        onChange={(value) => patchPrefs({ silentPrompts: value })}
        label="Silent prompts"
        hint="Suppress beeps for routine M291 message box dialogs."
      />
      <ToggleRow
        id="auto-reconnect"
        checked={prefs.autoReconnect}
        onChange={(value) => patchPrefs({ autoReconnect: value })}
        label="Auto-reconnect"
        hint="Automatically reconnect on startup and when the connection drops. Configure interval and retries in the Connection tab."
      />
    </>
  );
}

export function NotificationsSection({
  patchPrefs,
  prefs,
}: {
  patchPrefs: (patch: Partial<DuetPrefs>) => void;
  prefs: DuetPrefs;
}) {
  return (
    <>
      <div className="duet-settings__page-title">Notifications</div>
      <SettingRow
        label="Toast Duration"
        hint="How long notification toasts stay visible before auto-dismissing."
        control={
          <select className="duet-settings__select" value={prefs.toastDurationMs} onChange={(event) => patchPrefs({ toastDurationMs: Number(event.target.value) })}>
            <option value={3000}>3 seconds</option>
            <option value={5000}>5 seconds</option>
            <option value={8000}>8 seconds</option>
            <option value={12000}>12 seconds</option>
          </select>
        }
      />
      <ToggleRow
        id="notif-sound"
        checked={prefs.notificationsSound}
        onChange={(value) => patchPrefs({ notificationsSound: value })}
        label="Play sound on beep events"
        hint="Trigger a short tone when the firmware emits an M300 beep."
      />
      <ToggleRow
        id="sound-alert-complete"
        checked={prefs.soundAlertOnComplete}
        onChange={(value) => patchPrefs({ soundAlertOnComplete: value })}
        label="Sound alert on print complete/error"
        hint="Play a notification sound when a print finishes or encounters an error."
      />
      <SettingRow
        label="Minimum Severity"
        hint="Only show toasts at or above this severity level."
        control={
          <select className="duet-settings__select" value={prefs.notifMinSeverity} onChange={(event) => patchPrefs({ notifMinSeverity: event.target.value as NotifSeverity })}>
            <option value="info">Info and above</option>
            <option value="warning">Warning and above</option>
            <option value="error">Errors only</option>
          </select>
        }
      />
    </>
  );
}

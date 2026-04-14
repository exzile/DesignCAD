import React, { useState, useCallback, useMemo } from 'react';
import {
  X, Wifi, WifiOff, Loader2, CheckCircle, AlertCircle, Info,
  Plug, Settings as SettingsIcon, Palette, ToggleLeft, Bell, Cpu, BadgeInfo,
  Sun, Moon, UploadCloud, Zap,
} from 'lucide-react';
import { usePrinterStore } from '../../store/printerStore';
import { useThemeStore, type ThemeMode } from '../../store/themeStore';
import { colors as COLORS } from '../../utils/theme';
import {
  getDuetPrefs, updateDuetPrefs,
  type DuetPrefs, type Units, type NotifSeverity,
} from '../../utils/duetPrefs';

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------
const TABS = [
  { key: 'connection'    as const, label: 'Connection',    Icon: Plug },
  { key: 'general'       as const, label: 'General',       Icon: SettingsIcon },
  { key: 'appearance'    as const, label: 'Appearance',    Icon: Palette },
  { key: 'behaviour'     as const, label: 'Behaviour',     Icon: ToggleLeft },
  { key: 'notifications' as const, label: 'Notifications', Icon: Bell },
  { key: 'machine'       as const, label: 'Machine',       Icon: Cpu },
  { key: 'firmware'      as const, label: 'Firmware',      Icon: Zap },
  { key: 'about'         as const, label: 'About',         Icon: BadgeInfo },
];
type TabKey = (typeof TABS)[number]['key'];

// ---------------------------------------------------------------------------
// Inline styles
// ---------------------------------------------------------------------------
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    color: COLORS.text,
    fontSize: 13,
  },
  dialog: {
    background: COLORS.panel,
    border: `1px solid ${COLORS.panelBorder}`,
    borderRadius: 10,
    width: 760,
    maxWidth: '95vw',
    height: 560,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 18px',
    borderBottom: `1px solid ${COLORS.panelBorder}`,
    flexShrink: 0,
  },
  headerTitle: { fontWeight: 600, fontSize: 15 },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: COLORS.textDim,
    cursor: 'pointer',
    padding: 4,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
  },
  main: {
    display: 'flex',
    flex: 1,
    minHeight: 0,
  },
  nav: {
    width: 180,
    borderRight: `1px solid ${COLORS.panelBorder}`,
    display: 'flex',
    flexDirection: 'column',
    padding: '8px 0',
    background: COLORS.panel,
    flexShrink: 0,
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 16px',
    background: 'none',
    border: 'none',
    color: COLORS.textDim,
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontSize: 13,
    borderLeftWidth: 3,
    borderLeftStyle: 'solid',
    borderLeftColor: 'transparent',
  },
  navItemActive: {
    color: COLORS.text,
    background: COLORS.surface,
    borderLeftColor: COLORS.accent,
    fontWeight: 600,
  },
  body: {
    flex: 1,
    padding: '16px 22px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    minWidth: 0,
  },
  pageTitle: { fontWeight: 600, fontSize: 14, marginBottom: 4 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: COLORS.textDim,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  input: {
    background: COLORS.inputBg,
    border: `1px solid ${COLORS.inputBorder}`,
    borderRadius: 6,
    color: COLORS.text,
    padding: '8px 12px',
    fontSize: 13,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  select: {
    background: COLORS.inputBg,
    border: `1px solid ${COLORS.inputBorder}`,
    borderRadius: 6,
    color: COLORS.text,
    padding: '8px 12px',
    fontSize: 13,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
    cursor: 'pointer',
  },
  hint: { fontSize: 11, color: COLORS.textDim, marginTop: 2 },
  modeSelector: {
    display: 'flex',
    borderRadius: 6,
    overflow: 'hidden',
    border: `1px solid ${COLORS.inputBorder}`,
  },
  modeBtn: {
    flex: 1,
    padding: '8px 12px',
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  banner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    borderRadius: 6,
    fontSize: 12,
  },
  bannerSuccess: { background: 'rgba(34,197,94,0.12)', color: COLORS.success },
  bannerError:   { background: 'rgba(239,68,68,0.12)', color: COLORS.danger },
  bannerInfo:    { background: 'rgba(80,120,255,0.1)', color: COLORS.accent },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: 10 },
  checkbox: { accentColor: COLORS.accent, width: 16, height: 16, cursor: 'pointer' },
  btnRow: { display: 'flex', gap: 8, flexWrap: 'wrap' as const },
  btn: {
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  btnPrimary:   { background: COLORS.accent, color: '#fff' },
  btnDanger:    { background: COLORS.danger, color: '#fff' },
  btnSecondary: { background: COLORS.surface, color: COLORS.text, border: `1px solid ${COLORS.inputBorder}` },
  btnDisabled:  { opacity: 0.5, cursor: 'not-allowed' },
  section: {
    background: COLORS.surface,
    borderRadius: 8,
    padding: '14px 16px',
    border: `1px solid ${COLORS.panelBorder}`,
  },
  sectionTitle: { fontWeight: 600, fontSize: 13, marginBottom: 10, color: COLORS.text },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '6px 12px',
    fontSize: 12,
  },
  dimText: { color: COLORS.textDim },
  mono: { fontFamily: 'monospace', fontSize: 12, fontWeight: 600 },
  aboutText: { color: COLORS.textDim, fontSize: 12, lineHeight: 1.6, margin: 0 },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    padding: '12px 18px',
    borderTop: `1px solid ${COLORS.panelBorder}`,
    flexShrink: 0,
  },
};

// ---------------------------------------------------------------------------
// Row-based setting helper
// ---------------------------------------------------------------------------
function SettingRow({
  label, hint, control,
}: { label: string; hint?: string; control: React.ReactNode }) {
  return (
    <div style={styles.formGroup}>
      <label style={styles.label}>{label}</label>
      {control}
      {hint && <span style={styles.hint}>{hint}</span>}
    </div>
  );
}

function ToggleRow({
  id, checked, onChange, label, hint,
}: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div style={styles.formGroup}>
      <div style={styles.checkboxRow}>
        <input
          type="checkbox"
          id={id}
          style={styles.checkbox}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <label htmlFor={id} style={{ cursor: 'pointer', fontSize: 13 }}>{label}</label>
      </div>
      {hint && <span style={{ ...styles.hint, marginLeft: 26 }}>{hint}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function DuetSettings() {
  const showSettings = usePrinterStore((s) => s.showSettings);
  const setShowSettings = usePrinterStore((s) => s.setShowSettings);
  const connected = usePrinterStore((s) => s.connected);
  const connecting = usePrinterStore((s) => s.connecting);
  const config = usePrinterStore((s) => s.config);
  const setConfig = usePrinterStore((s) => s.setConfig);
  const connect = usePrinterStore((s) => s.connect);
  const disconnect = usePrinterStore((s) => s.disconnect);
  const testConnection = usePrinterStore((s) => s.testConnection);
  const error = usePrinterStore((s) => s.error);
  const model = usePrinterStore((s) => s.model);
  const uploading = usePrinterStore((s) => s.uploading);
  const uploadProgress = usePrinterStore((s) => s.uploadProgress);
  const uploadFirmware = usePrinterStore((s) => s.uploadFirmware);
  const installFirmware = usePrinterStore((s) => s.installFirmware);

  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  // Load persisted prefs once per open
  const [prefs, setPrefs] = useState<DuetPrefs>(() => getDuetPrefs());
  const patchPrefs = useCallback((patch: Partial<DuetPrefs>) => {
    setPrefs(updateDuetPrefs(patch));
  }, []);

  const [tab, setTab] = useState<TabKey>('connection');

  // Firmware form state
  const [firmwareFile, setFirmwareFile] = useState<File | null>(null);
  const [firmwareStatus, setFirmwareStatus] = useState<
    { type: 'success' | 'error'; message: string } | null
  >(null);
  const firmwareInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFirmwareSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.bin') && !lower.endsWith('.uf2')) {
      setFirmwareStatus({ type: 'error', message: 'Firmware must be a .bin or .uf2 file.' });
      return;
    }
    setFirmwareStatus(null);
    setFirmwareFile(file);
  }, []);

  const handleFirmwareUpload = useCallback(async () => {
    if (!firmwareFile) return;
    setFirmwareStatus(null);
    try {
      await uploadFirmware(firmwareFile);
      setFirmwareStatus({
        type: 'success',
        message: `${firmwareFile.name} uploaded to 0:/firmware/`,
      });
    } catch (err) {
      setFirmwareStatus({
        type: 'error',
        message: (err as Error).message,
      });
    }
  }, [firmwareFile, uploadFirmware]);

  const handleFirmwareInstall = useCallback(async () => {
    const ok = confirm(
      'Send M997 to start the firmware update? The board will reboot during install — do not power off until it comes back online.',
    );
    if (!ok) return;
    await installFirmware();
  }, [installFirmware]);

  // Connection form state
  const [hostname, setHostname] = useState(config.hostname || '');
  const [password, setPassword] = useState(config.password || '');
  const [mode, setMode] = useState<'standalone' | 'sbc'>(
    (config as { mode?: 'standalone' | 'sbc' }).mode ?? 'standalone',
  );
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    firmwareVersion?: string;
    error?: string;
  } | null>(null);

  const handleTest = useCallback(async () => {
    setConfig({ hostname: hostname.trim(), password });
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection();
      setTestResult({
        success: result.success,
        firmwareVersion: result.firmwareVersion,
        error: result.error,
      });
    } catch (err) {
      setTestResult({ success: false, error: (err as Error).message });
    } finally {
      setTesting(false);
    }
  }, [hostname, password, setConfig, testConnection]);

  const handleConnect = useCallback(async () => {
    setConfig({ hostname: hostname.trim(), password });
    setTestResult(null);
    await connect();
  }, [hostname, password, setConfig, connect]);

  const handleDisconnect = useCallback(async () => {
    setTestResult(null);
    await disconnect();
  }, [disconnect]);

  const axes = model.move?.axes ?? [];
  const board = model.boards?.[0];
  const canConnect = hostname.trim().length > 0 && !connecting;

  const renderConnection = () => (
    <>
      <div style={styles.pageTitle}>Connection</div>
      {connected ? (
        <div style={{ ...styles.banner, ...styles.bannerSuccess }}>
          <Wifi size={16} /> Connected to Duet3D board at {config.hostname}
        </div>
      ) : (
        <div style={{ ...styles.banner, ...styles.bannerInfo }}>
          <Info size={16} /> Connect to your Duet3D board via its REST API
        </div>
      )}

      <SettingRow
        label="Hostname / IP Address"
        hint="Enter the IP address or hostname of your Duet3D board (without http://)"
        control={
          <input
            style={styles.input}
            type="text"
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
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
            style={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          <div style={styles.modeSelector}>
            <button
              style={{
                ...styles.modeBtn,
                background: mode === 'standalone' ? COLORS.accent : COLORS.inputBg,
                color: mode === 'standalone' ? '#fff' : COLORS.textDim,
              }}
              onClick={() => setMode('standalone')}
              disabled={connected}
            >
              Standalone
            </button>
            <button
              style={{
                ...styles.modeBtn,
                background: mode === 'sbc' ? COLORS.accent : COLORS.inputBg,
                color: mode === 'sbc' ? '#fff' : COLORS.textDim,
              }}
              onClick={() => setMode('sbc')}
              disabled={connected}
            >
              SBC (Raspberry Pi)
            </button>
          </div>
        }
      />

      <div style={styles.btnRow}>
        <button
          style={{
            ...styles.btn,
            ...styles.btnSecondary,
            ...(testing || connected ? styles.btnDisabled : {}),
          }}
          onClick={handleTest}
          disabled={testing || connected || !hostname.trim()}
        >
          {testing ? (<><Loader2 size={14} className="spin" /> Testing...</>) : 'Test Connection'}
        </button>

        {connected ? (
          <button style={{ ...styles.btn, ...styles.btnDanger }} onClick={handleDisconnect}>
            <WifiOff size={14} /> Disconnect
          </button>
        ) : (
          <button
            style={{ ...styles.btn, ...styles.btnPrimary, ...(!canConnect ? styles.btnDisabled : {}) }}
            onClick={handleConnect}
            disabled={!canConnect}
          >
            {connecting ? (<><Loader2 size={14} className="spin" /> Connecting...</>) : (<><Wifi size={14} /> Connect</>)}
          </button>
        )}
      </div>

      {testResult && (
        <div style={{ ...styles.banner, ...(testResult.success ? styles.bannerSuccess : styles.bannerError) }}>
          {testResult.success ? (
            <>
              <CheckCircle size={16} />
              <div>
                <div style={{ fontWeight: 600 }}>Connection successful</div>
                {testResult.firmwareVersion && (
                  <div style={{ marginTop: 2, opacity: 0.85 }}>Firmware: {testResult.firmwareVersion}</div>
                )}
              </div>
            </>
          ) : (
            <>
              <AlertCircle size={16} />
              <div>
                <div style={{ fontWeight: 600 }}>Connection failed</div>
                {testResult.error && <div style={{ marginTop: 2, opacity: 0.85 }}>{testResult.error}</div>}
              </div>
            </>
          )}
        </div>
      )}

      {error && !testResult && (
        <div style={{ ...styles.banner, ...styles.bannerError }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
    </>
  );

  const renderGeneral = () => (
    <>
      <div style={styles.pageTitle}>General</div>
      <SettingRow
        label="Units"
        hint="Preferred unit system for display. Individual panels may override."
        control={
          <select
            style={styles.select}
            value={prefs.units}
            onChange={(e) => patchPrefs({ units: e.target.value as Units })}
          >
            <option value="metric">Metric (mm)</option>
            <option value="imperial">Imperial (in)</option>
          </select>
        }
      />
      <SettingRow
        label="Language"
        hint="Additional languages are planned — English only today."
        control={
          <select style={styles.select} value="en" disabled>
            <option value="en">English</option>
          </select>
        }
      />
    </>
  );

  const renderAppearance = () => (
    <>
      <div style={styles.pageTitle}>Appearance</div>
      <SettingRow
        label="Theme"
        hint="Switch between light and dark themes. Applies immediately."
        control={
          <div style={styles.modeSelector}>
            {(['light', 'dark'] as ThemeMode[]).map((t) => {
              const active = theme === t;
              return (
                <button
                  key={t}
                  style={{
                    ...styles.modeBtn,
                    background: active ? COLORS.accent : COLORS.inputBg,
                    color: active ? '#fff' : COLORS.textDim,
                    textTransform: 'capitalize',
                  }}
                  onClick={() => setTheme(t)}
                >
                  {t === 'light' ? <Sun size={14} /> : <Moon size={14} />}
                  {t}
                </button>
              );
            })}
          </div>
        }
      />
    </>
  );

  const renderBehaviour = () => (
    <>
      <div style={styles.pageTitle}>Behaviour</div>
      <ToggleRow
        id="confirm-tool-change"
        checked={prefs.confirmToolChange}
        onChange={(v) => patchPrefs({ confirmToolChange: v })}
        label="Confirm tool changes"
        hint="Ask for confirmation before switching the active tool (T command)."
      />
      <ToggleRow
        id="silent-prompts"
        checked={prefs.silentPrompts}
        onChange={(v) => patchPrefs({ silentPrompts: v })}
        label="Silent prompts"
        hint="Suppress beeps for routine M291 message box dialogs."
      />
      <ToggleRow
        id="auto-reconnect"
        checked={prefs.autoReconnect}
        onChange={(v) => patchPrefs({ autoReconnect: v })}
        label="Auto-reconnect on startup"
        hint="Attempt to reconnect to the last-used Duet board when Dzign3D loads."
      />
    </>
  );

  const renderNotifications = () => (
    <>
      <div style={styles.pageTitle}>Notifications</div>
      <SettingRow
        label="Toast Duration"
        hint="How long notification toasts stay visible before auto-dismissing."
        control={
          <select
            style={styles.select}
            value={prefs.toastDurationMs}
            onChange={(e) => patchPrefs({ toastDurationMs: Number(e.target.value) })}
          >
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
        onChange={(v) => patchPrefs({ notificationsSound: v })}
        label="Play sound on beep events"
        hint="Trigger a short tone when the firmware emits an M300 beep."
      />
      <SettingRow
        label="Minimum Severity"
        hint="Only show toasts at or above this severity level."
        control={
          <select
            style={styles.select}
            value={prefs.notifMinSeverity}
            onChange={(e) => patchPrefs({ notifMinSeverity: e.target.value as NotifSeverity })}
          >
            <option value="info">Info and above</option>
            <option value="warning">Warning and above</option>
            <option value="error">Errors only</option>
          </select>
        }
      />
    </>
  );

  const renderMachine = () => (
    <>
      <div style={styles.pageTitle}>Machine</div>
      {!connected && (
        <div style={{ ...styles.banner, ...styles.bannerInfo }}>
          <Info size={16} /> Connect to a Duet board to see live machine details.
        </div>
      )}

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Axis Limits (read-only)</div>
        {axes.length === 0 ? (
          <div style={styles.dimText}>No axes reported.</div>
        ) : (
          <div style={styles.infoGrid}>
            {axes.map((a, i) => (
              <React.Fragment key={i}>
                <span>{a.letter ?? `#${i}`}</span>
                <span style={styles.mono}>
                  {a.min?.toFixed(1) ?? '—'} → {a.max?.toFixed(1) ?? '—'} mm
                </span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Motion Limits</div>
        {axes.length === 0 ? (
          <div style={styles.dimText}>No drivers reported.</div>
        ) : (
          <div style={styles.infoGrid}>
            {axes.map((a, i) => (
              <React.Fragment key={i}>
                <span>{a.letter ?? `#${i}`} max speed</span>
                <span style={styles.mono}>{a.speed?.toFixed(0) ?? '—'} mm/s</span>
                <span>{a.letter ?? `#${i}`} acceleration</span>
                <span style={styles.mono}>{a.acceleration?.toFixed(0) ?? '—'} mm/s²</span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Board Info</div>
        {!board ? (
          <div style={styles.dimText}>No board info reported.</div>
        ) : (
          <div style={styles.infoGrid}>
            <span style={styles.dimText}>Name</span>
            <span style={styles.mono}>{board.name ?? board.shortName ?? '—'}</span>
            <span style={styles.dimText}>Firmware</span>
            <span style={styles.mono}>{board.firmwareName} {board.firmwareVersion}</span>
            {board.mcuTemp?.current !== undefined && (
              <>
                <span style={styles.dimText}>MCU temp</span>
                <span style={styles.mono}>{board.mcuTemp.current.toFixed(1)}°</span>
              </>
            )}
            {board.vIn?.current !== undefined && (
              <>
                <span style={styles.dimText}>VIN</span>
                <span style={styles.mono}>{board.vIn.current.toFixed(1)} V</span>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );

  const renderFirmware = () => (
    <>
      <div style={styles.pageTitle}>Firmware</div>

      {!connected && (
        <div style={{ ...styles.banner, ...styles.bannerInfo }}>
          <Info size={16} /> Connect to a Duet board to upload firmware.
        </div>
      )}

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Current Firmware</div>
        {board ? (
          <div style={styles.infoGrid}>
            <span style={styles.dimText}>Board</span>
            <span style={styles.mono}>{board.name ?? board.shortName ?? '—'}</span>
            <span style={styles.dimText}>Firmware</span>
            <span style={styles.mono}>{board.firmwareName} {board.firmwareVersion}</span>
            {board.firmwareDate && (
              <>
                <span style={styles.dimText}>Build date</span>
                <span style={styles.mono}>{board.firmwareDate}</span>
              </>
            )}
          </div>
        ) : (
          <div style={styles.dimText}>Not connected.</div>
        )}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Upload Firmware</div>
        <p style={{ ...styles.aboutText, marginBottom: 10 }}>
          Select a RepRapFirmware <code style={{ color: COLORS.accent }}>.bin</code> or{' '}
          <code style={{ color: COLORS.accent }}>.uf2</code> file. It will be uploaded to{' '}
          <code style={{ color: COLORS.accent }}>0:/firmware/</code> on the board.
        </p>

        <input
          ref={firmwareInputRef}
          type="file"
          accept=".bin,.uf2"
          style={{ display: 'none' }}
          onChange={(e) => handleFirmwareSelect(e.target.files)}
        />

        <div style={styles.btnRow}>
          <button
            style={{
              ...styles.btn,
              ...styles.btnSecondary,
              ...(!connected || uploading ? styles.btnDisabled : {}),
            }}
            onClick={() => firmwareInputRef.current?.click()}
            disabled={!connected || uploading}
          >
            <UploadCloud size={14} /> Choose File
          </button>
          <button
            style={{
              ...styles.btn,
              ...styles.btnPrimary,
              ...(!firmwareFile || uploading || !connected ? styles.btnDisabled : {}),
            }}
            onClick={handleFirmwareUpload}
            disabled={!firmwareFile || uploading || !connected}
          >
            {uploading ? (
              <><Loader2 size={14} className="spin" /> Uploading {uploadProgress}%</>
            ) : (
              'Upload'
            )}
          </button>
          <button
            style={{
              ...styles.btn,
              ...styles.btnDanger,
              ...(!connected ? styles.btnDisabled : {}),
            }}
            onClick={handleFirmwareInstall}
            disabled={!connected}
          >
            <Zap size={14} /> Install (M997)
          </button>
        </div>

        {firmwareFile && !uploading && (
          <div style={{ ...styles.hint, marginTop: 8 }}>
            Selected: <span style={styles.mono}>{firmwareFile.name}</span>{' '}
            ({(firmwareFile.size / 1024).toFixed(1)} KB)
          </div>
        )}

        {uploading && (
          <div style={{ marginTop: 10 }}>
            <div
              style={{
                width: '100%',
                height: 6,
                background: COLORS.inputBg,
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  background: COLORS.accent,
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        )}

        {firmwareStatus && (
          <div
            style={{
              ...styles.banner,
              ...(firmwareStatus.type === 'success' ? styles.bannerSuccess : styles.bannerError),
              marginTop: 10,
            }}
          >
            {firmwareStatus.type === 'success' ? (
              <CheckCircle size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            <span>{firmwareStatus.message}</span>
          </div>
        )}
      </div>
    </>
  );

  const renderAbout = () => (
    <>
      <div style={styles.pageTitle}>About</div>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Dzign3D — Printer Panel</div>
        <p style={styles.aboutText}>
          Communicates with Duet3D boards (Duet 2, Duet 3, and compatible) using the
          RepRapFirmware REST API. Compatible with RepRapFirmware 3.x and the DuetWebControl
          3.x protocol. Both standalone and SBC (DuetSoftwareFramework) modes are supported.
        </p>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Firmware</div>
        {board ? (
          <div style={styles.infoGrid}>
            <span style={styles.dimText}>Board</span>
            <span style={styles.mono}>{board.name ?? board.shortName ?? '—'}</span>
            <span style={styles.dimText}>Firmware</span>
            <span style={styles.mono}>{board.firmwareName} {board.firmwareVersion}</span>
            {board.firmwareDate && (
              <>
                <span style={styles.dimText}>Build date</span>
                <span style={styles.mono}>{board.firmwareDate}</span>
              </>
            )}
          </div>
        ) : (
          <div style={styles.dimText}>Not connected.</div>
        )}
      </div>
    </>
  );

  const pageContent = useMemo(() => {
    switch (tab) {
      case 'connection':    return renderConnection();
      case 'general':       return renderGeneral();
      case 'appearance':    return renderAppearance();
      case 'behaviour':     return renderBehaviour();
      case 'notifications': return renderNotifications();
      case 'machine':       return renderMachine();
      case 'firmware':      return renderFirmware();
      case 'about':         return renderAbout();
      default:              return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, prefs, theme, hostname, password, mode, testing, testResult, error, connected, connecting, axes, board, firmwareFile, firmwareStatus, uploading, uploadProgress]);

  if (!showSettings) return null;

  return (
    <div style={styles.overlay} onClick={() => setShowSettings(false)}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        {/* ---- Header ---- */}
        <div style={styles.header}>
          <span style={styles.headerTitle}>Duet3D Settings</span>
          <button
            style={styles.closeBtn}
            onClick={() => setShowSettings(false)}
            title="Close"
            onMouseEnter={(e) => (e.currentTarget.style.color = COLORS.text)}
            onMouseLeave={(e) => (e.currentTarget.style.color = COLORS.textDim)}
          >
            <X size={18} />
          </button>
        </div>

        {/* ---- Main (nav + body) ---- */}
        <div style={styles.main}>
          <nav style={styles.nav}>
            {TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                style={{
                  ...styles.navItem,
                  ...(tab === key ? styles.navItemActive : {}),
                }}
                onClick={() => setTab(key)}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>
          <div style={styles.body}>{pageContent}</div>
        </div>

        {/* ---- Footer ---- */}
        <div style={styles.footer}>
          <button
            style={{ ...styles.btn, ...styles.btnSecondary }}
            onClick={() => setShowSettings(false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

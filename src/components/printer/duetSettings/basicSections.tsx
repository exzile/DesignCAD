import {
  AlertCircle,
  Camera,
  CheckCircle,
  Info,
  Loader2,
  Save,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  DateFormat,
  DuetPrefs,
  NotifSeverity,
  CameraPathPreset,
  CameraSourceType,
  TemperatureUnit,
  Units,
} from '../../../utils/duetPrefs';
import type { PrinterBoardType } from '../../../types/duet';
import { cameraDisplayUrl, normalizeCameraStreamUrl } from '../../../utils/cameraStreamUrl';
import { SettingRow, ToggleRow } from './common';

interface TestResultState {
  success: boolean;
  firmwareVersion?: string;
  error?: string;
}

const BOARD_TYPE_OPTIONS: { value: PrinterBoardType; label: string; hint: string }[] = [
  { value: 'duet', label: 'Duet (RRF)', hint: 'Duet 2/3 boards running RepRapFirmware' },
  { value: 'klipper', label: 'Klipper', hint: 'Klipper firmware via Moonraker API' },
  { value: 'marlin', label: 'Marlin', hint: 'Marlin firmware via OctoPrint or direct serial' },
  { value: 'smoothie', label: 'Smoothieware', hint: 'Smoothieboard / LPC-based boards' },
  { value: 'grbl', label: 'grbl', hint: 'grbl-based motion controllers' },
  { value: 'repetier', label: 'Repetier', hint: 'Repetier-Firmware via Repetier-Server' },
  { value: 'other', label: 'Other', hint: 'Generic G-code printer' },
];

interface ConnectionSectionProps {
  boardType: PrinterBoardType;
  canConnect: boolean;
  config: { hostname: string };
  connected: boolean;
  connecting: boolean;
  error: string | null;
  handleConnect: () => void;
  handleDisconnect: () => void;
  handleTest: () => void;
  hostname: string;
  mode: 'standalone' | 'sbc';
  password: string;
  prefs: DuetPrefs;
  patchPrefs: (patch: Partial<DuetPrefs>) => void;
  setBoardType: (value: PrinterBoardType) => void;
  setHostname: (value: string) => void;
  setMode: (value: 'standalone' | 'sbc') => void;
  setPassword: (value: string) => void;
  testResult: TestResultState | null;
  testing: boolean;
}

export function ConnectionSection({
  boardType,
  canConnect,
  config,
  connected,
  connecting,
  error,
  handleConnect,
  handleDisconnect,
  handleTest,
  hostname,
  mode,
  password,
  prefs,
  patchPrefs,
  setBoardType,
  setHostname,
  setMode,
  setPassword,
  testResult,
  testing,
}: ConnectionSectionProps) {
  const isDuet = boardType === 'duet';
  return (
    <>
      <div className="duet-settings__page-title">Connection</div>

      <SettingRow
        label="Board Type"
        hint={BOARD_TYPE_OPTIONS.find((o) => o.value === boardType)?.hint ?? ''}
        control={
          <div className="duet-settings__mode-selector">
            {BOARD_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`duet-settings__mode-btn${boardType === opt.value ? ' is-active' : ''}`}
                onClick={() => setBoardType(opt.value)}
                disabled={connected}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
      />

      {connected ? (
        <div className="duet-settings__banner duet-settings__banner--success">
          <Wifi size={16} /> Connected to {BOARD_TYPE_OPTIONS.find((o) => o.value === boardType)?.label ?? 'printer'} at {config.hostname}
        </div>
      ) : (
        <div className="duet-settings__banner duet-settings__banner--info">
          <Info size={16} /> {isDuet ? 'Connect to your Duet3D board via its REST API' : `Connect to your ${BOARD_TYPE_OPTIONS.find((o) => o.value === boardType)?.label ?? 'printer'}`}
        </div>
      )}

      <SettingRow
        label="Hostname / IP Address"
        hint={isDuet ? 'Enter the IP address or hostname of your Duet3D board (without http://)' : 'Enter the IP address or hostname of your printer (without http://)'}
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
        hint={isDuet ? 'Only required if your board has a password set in config.g (M551)' : 'Only required if your printer interface is password-protected'}
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

      {isDuet && (
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
      )}

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

type CameraTestState =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'success'; url: string }
  | { status: 'error'; url: string; message: string };

function withCacheBuster(url: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}_test=${Date.now()}`;
}

function cameraBaseUrl(address: string, fallbackHostname: string): string {
  const trimmed = (address.trim() || fallbackHostname.trim());
  if (trimmed) return normalizeCameraStreamUrl(trimmed);
  return '';
}

function cameraAddressFromStreamUrl(streamUrl: string): string {
  const normalized = normalizeCameraStreamUrl(streamUrl);
  if (!normalized) return '';
  try {
    const parsed = new URL(normalized);
    return parsed.origin;
  } catch {
    return '';
  }
}

function cameraOriginFromAddress(address: string, fallbackHostname: string): string {
  return cameraBaseUrl(address, fallbackHostname).replace(/\/+$/, '');
}

function cameraRtspHost(address: string, fallbackHostname: string): string {
  const origin = cameraOriginFromAddress(address, fallbackHostname);
  if (!origin) return '';
  try {
    const parsed = new URL(origin);
    return parsed.host;
  } catch {
    return origin.replace(/^https?:\/\//i, '');
  }
}

function amcrestSubStreamUrl(address: string, fallbackHostname: string): string {
  const base = cameraOriginFromAddress(address, fallbackHostname);
  return base ? `${base}/cgi-bin/mjpg/video.cgi?channel=1&subtype=1` : '';
}

function amcrestMainStreamUrl(address: string, fallbackHostname: string): string {
  const host = cameraRtspHost(address, fallbackHostname);
  return host ? `rtsp://${host}:554/cam/realmonitor?channel=1&subtype=0` : '';
}

function cameraStreamCandidates(address: string, streamUrl: string, fallbackHostname: string, pathPreset: CameraPathPreset): string[] {
  const explicit = streamUrl.trim();
  if (explicit) return [normalizeCameraStreamUrl(explicit)];

  const base = cameraBaseUrl(address, fallbackHostname).replace(/\/+$/, '');
  if (!base) return [];

  const genericCandidates = [
    `${base}/webcam/?action=stream`,
    `${base}/video.cgi`,
    `${base}/mjpg/video.mjpg`,
    `${base}/videostream.cgi`,
    `${base}/stream`,
    `${base}/video`,
  ];

  if (pathPreset !== 'amcrest') return genericCandidates;

  return [
    `${base}/cgi-bin/mjpg/video.cgi?channel=1&subtype=1`,
    `${base}/cgi-bin/mjpg/video.cgi?channel=1&subtype=0`,
    `${base}/cgi-bin/snapshot.cgi?channel=1`,
    `${base}/cgi-bin/snapshot.cgi`,
    ...genericCandidates,
  ];
}

function cameraTestDisplayUrl(url: string): string {
  if (!url.startsWith('/camera-proxy')) return url;
  try {
    const parsed = new URL(url, window.location.origin);
    const target = parsed.searchParams.get('url');
    return target ?? 'Camera proxy stream';
  } catch {
    return 'Camera proxy stream';
  }
}

async function probeCameraStreamUrl(url: string, timeoutMs = 4500): Promise<void> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (
      contentType.includes('multipart/x-mixed-replace') ||
      contentType.startsWith('image/') ||
      contentType.includes('octet-stream')
    ) {
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error(contentType ? `Unexpected content type: ${contentType}` : 'No stream data returned.');
    }
    const { value } = await reader.read();
    reader.releaseLock();
    if (!value || value.byteLength === 0) {
      throw new Error('No camera bytes returned.');
    }
    const header = new TextDecoder().decode(value.slice(0, Math.min(value.byteLength, 128))).toLowerCase();
    if (header.includes('--') || header.includes('content-type: image/') || value[0] === 0xff || value[0] === 0x89) {
      return;
    }
    throw new Error(contentType ? `Unexpected content type: ${contentType}` : 'Response was not an image or MJPEG stream.');
  } finally {
    window.clearTimeout(timeout);
  }
}

export function CameraSection({
  hostname,
  patchPrefs,
  prefs,
}: {
  hostname: string;
  patchPrefs: (patch: Partial<DuetPrefs>) => void;
  prefs: DuetPrefs;
}) {
  const savedCameraAddress = prefs.webcamHost || cameraAddressFromStreamUrl(prefs.webcamUrl);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [draftAddress, setDraftAddress] = useState(savedCameraAddress);
  const [draftSourceType, setDraftSourceType] = useState<CameraSourceType>(prefs.webcamSourceType ?? 'network');
  const [draftStreamUrl, setDraftStreamUrl] = useState(prefs.webcamUrl);
  const [draftMainStreamUrl, setDraftMainStreamUrl] = useState(prefs.webcamMainStreamUrl);
  const [draftUsbDeviceId, setDraftUsbDeviceId] = useState(prefs.webcamUsbDeviceId ?? '');
  const [draftUsbDeviceLabel, setDraftUsbDeviceLabel] = useState(prefs.webcamUsbDeviceLabel ?? '');
  const [draftServerUsbDevice, setDraftServerUsbDevice] = useState(prefs.webcamServerUsbDevice ?? '');
  const [draftStreamPreference, setDraftStreamPreference] = useState(prefs.webcamStreamPreference);
  const [draftMainStreamProtocol, setDraftMainStreamProtocol] = useState(prefs.webcamMainStreamProtocol);
  const [draftRtspTransport, setDraftRtspTransport] = useState(prefs.webcamRtspTransport);
  const [draftPathPreset, setDraftPathPreset] = useState<CameraPathPreset>(prefs.webcamPathPreset ?? 'generic');
  const [draftUsername, setDraftUsername] = useState(prefs.webcamUsername);
  const [draftPassword, setDraftPassword] = useState(prefs.webcamPassword);
  const [testState, setTestState] = useState<CameraTestState>({ status: 'idle' });
  const [saved, setSaved] = useState(false);

  const resolvedUrl = useMemo(() => normalizeCameraStreamUrl(draftStreamUrl), [draftStreamUrl]);
  const authenticatedUrl = useMemo(
    () => cameraDisplayUrl(resolvedUrl, draftUsername, draftPassword),
    [draftPassword, draftUsername, resolvedUrl],
  );
  const hasUnsavedChanges =
    draftSourceType !== (prefs.webcamSourceType ?? 'network') ||
    draftAddress !== savedCameraAddress ||
    draftStreamUrl !== prefs.webcamUrl ||
    draftMainStreamUrl !== prefs.webcamMainStreamUrl ||
    draftUsbDeviceId !== (prefs.webcamUsbDeviceId ?? '') ||
    draftUsbDeviceLabel !== (prefs.webcamUsbDeviceLabel ?? '') ||
    draftServerUsbDevice !== (prefs.webcamServerUsbDevice ?? '') ||
    draftStreamPreference !== prefs.webcamStreamPreference ||
    draftMainStreamProtocol !== prefs.webcamMainStreamProtocol ||
    draftRtspTransport !== prefs.webcamRtspTransport ||
    draftPathPreset !== (prefs.webcamPathPreset ?? 'generic') ||
    draftUsername !== prefs.webcamUsername ||
    draftPassword !== prefs.webcamPassword;

  const fillAmcrestDefaults = () => {
    const subUrl = amcrestSubStreamUrl(draftAddress, hostname);
    const mainUrl = amcrestMainStreamUrl(draftAddress, hostname);
    if (subUrl) setDraftStreamUrl(subUrl);
    if (mainUrl) setDraftMainStreamUrl(mainUrl);
    setDraftMainStreamProtocol('rtsp');
    setDraftRtspTransport('tcp');
    setDraftPathPreset('amcrest');
    setSaved(false);
    setTestState({ status: 'idle' });
  };

  const loadBrowserUsbDevices = () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setTestState({ status: 'error', url: '', message: 'This browser cannot list USB cameras.' });
      return;
    }
    void navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then((stream) => {
        stream.getTracks().forEach((track) => track.stop());
        return navigator.mediaDevices.enumerateDevices();
      })
      .then((devices) => {
        const cameras = devices.filter((device) => device.kind === 'videoinput');
        setVideoDevices(cameras);
        if (!draftUsbDeviceId && cameras[0]) {
          setDraftUsbDeviceId(cameras[0].deviceId);
          setDraftUsbDeviceLabel(cameras[0].label);
          setSaved(false);
        }
        setTestState(cameras.length
          ? { status: 'idle' }
          : { status: 'error', url: '', message: 'No USB cameras were found by this browser.' });
      })
      .catch(() => {
        setTestState({ status: 'error', url: '', message: 'Browser camera permission is required to list USB cameras.' });
      });
  };

  const handleTestCamera = () => {
    const candidateUrls = cameraStreamCandidates(draftAddress, draftStreamUrl, hostname, draftPathPreset);
    if (candidateUrls.length === 0) {
      setTestState({
        status: 'error',
        url: '',
        message: 'Enter a camera IP/address or a stream URL.',
      });
      return;
    }

    setTestState({ status: 'testing' });

    const attempts = candidateUrls.flatMap((sourceUrl) => {
      const displayUrl = cameraDisplayUrl(sourceUrl, draftUsername, draftPassword);
      return [
        { sourceUrl, testUrl: sourceUrl },
        { sourceUrl, testUrl: displayUrl },
        { sourceUrl, testUrl: withCacheBuster(sourceUrl) },
        { sourceUrl, testUrl: withCacheBuster(displayUrl) },
      ];
    }).filter((attempt, index, all) => (
      attempt.testUrl && all.findIndex((item) => item.testUrl === attempt.testUrl) === index
    ));

    let index = 0;
    let lastError = 'The camera URL did not return a loadable image or MJPEG stream.';

    const tryCandidate = async () => {
      const candidate = attempts[index];
      try {
        await probeCameraStreamUrl(candidate.testUrl);
        setDraftStreamUrl(candidate.sourceUrl);
        setSaved(false);
        setTestState({ status: 'success', url: candidate.testUrl });
      } catch (error) {
        lastError = error instanceof Error && error.name === 'AbortError'
          ? 'Camera did not respond before the test timed out.'
          : 'The camera URL did not return a loadable image or MJPEG stream.';
        index += 1;
        if (index < attempts.length) {
          void tryCandidate();
          return;
        }
        setTestState({ status: 'error', url: candidateUrls[0], message: lastError });
      }
    };

    if (attempts.length === 0) {
      setTestState({
        status: 'error',
        url: '',
        message: 'Enter a camera IP/address or a stream URL.',
      });
      return;
    }

    void tryCandidate();
  };

  const handleSaveCamera = () => {
    const savedUrl = draftStreamUrl.trim() ? resolvedUrl : '';
    setDraftStreamUrl(savedUrl);
    patchPrefs({
      webcamSourceType: draftSourceType,
      webcamHost: draftAddress.trim(),
      webcamUrl: savedUrl,
      webcamMainStreamUrl: draftMainStreamUrl.trim(),
      webcamUsbDeviceId: draftUsbDeviceId,
      webcamUsbDeviceLabel: draftUsbDeviceLabel,
      webcamServerUsbDevice: draftServerUsbDevice.trim(),
      webcamStreamPreference: draftStreamPreference,
      webcamMainStreamProtocol: draftMainStreamProtocol,
      webcamRtspTransport: draftRtspTransport,
      webcamPathPreset: draftPathPreset,
      webcamUsername: draftUsername.trim(),
      webcamPassword: draftPassword,
    });
    setSaved(true);
  };

  return (
    <>
      <div className="duet-settings__page-title">Camera</div>
      <div className="duet-settings__banner duet-settings__banner--info">
        <Camera size={16} /> Configure a network camera, browser USB camera, or server USB camera for this printer.
      </div>

      <SettingRow
        label="Camera Source"
        hint="Network cameras use URLs. Browser USB uses a camera attached to the computer viewing the app. Server USB uses a camera attached to the Orange Pi/server."
        control={
          <select
            className="duet-settings__select"
            value={draftSourceType}
            onChange={(event) => {
              setDraftSourceType(event.target.value as CameraSourceType);
              setSaved(false);
              setTestState({ status: 'idle' });
            }}
          >
            <option value="network">Network camera</option>
            <option value="browser-usb">Browser USB camera</option>
            <option value="server-usb">Server USB camera</option>
          </select>
        }
      />

      {draftSourceType === 'browser-usb' && (
        <>
          <SettingRow
            label="Browser USB Camera"
            hint="This uses the USB camera available to the browser. The browser may ask for camera permission."
            control={
              <select
                className="duet-settings__select"
                value={draftUsbDeviceId}
                onChange={(event) => {
                  const device = videoDevices.find((item) => item.deviceId === event.target.value);
                  setDraftUsbDeviceId(event.target.value);
                  setDraftUsbDeviceLabel(device?.label ?? '');
                  setSaved(false);
                }}
              >
                <option value="">Default browser camera</option>
                {videoDevices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>{device.label || `USB camera ${index + 1}`}</option>
                ))}
              </select>
            }
          />
          <div className="duet-settings__btn-row">
            <button className="duet-settings__btn duet-settings__btn--secondary" onClick={loadBrowserUsbDevices}>
              <Camera size={14} /> Find Browser Cameras
            </button>
          </div>
        </>
      )}

      {draftSourceType === 'server-usb' && (
        <SettingRow
          label="Server USB Device"
          hint="For Orange Pi/Linux use paths like /dev/video0. On Windows dev, use a DirectShow camera name such as Integrated Camera."
          control={
            <input
              className="duet-settings__input"
              type="text"
              value={draftServerUsbDevice}
              onChange={(event) => {
                setDraftServerUsbDevice(event.target.value);
                setSaved(false);
              }}
              placeholder="/dev/video0"
            />
          }
        />
      )}

      <SettingRow
        label="Camera Address / IP"
        hint="Enter the camera IP, hostname, or base URL. Generic cameras use the URLs you enter; presets can fill vendor-specific paths."
        control={
          <input
            className="duet-settings__input"
            type="text"
            value={draftAddress}
            onChange={(event) => {
              setDraftAddress(event.target.value);
              setSaved(false);
              setTestState({ status: 'idle' });
            }}
            placeholder="e.g. 192.168.1.55"
          />
        }
      />

      <div className="duet-settings__btn-row">
        <button className="duet-settings__btn duet-settings__btn--secondary" onClick={fillAmcrestDefaults}>
          <Camera size={14} /> Fill Amcrest Defaults
        </button>
      </div>

      <SettingRow
        label="Camera Path Preset"
        hint="Generic keeps the app camera-brand neutral. Pick Amcrest only when you want its default stream paths and PTZ endpoint."
        control={
          <select
            className="duet-settings__select"
            value={draftPathPreset}
            onChange={(event) => {
              setDraftPathPreset(event.target.value as CameraPathPreset);
              setSaved(false);
              setTestState({ status: 'idle' });
            }}
          >
            <option value="generic">Generic / custom URLs</option>
            <option value="amcrest">Amcrest / Dahua-compatible paths</option>
          </select>
        }
      />

      <SettingRow
        label="Preferred Stream"
        hint="Use the MJPEG sub stream for dashboard previews. Select main stream when you also configure an H.264 viewer/bridge."
        control={
          <select
            className="duet-settings__select"
            value={draftStreamPreference}
            onChange={(event) => {
              setDraftStreamPreference(event.target.value as DuetPrefs['webcamStreamPreference']);
              setSaved(false);
            }}
          >
            <option value="sub">Sub stream - MJPEG preview</option>
            <option value="main">Main stream - H.264 high quality</option>
          </select>
        }
      />

      <SettingRow
        label="Sub Stream URL"
        hint="The exact MJPEG/snapshot stream. Leave blank and Test Connection will fill this when it finds a working path."
        control={
          <input
            className="duet-settings__input"
            type="text"
            value={draftStreamUrl}
            onChange={(event) => {
              setDraftStreamUrl(event.target.value);
              setSaved(false);
              setTestState({ status: 'idle' });
            }}
            placeholder="e.g. http://192.168.1.55/cgi-bin/mjpg/video.cgi?channel=1&subtype=1"
          />
        }
      />

      <SettingRow
        label="Main Stream Protocol"
        hint="Use RTSP for camera main streams, or HLS/HTTP when a camera or bridge provides browser-compatible video."
        control={
          <select
            className="duet-settings__select"
            value={draftMainStreamProtocol}
            onChange={(event) => {
              setDraftMainStreamProtocol(event.target.value as DuetPrefs['webcamMainStreamProtocol']);
              setSaved(false);
            }}
          >
            <option value="rtsp">RTSP / H.264</option>
            <option value="hls">HLS / browser video</option>
            <option value="http">HTTP stream</option>
          </select>
        }
      />

      <SettingRow
        label="Main Stream URL"
        hint="High-quality stream URL for this camera. RTSP can be bridged to HLS by the app for the Camera page."
        control={
          <input
            className="duet-settings__input"
            type="text"
            value={draftMainStreamUrl}
            onChange={(event) => {
              setDraftMainStreamUrl(event.target.value);
              setSaved(false);
            }}
            placeholder="e.g. rtsp://192.168.1.55:554/cam/realmonitor?channel=1&subtype=0"
          />
        }
      />

      {draftMainStreamProtocol === 'rtsp' && (
        <SettingRow
          label="RTSP Transport"
          hint="TCP is usually more reliable on Wi-Fi. UDP can be lower latency on stable wired networks."
          control={
            <select
              className="duet-settings__select"
              value={draftRtspTransport}
              onChange={(event) => {
                setDraftRtspTransport(event.target.value as DuetPrefs['webcamRtspTransport']);
                setSaved(false);
              }}
            >
              <option value="tcp">TCP</option>
              <option value="udp">UDP</option>
            </select>
          }
        />
      )}

      {draftStreamPreference === 'main' && draftMainStreamProtocol === 'rtsp' && (
        <div className="duet-settings__banner duet-settings__banner--info">
          <Info size={16} /> Browsers cannot play RTSP/H.264 directly. The MJPEG sub stream remains the dashboard preview until an RTSP bridge is configured.
        </div>
      )}

      <SettingRow
        label="Camera Username"
        hint="Optional. Use this for cameras that require HTTP basic authentication."
        control={
          <input
            className="duet-settings__input"
            type="text"
            value={draftUsername}
            onChange={(event) => {
              setDraftUsername(event.target.value);
              setSaved(false);
              setTestState({ status: 'idle' });
            }}
            placeholder="Camera username"
            autoComplete="off"
          />
        }
      />

      <SettingRow
        label="Camera Password"
        hint="Optional. Stored with this printer's local preferences."
        control={
          <input
            className="duet-settings__input"
            type="password"
            value={draftPassword}
            onChange={(event) => {
              setDraftPassword(event.target.value);
              setSaved(false);
              setTestState({ status: 'idle' });
            }}
            placeholder="Camera password"
            autoComplete="new-password"
          />
        }
      />

      {resolvedUrl && (
        <div className="duet-settings__camera-preview" aria-label="Camera preview">
          <img src={authenticatedUrl} alt="Camera stream preview" />
        </div>
      )}

      <div className="duet-settings__btn-row">
        <button
          className={`duet-settings__btn duet-settings__btn--secondary${testState.status === 'testing' ? ' duet-settings__btn--disabled' : ''}`}
          onClick={handleTestCamera}
          disabled={testState.status === 'testing'}
        >
          {testState.status === 'testing' ? (
            <>
              <Loader2 size={14} className="spin" /> Testing...
            </>
          ) : (
            <>
              <Camera size={14} /> Test Connection
            </>
          )}
        </button>
        <button
          className={`duet-settings__btn duet-settings__btn--primary${!hasUnsavedChanges ? ' duet-settings__btn--disabled' : ''}`}
          onClick={handleSaveCamera}
          disabled={!hasUnsavedChanges}
        >
          <Save size={14} /> Save Camera Settings
        </button>
      </div>

      {testState.status === 'success' && (
        <div className="duet-settings__banner duet-settings__banner--success">
          <CheckCircle size={16} />
          <div>
            <div className="duet-settings__banner-heading">Camera connected</div>
            <div className="duet-settings__banner-detail">{cameraTestDisplayUrl(testState.url)}</div>
          </div>
        </div>
      )}
      {testState.status === 'error' && (
        <div className="duet-settings__banner duet-settings__banner--error">
          <AlertCircle size={16} />
          <div>
            <div className="duet-settings__banner-heading">Camera test failed</div>
            <div className="duet-settings__banner-detail">{testState.message}</div>
          </div>
        </div>
      )}
      {saved && !hasUnsavedChanges && (
        <div className="duet-settings__banner duet-settings__banner--success">
          <CheckCircle size={16} /> Camera settings saved for this printer.
        </div>
      )}
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
        hint="Ask for confirmation before switching the active tool."
      />
      <ToggleRow
        id="silent-prompts"
        checked={prefs.silentPrompts}
        onChange={(value) => patchPrefs({ silentPrompts: value })}
        label="Silent prompts"
        hint="Suppress beeps for routine firmware message dialogs."
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
        hint="Trigger a short tone when the firmware emits a beep command."
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

// =============================================================================
// Duet UI preferences — per-printer, stored inside each SavedPrinter in the
// printers list (see store/printerStore.ts).
//
// The DuetSettings dialog is the primary editor; other Duet panels may read
// values lazily via getDuetPrefs() when they want to change behaviour.
//
// Legacy path: the previous single-printer build persisted prefs under
// 'dzign3d-duet-prefs'. The printerStore migrates that into printer #1 on
// first boot. If migration hasn't run yet, we still fall back to the legacy
// key so early callers don't see defaults during the brief startup window.
// =============================================================================

const LEGACY_PREFS_KEY = 'dzign3d-duet-prefs';
const LEGACY_AUTO_RECONNECT_KEY = 'dzign3d-duet-autoreconnect';

export type {
  CameraDashboardCalibration,
  CameraDashboardControlSection,
  CameraDashboardPrefs,
  CameraDashboardPreset,
  CameraHdBridgeQuality,
  CameraMainStreamProtocol,
  CameraPathPreset,
  CameraRtspTransport,
  CameraSourceType,
  CameraStreamPreference,
  CustomButton,
  DateFormat,
  DuetPrefs,
  NotifSeverity,
  TemperatureUnit,
  Units,
} from '../types/duet-prefs.types';
import type { CameraDashboardPrefs, DuetPrefs } from '../types/duet-prefs.types';

export const DEFAULT_CAMERA_DASHBOARD_PREFS: CameraDashboardPrefs = {
  autoRecord: false,
  autoTimelapse: false,
  autoSnapshotFirstLayer: false,
  autoSnapshotLayer: false,
  autoSnapshotFinish: false,
  autoSnapshotError: false,
  scheduledSnapshots: false,
  scheduledSnapshotIntervalMin: 5,
  anomalyCapture: false,
  timelapseIntervalSec: 3,
  timelapseFps: 4,
  showGrid: false,
  showCrosshair: false,
  flipImage: false,
  rotation: 0,
  healthPanelOpen: true,
  activeControlSection: 'record',
  editorCollapsed: false,
  cameraPresets: [],
  calibration: { enabled: false, x: 12, y: 12, width: 76, height: 76 },
  ptzEnabled: false,
  ptzSpeed: 4,
  hdBridgeQuality: '1080p',
};

export const DEFAULT_PREFS: DuetPrefs = {
  units: 'metric',
  webcamSourceType: 'network',
  webcamHost: '',
  webcamUrl: '',
  webcamMainStreamUrl: '',
  webcamUsbDeviceId: '',
  webcamUsbDeviceLabel: '',
  webcamServerUsbDevice: '',
  webcamStreamPreference: 'sub',
  webcamMainStreamProtocol: 'rtsp',
  webcamRtspTransport: 'tcp',
  webcamPathPreset: 'generic',
  webcamUsername: '',
  webcamPassword: '',
  cameraDashboard: DEFAULT_CAMERA_DASHBOARD_PREFS,
  confirmToolChange: true,
  silentPrompts: false,
  autoReconnect: false,
  reconnectInterval: 5000,
  maxRetries: 10,
  toastDurationMs: 5000,
  notificationsSound: true,
  notifMinSeverity: 'info',
  soundAlertOnComplete: true,
  temperatureUnit: 'C',
  dateFormat: 'relative',
  customButtons: [],
  machineConfig: {
    buildVolumeX: 200,
    buildVolumeY: 200,
    buildVolumeZ: 200,
    nozzleDiameter: 0.4,
    extruderCount: 1,
    hasHeatedBed: true,
    hasHeatedChamber: false,
    maxFeedRateX: 300,
    maxFeedRateY: 300,
    maxFeedRateZ: 5,
    maxAccelX: 3000,
    maxAccelY: 3000,
    maxAccelZ: 100,
    kinematics: 'cartesian',
  },
};

// ---------------------------------------------------------------------------
// Printer-store binding
// The store is injected after it constructs itself (to break the circular
// import between printerStore.ts and this module).
// ---------------------------------------------------------------------------

type PrefsBinding = {
  get: () => DuetPrefs;
  set: (prefs: DuetPrefs) => void;
};

let binding: PrefsBinding | null = null;

export function bindDuetPrefs(b: PrefsBinding): void {
  binding = b;
}

// Legacy fallback — used once, at first boot, before the store has migrated
// the old keys into a printer record. Also keeps test environments working
// without spinning the whole store.
function readLegacyPrefs(): DuetPrefs {
  try {
    const raw = localStorage.getItem(LEGACY_PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DuetPrefs>;
      return { ...DEFAULT_PREFS, ...parsed };
    }
    const legacyAuto = localStorage.getItem(LEGACY_AUTO_RECONNECT_KEY);
    if (legacyAuto !== null) {
      return { ...DEFAULT_PREFS, autoReconnect: legacyAuto === 'true' };
    }
  } catch {
    /* storage unavailable */
  }
  return { ...DEFAULT_PREFS };
}

export function getDuetPrefs(): DuetPrefs {
  if (binding) return binding.get();
  return readLegacyPrefs();
}

export function setDuetPrefs(prefs: DuetPrefs): void {
  if (binding) {
    binding.set(prefs);
    return;
  }
  // Pre-bind writes fall through to legacy key so nothing is lost.
  try {
    localStorage.setItem(LEGACY_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* storage unavailable */
  }
}

export function updateDuetPrefs(patch: Partial<DuetPrefs>): DuetPrefs {
  const next = { ...getDuetPrefs(), ...patch };
  setDuetPrefs(next);
  return next;
}

// Expose legacy reader for the store's one-time migration.
export function readLegacyDuetPrefs(): DuetPrefs | null {
  try {
    const raw = localStorage.getItem(LEGACY_PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DuetPrefs>;
      return { ...DEFAULT_PREFS, ...parsed };
    }
    const legacyAuto = localStorage.getItem(LEGACY_AUTO_RECONNECT_KEY);
    if (legacyAuto !== null) {
      return { ...DEFAULT_PREFS, autoReconnect: legacyAuto === 'true' };
    }
  } catch {
    /* storage unavailable */
  }
  return null;
}

export function clearLegacyDuetPrefs(): void {
  try {
    localStorage.removeItem(LEGACY_PREFS_KEY);
    localStorage.removeItem(LEGACY_AUTO_RECONNECT_KEY);
  } catch {
    /* storage unavailable */
  }
}

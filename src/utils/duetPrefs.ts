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

export type { Units, NotifSeverity, TemperatureUnit, DateFormat, CustomButton, DuetPrefs } from '../types/duet-prefs.types';
import type { DuetPrefs } from '../types/duet-prefs.types';

export const DEFAULT_PREFS: DuetPrefs = {
  units: 'metric',
  webcamUrl: '',
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

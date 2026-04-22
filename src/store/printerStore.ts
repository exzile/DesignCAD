import { create } from 'zustand';
import { DuetService } from '../services/DuetService';
import {
  type DuetPrefs,
} from '../utils/duetPrefs';
import type {
  DuetConfig,
  DuetObjectModel,
  TemperatureSample,
  ConsoleEntry,
  DuetFileInfo,
  DuetGCodeFileInfo,
  DuetHeightMap,
  DuetPluginInfo,
  SavedPrinter,
} from '../types/duet';
import { createRegistryActions } from './printer/actions/registry';
import { createUiActions } from './printer/actions/ui';
import { testDuetConnection } from './printer/connection';
import { bindActivePrinterPrefs, connectInitialPrinter } from './printer/prefsBinding';
import { errorMessage, getActivePrinter, loadPrinters, parseEventLog, savePrintersList } from './printer/persistence';

const MAX_TEMPERATURE_HISTORY = 200;
const MAX_CONSOLE_HISTORY = 500;

export interface PrintHistoryEntry {
  timestamp: string;
  file: string | null;
  kind: 'start' | 'finish' | 'cancel' | 'event';
  message: string;
  durationSec?: number;
}

export interface PrinterStore {
  printers: SavedPrinter[];
  activePrinterId: string;

  // Connection — config is a derived view of the active printer's config
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  firmwareUpdatePending: boolean;
  config: DuetConfig;
  service: DuetService | null;

  model: Partial<DuetObjectModel>;

  // Timestamp of last model update (epoch ms) — survives non-user disconnects
  lastModelUpdate: number | null;

  temperatureHistory: TemperatureSample[];

  consoleHistory: ConsoleEntry[];

  currentDirectory: string;
  files: DuetFileInfo[];
  selectedFile: DuetGCodeFileInfo | null;
  uploading: boolean;
  uploadProgress: number;

  macros: DuetFileInfo[];
  macroPath: string;

  // Filaments — names of sub-directories under 0:/filaments
  filaments: string[];

  // Print history — parsed from 0:/sys/eventlog.txt
  printHistory: PrintHistoryEntry[];
  printHistoryLoading: boolean;

  heightMap: DuetHeightMap | null;

  showPrinter: boolean;
  showSettings: boolean;
  activeTab: 'dashboard' | 'status' | 'console' | 'job' | 'history' | 'files' | 'filaments' | 'macros' | 'settings' | 'heightmap' | 'model' | 'config' | 'analytics' | 'network' | 'plugins';

  // Plugins (DSF) — list + install/start/stop
  plugins: DuetPluginInfo[];
  pluginsLoading: boolean;
  error: string | null;
  jogDistance: number;
  extrudeAmount: number;
  extrudeFeedrate: number;

  // Multi-printer actions
  addPrinter: (name?: string) => string; // returns new id
  removePrinter: (id: string) => void;
  renamePrinter: (id: string, name: string) => void;
  selectPrinter: (id: string) => Promise<void>;
  updatePrinterPrefs: (id: string, patch: Partial<DuetPrefs>) => void;

  // Actions
  setConfig: (config: Partial<DuetConfig>) => void;
  connect: () => Promise<void>;
  disconnect: (userInitiated?: boolean) => Promise<void>;
  testConnection: () => Promise<{ success: boolean; firmwareVersion?: string; error?: string }>;

  // G-code
  sendGCode: (code: string) => Promise<void>;

  // Temperature
  setToolTemp: (tool: number, heater: number, temp: number) => Promise<void>;
  setBedTemp: (temp: number) => Promise<void>;
  setChamberTemp: (temp: number) => Promise<void>;

  // Movement
  homeAxes: (axes?: string[]) => Promise<void>;
  moveAxis: (axis: string, distance: number) => Promise<void>;
  extrude: (amount: number, feedrate: number) => Promise<void>;
  setBabyStep: (offset: number) => Promise<void>;

  // Speed/extrusion overrides
  setSpeedFactor: (percent: number) => Promise<void>;
  setExtrusionFactor: (extruder: number, percent: number) => Promise<void>;
  setGlobalFlowFactor: (percent: number) => Promise<void>;

  // Fan
  setFanSpeed: (fan: number, speed: number) => Promise<void>;

  // Print control
  startPrint: (filename: string) => Promise<void>;
  pausePrint: () => Promise<void>;
  resumePrint: () => Promise<void>;
  cancelPrint: () => Promise<void>;
  cancelObject: (index: number) => Promise<void>;
  emergencyStop: () => Promise<void>;

  // Files
  navigateToDirectory: (dir: string) => Promise<void>;
  refreshFiles: () => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  selectFile: (path: string) => Promise<void>;

  refreshMacros: () => Promise<void>;
  navigateMacros: (path: string) => Promise<void>;
  runMacro: (filename: string) => Promise<void>;
  createMacro: (filename: string, contents: string) => Promise<void>;
  deleteMacro: (filename: string) => Promise<void>;

  refreshFilaments: () => Promise<void>;
  loadFilament: (toolNumber: number, name: string) => Promise<void>;
  unloadFilament: (toolNumber: number) => Promise<void>;
  changeFilament: (toolNumber: number, name: string) => Promise<void>;

  // Firmware
  uploadFirmware: (file: File) => Promise<void>;
  installFirmware: () => Promise<void>;

  refreshPrintHistory: () => Promise<void>;

  refreshPlugins: () => Promise<void>;
  installPlugin: (file: File) => Promise<void>;
  startPlugin: (id: string) => Promise<void>;
  stopPlugin: (id: string) => Promise<void>;
  uninstallPlugin: (id: string) => Promise<void>;

  loadHeightMap: (path?: string) => Promise<void>;
  probeGrid: () => Promise<void>;

  startAutoReconnect: () => void;
  stopAutoReconnect: () => void;

  setShowPrinter: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setActiveTab: (tab: PrinterStore['activeTab']) => void;
  setJogDistance: (distance: number) => void;
  setError: (error: string | null) => void;
}

const INITIAL = loadPrinters();

export const usePrinterStore = create<PrinterStore>((set, get) => ({
  printers: INITIAL.printers,
  activePrinterId: INITIAL.activePrinterId,

  connected: false,
  connecting: false,
  reconnecting: false,
  firmwareUpdatePending: false,
  config: getActivePrinter(INITIAL.printers, INITIAL.activePrinterId).config,
  service: null,

  model: {},

  lastModelUpdate: null,

  temperatureHistory: [],

  consoleHistory: [],

  currentDirectory: '0:/gcodes',
  files: [],
  selectedFile: null,
  uploading: false,
  uploadProgress: 0,

  macros: [],
  macroPath: '0:/macros',

  filaments: [],

  printHistory: [],
  printHistoryLoading: false,

  heightMap: null,

  plugins: [],
  pluginsLoading: false,

  showPrinter: false,
  showSettings: false,
  activeTab: 'dashboard',
  error: null,
  jogDistance: 10,
  extrudeAmount: 50,
  extrudeFeedrate: 300,


  ...createRegistryActions({ set, get }),

  connect: async () => {
    const { config, service: existingService, connecting } = get();
    if (!config.hostname) {
      set({ error: 'No hostname configured' });
      return;
    }

    // Re-entrancy guard — second click while a connection is in flight would
    // otherwise spawn a parallel DuetService whose model-update callback keeps
    // firing alongside the first. Drop subsequent calls until the first either
    // resolves or fails.
    if (connecting) return;

    // Clean up existing service if any
    if (existingService) {
      try { await existingService.disconnect(); } catch { /* ignore */ }
    }

    set({ connecting: true, error: null });

    const service = new DuetService(config);

    try {
      const connected = await service.connect();
      if (!connected) {
        throw new Error('Connection refused');
      }

      service.on('error', (err) => {
        const state = get();
        if (state.service !== null && state.service !== service) return;
        set({ error: `Printer connection issue: ${errorMessage(err, 'Unknown transport error')}` });
      });

      // Set up disconnection detection for auto-reconnect
      service.on('disconnected', () => {
        // Only trigger if the store still thinks it's connected (i.e., not
        // a user-initiated disconnect which already cleared the state).
        const state = get();
        if (state.connected && state.service === service) {
          get().disconnect(false);
        }
      });

      // Set up model update listener that records temperature samples
      service.onModelUpdate((model: Partial<DuetObjectModel>) => {
        // Drop callbacks from a stale service that was replaced/disconnected
        // mid-flight (e.g. user clicked disconnect before initial fetch landed).
        const currentService = get().service;
        if (currentService !== service) return;
        const state = get();
        const now = Date.now();

        // Build temperature sample from the model
        const sample: TemperatureSample = {
          timestamp: now,
          heaters: (model.heat?.heaters ?? []).map((heater, index) => ({
            index,
            current: heater.current,
            active: heater.active,
            standby: heater.standby,
          })),
          sensors: (model.sensors?.analog ?? []).map((sensor, index) => ({
            index,
            value: sensor.lastReading,
          })),
        };

        const history = [...state.temperatureHistory, sample];
        if (history.length > MAX_TEMPERATURE_HISTORY) {
          history.splice(0, history.length - MAX_TEMPERATURE_HISTORY);
        }

        set({ model, temperatureHistory: history, lastModelUpdate: now });
      });

      // Load initial file list
      const files = await service.listFiles('0:/gcodes').catch(() => [] as DuetFileInfo[]);
      const macros = await service.listFiles('0:/macros').catch(() => [] as DuetFileInfo[]);
      const filamentEntries = await service.listFiles('0:/filaments').catch(() => [] as DuetFileInfo[]);
      const filaments = filamentEntries.filter((e) => e.type === 'd').map((e) => e.name).sort();

      // If user disconnected while we were awaiting, don't clobber the cleared
      // state with `connected: true` and a service they thought was dropped.
      if (!get().connecting) {
        try { await service.disconnect(); } catch { /* ignore */ }
        return;
      }

      // Persist the active printer's config (hostname/password may have
      // just been edited on the Connection tab).
      savePrintersList(get().printers, get().activePrinterId);

      set({
        connected: true,
        connecting: false,
        firmwareUpdatePending: false,
        service,
        files,
        macros,
        filaments,
        showPrinter: true,
        error: null,
      });
    } catch (err) {
      set({
        connecting: false,
        error: `Connection failed: ${errorMessage(err, 'Unknown connection error')}`,
      });
    }
  },

  /**
   * Disconnect from the printer.
   * @param userInitiated - When true (default), auto-reconnect is stopped.
   *   Pass false when the disconnect is due to a detected connection loss
   *   so that auto-reconnect can kick in.
   */
  disconnect: async (userInitiated = true) => {
    if (userInitiated) {
      get().stopAutoReconnect();
    }

    const { service } = get();
    if (service) {
      try { await service.disconnect(); } catch { /* ignore */ }
    }

    if (userInitiated) {
      // User explicitly disconnected — clear everything
      set({
        connected: false,
        connecting: false,
        reconnecting: false,
        service: null,
        model: {},
        lastModelUpdate: null,
        temperatureHistory: [],
        files: [],
        selectedFile: null,
        macros: [],
        filaments: [],
        heightMap: null,
        error: null,
      });
    } else {
      // Connection lost — preserve model / files for graceful degradation
      set({
        connected: false,
        connecting: false,
        service: null,
        error: 'Connection lost',
      });
    }

    // If the disconnect was not user-initiated, try to auto-reconnect
    if (!userInitiated) {
      get().startAutoReconnect();
    }
  },

  testConnection: async () => testDuetConnection(get().config),


  sendGCode: async (code) => {
    const { service, consoleHistory } = get();
    if (!service) return;

    const commandEntry: ConsoleEntry = {
      timestamp: new Date(),
      type: 'command',
      content: code,
    };

    const updatedHistory = [...consoleHistory, commandEntry];
    set({ consoleHistory: updatedHistory.slice(-MAX_CONSOLE_HISTORY) });

    try {
      const response = await service.sendGCode(code);
      const responseEntry: ConsoleEntry = {
        timestamp: new Date(),
        type: 'response',
        content: response || 'ok',
      };

      const history = [...get().consoleHistory, responseEntry];
      set({ consoleHistory: history.slice(-MAX_CONSOLE_HISTORY) });
    } catch (err) {
      const errorEntry: ConsoleEntry = {
        timestamp: new Date(),
        type: 'error',
        content: (err as Error).message,
      };

      const history = [...get().consoleHistory, errorEntry];
      set({
        consoleHistory: history.slice(-MAX_CONSOLE_HISTORY),
        error: `G-code error: ${(err as Error).message}`,
      });
    }
  },


  setToolTemp: async (tool, _heater, temp) => {
    const { service } = get();
    if (!service) return;
    try {
      // G10 P<tool> R<standby> S<active> — set active temp for the tool heater
      await service.sendGCode(`G10 P${tool} S${temp}`);
    } catch (err) {
      set({ error: `Failed to set tool temp: ${(err as Error).message}` });
    }
  },

  setBedTemp: async (temp) => {
    const { service } = get();
    if (!service) return;
    try {
      await service.sendGCode(`M140 S${temp}`);
    } catch (err) {
      set({ error: `Failed to set bed temp: ${(err as Error).message}` });
    }
  },

  setChamberTemp: async (temp) => {
    const { service } = get();
    if (!service) return;
    try {
      await service.sendGCode(`M141 S${temp}`);
    } catch (err) {
      set({ error: `Failed to set chamber temp: ${(err as Error).message}` });
    }
  },


  homeAxes: async (axes) => {
    const { service } = get();
    if (!service) return;
    try {
      if (!axes || axes.length === 0) {
        await service.sendGCode('G28');
      } else {
        await service.sendGCode(`G28 ${axes.join(' ')}`);
      }
    } catch (err) {
      set({ error: `Failed to home axes: ${(err as Error).message}` });
    }
  },

  moveAxis: async (axis, distance) => {
    const { service } = get();
    if (!service) return;
    try {
      await service.sendGCode('G91'); // Relative positioning
      await service.sendGCode(`G1 ${axis.toUpperCase()}${distance} F6000`);
      await service.sendGCode('G90'); // Back to absolute
    } catch (err) {
      set({ error: `Failed to move axis: ${(err as Error).message}` });
    }
  },

  extrude: async (amount, feedrate) => {
    const { service } = get();
    if (!service) return;
    try {
      await service.sendGCode('M83'); // Relative extrusion
      await service.sendGCode(`G1 E${amount} F${feedrate}`);
    } catch (err) {
      set({ error: `Failed to extrude: ${(err as Error).message}` });
    }
  },

  setBabyStep: async (offset) => {
    const { service } = get();
    if (!service) return;
    try {
      await service.sendGCode(`M290 S${offset}`);
    } catch (err) {
      set({ error: `Failed to set baby step: ${(err as Error).message}` });
    }
  },


  setSpeedFactor: async (percent) => {
    const { service } = get();
    if (!service) return;
    try {
      await service.sendGCode(`M220 S${percent}`);
    } catch (err) {
      set({ error: `Failed to set speed factor: ${(err as Error).message}` });
    }
  },

  setExtrusionFactor: async (extruder, percent) => {
    const { service } = get();
    if (!service) return;
    try {
      await service.sendGCode(`M221 D${extruder} S${percent}`);
    } catch (err) {
      set({ error: `Failed to set extrusion factor: ${(err as Error).message}` });
    }
  },

  setGlobalFlowFactor: async (percent) => {
    const { service } = get();
    if (!service) return;
    try {
      await service.sendGCode(`M221 D-1 S${percent}`);
    } catch (err) {
      set({ error: `Failed to set global flow factor: ${(err as Error).message}` });
    }
  },


  setFanSpeed: async (fan, speed) => {
    const { service } = get();
    if (!service) return;
    try {
      // Speed is 0-1 for Duet, but accept 0-100 for UX
      const duetSpeed = speed > 1 ? speed / 100 : speed;
      await service.sendGCode(`M106 P${fan} S${duetSpeed}`);
    } catch (err) {
      set({ error: `Failed to set fan speed: ${(err as Error).message}` });
    }
  },


  startPrint: async (filename) => {
    const { service } = get();
    if (!service) return;
    try {
      await service.sendGCode(`M32 "${filename}"`);
    } catch (err) {
      set({ error: `Failed to start print: ${(err as Error).message}` });
    }
  },

  pausePrint: async () => {
    const { service } = get();
    if (!service) return;
    try {
      await service.sendGCode('M25');
    } catch (err) {
      set({ error: `Failed to pause print: ${(err as Error).message}` });
    }
  },

  resumePrint: async () => {
    const { service } = get();
    if (!service) return;
    try {
      await service.sendGCode('M24');
    } catch (err) {
      set({ error: `Failed to resume print: ${(err as Error).message}` });
    }
  },

  cancelPrint: async () => {
    const { service } = get();
    if (!service) return;
    try {
      await service.sendGCode('M0');
    } catch (err) {
      set({ error: `Failed to cancel print: ${(err as Error).message}` });
    }
  },

  cancelObject: async (index) => {
    const { service } = get();
    if (!service) return;
    try {
      await service.cancelObject(index);
    } catch (err) {
      set({ error: `Failed to cancel object: ${(err as Error).message}` });
    }
  },

  emergencyStop: async () => {
    const { service } = get();
    if (!service) return;
    try {
      await service.emergencyStop();
    } catch (err) {
      set({ error: `Emergency stop failed: ${(err as Error).message}` });
    }
  },


  navigateToDirectory: async (dir) => {
    const { service } = get();
    if (!service) return;
    try {
      const files = await service.listFiles(dir);
      set({ currentDirectory: dir, files, selectedFile: null });
    } catch (err) {
      set({ error: `Failed to navigate to ${dir}: ${(err as Error).message}` });
    }
  },

  refreshFiles: async () => {
    const { service, currentDirectory } = get();
    if (!service) return;
    try {
      const files = await service.listFiles(currentDirectory);
      set({ files });
    } catch (err) {
      set({ error: `Failed to refresh files: ${(err as Error).message}` });
    }
  },

  uploadFile: async (file) => {
    const { service, currentDirectory } = get();
    if (!service) throw new Error('Printer not connected');

    set({ uploading: true, uploadProgress: 0, error: null });
    try {
      await service.uploadFile(
        `${currentDirectory}/${file.name}`,
        file,
        (progress) => set({ uploadProgress: progress }),
      );
      set({ uploading: false, uploadProgress: 100 });

      // Refresh file list after upload — but only if the user is still
      // viewing the directory we uploaded into. Otherwise the listing for
      // the OLD directory would clobber the listing of wherever they
      // navigated to during the upload.
      const state = get();
      if (state.service === service && state.currentDirectory === currentDirectory) {
        const files = await service.listFiles(currentDirectory);
        if (get().service === service && get().currentDirectory === currentDirectory) {
          set({ files });
        }
      }
    } catch (err) {
      const message = errorMessage(err, 'Upload failed');
      set({
        uploading: false,
        uploadProgress: 0,
        error: `Upload failed: ${message}`,
      });
      throw err instanceof Error ? err : new Error(message);
    }
  },

  deleteFile: async (path) => {
    const { service, currentDirectory } = get();
    if (!service) return;
    try {
      await service.deleteFile(path);
      // Refresh file list after deletion — bail if user navigated away.
      const files = await service.listFiles(currentDirectory);
      if (get().currentDirectory === currentDirectory) set({ files });
    } catch (err) {
      set({ error: `Failed to delete file: ${(err as Error).message}` });
    }
  },

  selectFile: async (path) => {
    const { service } = get();
    if (!service) return;
    try {
      const fileInfo = await service.getFileInfo(path);
      set({ selectedFile: fileInfo });
    } catch (err) {
      set({ error: `Failed to get file info: ${(err as Error).message}` });
    }
  },


  refreshMacros: async () => {
    const { service, macroPath } = get();
    if (!service) return;
    try {
      const macros = await service.listFiles(macroPath);
      set({ macros });
    } catch (err) {
      set({ error: `Failed to refresh macros: ${(err as Error).message}` });
    }
  },

  navigateMacros: async (path) => {
    const { service } = get();
    if (!service) return;
    try {
      const macros = await service.listFiles(path);
      set({ macroPath: path, macros });
    } catch (err) {
      set({ error: `Failed to navigate macros: ${(err as Error).message}` });
    }
  },

  runMacro: async (filename) => {
    const { service, macroPath } = get();
    if (!service) return;
    try {
      await service.sendGCode(`M98 P"${macroPath}/${filename}"`);
    } catch (err) {
      set({ error: `Failed to run macro: ${(err as Error).message}` });
    }
  },

  createMacro: async (filename, contents) => {
    const { service, macroPath } = get();
    if (!service) return;
    const name = /\.g$/i.test(filename) ? filename : `${filename}.g`;
    try {
      const blob = new Blob([contents], { type: 'text/plain' });
      await service.uploadFile(`${macroPath}/${name}`, blob);
      const macros = await service.listFiles(macroPath);
      if (get().macroPath === macroPath) set({ macros });
    } catch (err) {
      set({ error: `Failed to create macro: ${(err as Error).message}` });
    }
  },

  deleteMacro: async (filename) => {
    const { service, macroPath } = get();
    if (!service) return;
    try {
      await service.deleteFile(`${macroPath}/${filename}`);
      const macros = await service.listFiles(macroPath);
      if (get().macroPath === macroPath) set({ macros });
    } catch (err) {
      set({ error: `Failed to delete macro: ${(err as Error).message}` });
    }
  },


  refreshFilaments: async () => {
    const { service } = get();
    if (!service) return;
    try {
      const entries = await service.listFiles('0:/filaments');
      const names = entries.filter((e) => e.type === 'd').map((e) => e.name).sort();
      set({ filaments: names });
    } catch (err) {
      set({ error: `Failed to list filaments: ${(err as Error).message}` });
    }
  },

  loadFilament: async (toolNumber, name) => {
    const { service } = get();
    if (!service) return;
    try {
      // Select the tool first so M701 targets the correct extruder
      await service.sendGCode(`T${toolNumber}`);
      await service.sendGCode(`M701 S"${name}"`);
    } catch (err) {
      set({ error: `Failed to load filament: ${(err as Error).message}` });
    }
  },

  unloadFilament: async (toolNumber) => {
    const { service } = get();
    if (!service) return;
    try {
      await service.sendGCode(`T${toolNumber}`);
      await service.sendGCode('M702');
    } catch (err) {
      set({ error: `Failed to unload filament: ${(err as Error).message}` });
    }
  },

  changeFilament: async (toolNumber, name) => {
    const { service } = get();
    if (!service) return;
    try {
      // Duet's documented filament-change flow is unload + load with the
      // new name. M703 prints the loaded configuration; it doesn't swap.
      await service.sendGCode(`T${toolNumber}`);
      await service.sendGCode('M702');
      await service.sendGCode(`M701 S"${name}"`);
    } catch (err) {
      set({ error: `Failed to change filament: ${(err as Error).message}` });
    }
  },


  uploadFirmware: async (file) => {
    const { service } = get();
    if (!service) return;

    set({ uploading: true, uploadProgress: 0, error: null });
    try {
      await service.uploadFile(
        `0:/firmware/${file.name}`,
        file,
        (progress) => set({ uploadProgress: progress }),
      );
      set({ uploading: false, uploadProgress: 100 });
    } catch (err) {
      set({
        uploading: false,
        uploadProgress: 0,
        error: `Firmware upload failed: ${(err as Error).message}`,
      });
      throw err;
    }
  },

  installFirmware: async () => {
    const { service } = get();
    if (!service) return;
    try {
      await service.sendGCode('M997');
      set({ firmwareUpdatePending: true });
    } catch (err) {
      set({ error: `Failed to trigger firmware install: ${(err as Error).message}` });
    }
  },


  refreshPrintHistory: async () => {
    const { service } = get();
    if (!service) return;
    set({ printHistoryLoading: true });
    try {
      const blob = await service.downloadFile('0:/sys/eventlog.txt');
      const text = await blob.text();
      const entries = parseEventLog(text);
      set({ printHistory: entries, printHistoryLoading: false });
    } catch (err) {
      set({
        printHistory: [],
        printHistoryLoading: false,
        error: `Failed to load print history: ${(err as Error).message}`,
      });
    }
  },


  refreshPlugins: async () => {
    const { service } = get();
    if (!service) return;
    set({ pluginsLoading: true });
    try {
      // The object model exposes `plugins` as a dict keyed by plugin id.
      // Flatten to an array so it renders as a table without losing the id.
      const result = await service.getObjectModel('plugins');
      const raw = (result as unknown as { plugins?: Record<string, Record<string, unknown>> }).plugins
        ?? (result as unknown as Record<string, Record<string, unknown>>);
      const arr: DuetPluginInfo[] = [];
      if (raw && typeof raw === 'object') {
        for (const [id, v] of Object.entries(raw)) {
          if (!v || typeof v !== 'object') continue;
          arr.push({
            id,
            name: (v.name as string) ?? id,
            version: v.version as string | undefined,
            author: v.author as string | undefined,
            sbcRequired: v.sbcRequired as boolean | undefined,
            rrfVersion: v.rrfVersion as string | undefined,
            dwcVersion: v.dwcVersion as string | undefined,
            pid: typeof v.pid === 'number' ? (v.pid as number) : undefined,
            homepage: v.homepage as string | undefined,
          });
        }
      }
      arr.sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id));
      set({ plugins: arr, pluginsLoading: false });
    } catch (err) {
      set({
        plugins: [],
        pluginsLoading: false,
        error: `Failed to load plugins: ${(err as Error).message}`,
      });
    }
  },

  installPlugin: async (file) => {
    const { service } = get();
    if (!service) return;
    try {
      // Upload the ZIP to 0:/sys, then M750 tells RRF/DSF to install it.
      await service.uploadFile(`0:/sys/${file.name}`, file);
      await service.sendGCode(`M750 P"${file.name}"`);
      // Refresh so the new plugin shows up in the list.
      await get().refreshPlugins();
    } catch (err) {
      set({ error: `Failed to install plugin: ${(err as Error).message}` });
    }
  },

  startPlugin: async (id) => {
    const { service } = get();
    if (!service) return;
    try {
      await service.sendGCode(`M751 P"${id}"`);
      await get().refreshPlugins();
    } catch (err) {
      set({ error: `Failed to start plugin: ${(err as Error).message}` });
    }
  },

  stopPlugin: async (id) => {
    const { service } = get();
    if (!service) return;
    try {
      await service.sendGCode(`M752 P"${id}"`);
      await get().refreshPlugins();
    } catch (err) {
      set({ error: `Failed to stop plugin: ${(err as Error).message}` });
    }
  },

  uninstallPlugin: async (id) => {
    const { service } = get();
    if (!service) return;
    try {
      // M753 uninstalls a plugin on DSF; standalone firmware may not support
      // it. Either way, bubble the firmware's error up to the user rather
      // than silently succeeding.
      await service.sendGCode(`M753 P"${id}"`);
      await get().refreshPlugins();
    } catch (err) {
      set({ error: `Failed to uninstall plugin: ${(err as Error).message}` });
    }
  },


  loadHeightMap: async (path?: string) => {
    const { service } = get();
    if (!service) return;
    try {
      const heightMap = await service.getHeightMap(path);
      set({ heightMap });
    } catch (err) {
      set({ error: `Failed to load height map: ${(err as Error).message}` });
    }
  },

  probeGrid: async () => {
    const { service } = get();
    if (!service) return;
    try {
      await service.sendGCode('G29');
      // Reload height map after probing completes
      const heightMap = await service.getHeightMap();
      set({ heightMap });
    } catch (err) {
      set({ error: `Failed to probe grid: ${(err as Error).message}` });
    }
  },

  ...createUiActions({ set, get }),
}));


bindActivePrinterPrefs(usePrinterStore);
connectInitialPrinter(usePrinterStore);

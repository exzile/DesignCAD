import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PersistStorage } from 'zustand/middleware';
import * as THREE from 'three';
import type {
  PrinterProfile, MaterialProfile, PrintProfile, PlateObject,
  SliceProgress, SliceResult,
} from '../types/slicer';
import {
  DEFAULT_PRINTER_PROFILES, DEFAULT_MATERIAL_PROFILES, DEFAULT_PRINT_PROFILES,
} from '../types/slicer';
import { normalizeRotationDegreesToRadians, normalizeScale } from '../utils/slicerTransforms';
import { createPreviewActions } from './slicer/actions/preview';
import { createPlateActions } from './slicer/plateActions';
import { deserializeGeom, idbStorage, serializeGeom, type SerializedGeom } from './slicer/persistence';
import { getActiveSliceRequestId, getCurrentSlicerWorker, getSlicerWorker, isWorkerBusy, nextSliceRequestId, setWorkerBusy } from './slicer/worker';


export interface SlicerStore {
  // Profiles
  printerProfiles: PrinterProfile[];
  materialProfiles: MaterialProfile[];
  printProfiles: PrintProfile[];

  // Active selections
  activePrinterProfileId: string;
  activeMaterialProfileId: string;
  activePrintProfileId: string;

  // Per-printer last-used profile IDs (so switching printers restores context)
  printerLastMaterial: Record<string, string>;
  printerLastPrint: Record<string, string>;

  // Plate objects (models on build plate)
  plateObjects: PlateObject[];
  selectedPlateObjectId: string | null;

  // Slice state
  sliceProgress: SliceProgress;
  sliceResult: SliceResult | null;

  // Preview state
  previewMode: 'model' | 'preview';
  previewLayer: number;            // end layer (inclusive) — highest visible layer
  previewLayerStart: number;       // start layer (inclusive) — lowest visible layer
  previewLayerMax: number;
  previewShowTravel: boolean;
  previewShowRetractions: boolean;
  previewColorMode: 'type' | 'speed' | 'flow';
  previewHiddenTypes: string[];
  previewColorSchemeOpen: boolean;

  // Simulation (nozzle playback) state
  previewSimEnabled: boolean;      // show the virtual nozzle marker
  previewSimPlaying: boolean;
  previewSimSpeed: number;         // multiplier (1x, 2x, 5x, 10x, 25x)
  previewSimTime: number;          // seconds advanced through the toolpath

  // Printability analysis
  printabilityReport: import('../engine/PrintabilityCheck').PrintabilityReport | null;
  printabilityHighlight: boolean;

  // UI state
  settingsPanel: 'printer' | 'material' | 'print' | null;
  transformMode: 'move' | 'scale' | 'rotate' | 'mirror' | 'settings';

  // Getters (computed)
  getActivePrinterProfile: () => PrinterProfile;
  getActiveMaterialProfile: () => MaterialProfile;
  getActivePrintProfile: () => PrintProfile;

  // Profile management
  setActivePrinterProfile: (id: string) => void;
  setActiveMaterialProfile: (id: string) => void;
  setActivePrintProfile: (id: string) => void;
  addPrinterProfile: (profile: PrinterProfile) => void;
  updatePrinterProfile: (id: string, updates: Partial<PrinterProfile>) => void;
  deletePrinterProfile: (id: string) => void;
  createPrinterWithDefaults: (name: string) => void;
  addMaterialProfile: (profile: MaterialProfile) => void;
  updateMaterialProfile: (id: string, updates: Partial<MaterialProfile>) => void;
  deleteMaterialProfile: (id: string) => void;
  addPrintProfile: (profile: PrintProfile) => void;
  updatePrintProfile: (id: string, updates: Partial<PrintProfile>) => void;
  deletePrintProfile: (id: string) => void;

  // Plate management
  addToPlate: (featureId: string, name: string, geometry: THREE.BufferGeometry | null | unknown) => void;
  removeFromPlate: (id: string) => void;
  selectPlateObject: (id: string | null) => void;
  updatePlateObject: (id: string, updates: Partial<PlateObject>) => void;
  autoArrange: () => void;
  clearPlate: () => void;
  importFileToPlate: (file: File) => Promise<void>;

  // Slicing
  startSlice: () => void;
  cancelSlice: () => void;
  setSliceProgress: (progress: SliceProgress) => void;

  // Preview
  setPreviewMode: (mode: 'model' | 'preview') => void;
  setPreviewLayer: (layer: number) => void;
  setPreviewLayerStart: (layer: number) => void;
  setPreviewLayerRange: (start: number, end: number) => void;
  setPreviewShowTravel: (show: boolean) => void;
  setPreviewShowRetractions: (show: boolean) => void;
  setPreviewColorMode: (mode: 'type' | 'speed' | 'flow') => void;
  togglePreviewType: (type: string) => void;
  setPreviewColorSchemeOpen: (open: boolean) => void;

  // Simulation
  setPreviewSimEnabled: (on: boolean) => void;
  setPreviewSimPlaying: (playing: boolean) => void;
  setPreviewSimSpeed: (speed: number) => void;
  setPreviewSimTime: (t: number) => void;
  advancePreviewSimTime: (deltaSeconds: number) => void;
  resetPreviewSim: () => void;

  // Printability
  runPrintabilityCheck: () => void;
  clearPrintabilityReport: () => void;
  setPrintabilityHighlight: (on: boolean) => void;

  // Export
  downloadGCode: () => void;
  sendToPrinter: () => Promise<void>;

  // UI
  setSettingsPanel: (panel: 'printer' | 'material' | 'print' | null) => void;
  setTransformMode: (mode: 'move' | 'scale' | 'rotate' | 'mirror' | 'settings') => void;
}


export const useSlicerStore = create<SlicerStore>()(persist((set, get) => ({
  // Profiles — rehydrated from IDB on load; defaults used only on fresh install
  printerProfiles: DEFAULT_PRINTER_PROFILES,
  materialProfiles: DEFAULT_MATERIAL_PROFILES,
  printProfiles: DEFAULT_PRINT_PROFILES,

  // Active selections — rehydrated from IDB; defaults used only on fresh install
  activePrinterProfileId: DEFAULT_PRINTER_PROFILES[0]?.id ?? '',
  activeMaterialProfileId: DEFAULT_MATERIAL_PROFILES[0]?.id ?? '',
  activePrintProfileId: DEFAULT_PRINT_PROFILES[0]?.id ?? '',

  printerLastMaterial: {},
  printerLastPrint: {},

  // Plate objects
  plateObjects: [],
  selectedPlateObjectId: null,

  // Slice state
  sliceProgress: {
    stage: 'idle',
    percent: 0,
    currentLayer: 0,
    totalLayers: 0,
    message: '',
  },
  sliceResult: null,

  // Preview state
  previewMode: 'model',
  previewLayer: 0,
  previewLayerStart: 0,
  previewLayerMax: 0,
  previewShowTravel: false,
  previewShowRetractions: true,
  previewColorMode: 'type',
  previewHiddenTypes: [],
  previewColorSchemeOpen: false,

  // Simulation
  previewSimEnabled: false,
  previewSimPlaying: false,
  previewSimSpeed: 5,
  previewSimTime: 0,

  // Printability
  printabilityReport: null,
  printabilityHighlight: true,

  // UI state
  settingsPanel: null,
  transformMode: 'move',

  // --- Getters ---

  getActivePrinterProfile: () => {
    const { printerProfiles, activePrinterProfileId } = get();
    return printerProfiles.find((p) => p.id === activePrinterProfileId) ?? printerProfiles[0];
  },

  getActiveMaterialProfile: () => {
    const { materialProfiles, activeMaterialProfileId } = get();
    return materialProfiles.find((p) => p.id === activeMaterialProfileId) ?? materialProfiles[0];
  },

  getActivePrintProfile: () => {
    const { printProfiles, activePrintProfileId } = get();
    return printProfiles.find((p) => p.id === activePrintProfileId) ?? printProfiles[0];
  },

  // --- Profile management ---

  setActivePrinterProfile: (id) => {
    const state = get();
    // Restore this printer's last-used material and print profiles
    const printerMaterials = state.materialProfiles.filter(
      (m) => (m.printerId ?? DEFAULT_PRINTER_PROFILES[0]?.id) === id,
    );
    const printerPrints = state.printProfiles.filter(
      (p) => (p.printerId ?? DEFAULT_PRINTER_PROFILES[0]?.id) === id,
    );
    const materialId = state.printerLastMaterial[id] ?? printerMaterials[0]?.id ?? state.activeMaterialProfileId;
    const printId = state.printerLastPrint[id] ?? printerPrints[0]?.id ?? state.activePrintProfileId;
    set({ activePrinterProfileId: id, activeMaterialProfileId: materialId, activePrintProfileId: printId });
  },

  setActiveMaterialProfile: (id) => {
    const state = get();
    set({
      activeMaterialProfileId: id,
      printerLastMaterial: { ...state.printerLastMaterial, [state.activePrinterProfileId]: id },
    });
  },

  setActivePrintProfile: (id) => {
    const state = get();
    set({
      activePrintProfileId: id,
      printerLastPrint: { ...state.printerLastPrint, [state.activePrinterProfileId]: id },
    });
  },

  addPrinterProfile: (profile) => set((state) => ({
    printerProfiles: [...state.printerProfiles, profile],
  })),

  updatePrinterProfile: (id, updates) => set((state) => ({
    printerProfiles: state.printerProfiles.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    ),
  })),

  deletePrinterProfile: (id) => set((state) => {
    const filtered = state.printerProfiles.filter((p) => p.id !== id);
    const newState: Partial<SlicerStore> = {
      printerProfiles: filtered,
      materialProfiles: state.materialProfiles.filter((m) => m.printerId !== id),
      printProfiles: state.printProfiles.filter((p) => p.printerId !== id),
    };
    if (state.activePrinterProfileId === id && filtered.length > 0) {
      newState.activePrinterProfileId = filtered[0].id;
    }
    return newState;
  }),

  createPrinterWithDefaults: (name) => {
    const printerId = `printer-${Date.now()}`;
    const materialId = `${printerId}-pla`;
    const printId = `${printerId}-standard`;
    const defaultPrint = DEFAULT_PRINT_PROFILES[0];
    const newPrinter: PrinterProfile = {
      id: printerId,
      name,
      buildVolume: { x: 220, y: 220, z: 250 },
      nozzleDiameter: 0.4,
      nozzleCount: 1,
      filamentDiameter: 1.75,
      hasHeatedBed: true,
      hasHeatedChamber: false,
      maxNozzleTemp: 280,
      maxBedTemp: 110,
      maxSpeed: 200,
      maxAcceleration: 2000,
      originCenter: false,
      gcodeFlavorType: 'marlin',
      startGCode: 'G28 ; Home all axes\nG29 ; Bed leveling\n',
      endGCode: 'M104 S0 ; Turn off hotend\nM140 S0 ; Turn off bed\nG28 X0 ; Park\n',
    };
    const newMaterial: MaterialProfile = {
      id: materialId,
      printerId,
      name: 'PLA',
      type: 'PLA',
      color: '#4fc3f7',
      nozzleTemp: 210,
      nozzleTempFirstLayer: 215,
      bedTemp: 60,
      bedTempFirstLayer: 65,
      chamberTemp: 0,
      fanSpeedMin: 100,
      fanSpeedMax: 100,
      fanDisableFirstLayers: 1,
      retractionDistance: 0.8,
      retractionSpeed: 45,
      retractionZHop: 0,
      flowRate: 1.0,
      density: 1.24,
      costPerKg: 20,
    };
    const newPrint: PrintProfile = { ...defaultPrint, id: printId, printerId, name: 'Standard Quality' };
    set((state) => ({
      printerProfiles: [...state.printerProfiles, newPrinter],
      materialProfiles: [...state.materialProfiles, newMaterial],
      printProfiles: [...state.printProfiles, newPrint],
      activePrinterProfileId: printerId,
      activeMaterialProfileId: materialId,
      activePrintProfileId: printId,
      printerLastMaterial: { ...state.printerLastMaterial, [printerId]: materialId },
      printerLastPrint: { ...state.printerLastPrint, [printerId]: printId },
    }));
  },

  addMaterialProfile: (profile) => set((state) => ({
    materialProfiles: [...state.materialProfiles, profile],
  })),

  updateMaterialProfile: (id, updates) => set((state) => ({
    materialProfiles: state.materialProfiles.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    ),
  })),

  deleteMaterialProfile: (id) => set((state) => {
    const filtered = state.materialProfiles.filter((p) => p.id !== id);
    const newState: Partial<SlicerStore> = { materialProfiles: filtered };
    if (state.activeMaterialProfileId === id && filtered.length > 0) {
      newState.activeMaterialProfileId = filtered[0].id;
    }
    return newState;
  }),

  addPrintProfile: (profile) => set((state) => ({
    printProfiles: [...state.printProfiles, profile],
  })),

  updatePrintProfile: (id, updates) => set((state) => ({
    printProfiles: state.printProfiles.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    ),
  })),

  deletePrintProfile: (id) => set((state) => {
    const filtered = state.printProfiles.filter((p) => p.id !== id);
    const newState: Partial<SlicerStore> = { printProfiles: filtered };
    if (state.activePrintProfileId === id && filtered.length > 0) {
      newState.activePrintProfileId = filtered[0].id;
    }
    return newState;
  }),

  // --- Plate management ---

  ...createPlateActions({ set, get }),

  // --- Slicing ---

  startSlice: () => {
    const state = get();
    if (state.plateObjects.length === 0) return;
    if (isWorkerBusy()) return; // re-entrancy guard

    const printerProfile = state.getActivePrinterProfile();
    const materialProfile = state.getActiveMaterialProfile();
    const printProfile = state.getActivePrintProfile();

    // Serialize geometry data on the main thread (THREE.BufferGeometry can't
    // cross the worker boundary directly). Typed arrays are copied, not
    // transferred, so the original geometries remain intact for rendering.
    // Per-object overrides ride alongside each geometry so the worker can
    // partition the plate into groups that share an effective profile.
    const geometryData: {
      positions: Float32Array;
      index: Uint32Array | null;
      transformElements: Float32Array;
      overrides?: Record<string, unknown>;
      objectName?: string;
    }[] = [];

    for (const obj of state.plateObjects) {
      if (!obj.geometry) continue;
      const geo = obj.geometry as THREE.BufferGeometry;
      const posAttr = geo.getAttribute('position');
      if (!posAttr) continue;

      const pos = (obj.position as { x: number; y: number; z?: number });
      const rot = normalizeRotationDegreesToRadians((obj as { rotation?: unknown }).rotation);
      const rawScl = normalizeScale((obj as { scale?: unknown }).scale);
      // Mirror flags bake into the scale so the slicer worker receives the
      // already-flipped geometry. An odd number of mirrors inverts the
      // transform's determinant, which in turn inverts triangle winding —
      // we fix that below so the slicer still sees outward-pointing normals.
      const mir = obj as { mirrorX?: boolean; mirrorY?: boolean; mirrorZ?: boolean };
      const mirrorCount = (mir.mirrorX ? 1 : 0) + (mir.mirrorY ? 1 : 0) + (mir.mirrorZ ? 1 : 0);
      const windingFlipped = mirrorCount % 2 === 1;
      const scl = {
        x: rawScl.x * (mir.mirrorX ? -1 : 1),
        y: rawScl.y * (mir.mirrorY ? -1 : 1),
        z: rawScl.z * (mir.mirrorZ ? -1 : 1),
      };
      const transform = new THREE.Matrix4().compose(
        new THREE.Vector3(pos.x, pos.y, pos.z ?? 0),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(rot.x, rot.y, rot.z)),
        new THREE.Vector3(scl.x, scl.y, scl.z),
      );

      const indexAttr = geo.getIndex();

      // Triangle winding fix: swap every other pair of vertex indices so the
      // triangle normal ends up pointing outward again after the mirror.
      // For indexed geometry we rebuild the index buffer; for non-indexed
      // geometry we swap positions (v1, v2) for each triangle directly.
      let positionsForWorker: Float32Array;
      let indexForWorker: Uint32Array | null;
      if (windingFlipped) {
        if (indexAttr) {
          positionsForWorker = new Float32Array(posAttr.array);
          const src = indexAttr.array as ArrayLike<number>;
          const dst = new Uint32Array(indexAttr.count);
          for (let t = 0; t < indexAttr.count; t += 3) {
            dst[t]     = src[t];
            dst[t + 1] = src[t + 2];
            dst[t + 2] = src[t + 1];
          }
          indexForWorker = dst;
        } else {
          // Non-indexed: copy positions and swap the 2nd / 3rd vertex of
          // every triangle in-place in the copy.
          const src = posAttr.array as ArrayLike<number>;
          const out = new Float32Array(src.length);
          for (let t = 0; t < posAttr.count; t += 3) {
            const base = t * 3;
            // v0 unchanged
            out[base + 0] = src[base + 0];
            out[base + 1] = src[base + 1];
            out[base + 2] = src[base + 2];
            // v1 <- original v2
            out[base + 3] = src[base + 6];
            out[base + 4] = src[base + 7];
            out[base + 5] = src[base + 8];
            // v2 <- original v1
            out[base + 6] = src[base + 3];
            out[base + 7] = src[base + 4];
            out[base + 8] = src[base + 5];
          }
          positionsForWorker = out;
          indexForWorker = null;
        }
      } else {
        positionsForWorker = new Float32Array(posAttr.array);
        indexForWorker = indexAttr ? new Uint32Array(indexAttr.array) : null;
      }

      const per = (obj as { perObjectSettings?: Record<string, unknown> }).perObjectSettings;
      const filteredOverrides = per && Object.keys(per).length > 0
        // Drop undefined entries — those represent "inherit global" and should
        // not override the profile.
        ? Object.fromEntries(Object.entries(per).filter(([, v]) => v !== undefined))
        : undefined;
      geometryData.push({
        positions: positionsForWorker,
        index: indexForWorker,
        transformElements: new Float32Array(transform.elements),
        overrides: filteredOverrides && Object.keys(filteredOverrides).length > 0 ? filteredOverrides : undefined,
        objectName: obj.name,
      });
    }

    if (geometryData.length === 0) {
      set({
        sliceProgress: {
          stage: 'error', percent: 0, currentLayer: 0, totalLayers: 0,
          message: 'No objects with geometry on the build plate.',
        },
      });
      return;
    }

    const requestId = nextSliceRequestId();

    set({
      sliceProgress: {
        stage: 'preparing', percent: 0, currentLayer: 0, totalLayers: 0,
        message: 'Sending geometry to slicer...',
      },
      sliceResult: null,
    });
    setWorkerBusy(true);

    const worker = getSlicerWorker((e: MessageEvent) => {
      const { type, requestId: messageRequestId } = e.data as { type?: string; requestId?: number };
      if (messageRequestId !== requestId || requestId !== getActiveSliceRequestId()) return;
      if (type === 'progress') {
        set({ sliceProgress: e.data.progress as SliceProgress });
      } else if (type === 'cancelled') {
        setWorkerBusy(false);
      } else if (type === 'complete') {
        setWorkerBusy(false);
        const result = e.data.result;
        set({
          sliceResult: result,
          sliceProgress: {
            stage: 'complete', percent: 100,
            currentLayer: result.layerCount, totalLayers: result.layerCount,
            message: `Slicing complete — ${result.layerCount} layers`,
          },
          previewMode: 'preview',
          previewLayer: result.layerCount - 1,
          previewLayerStart: 0,
          previewLayerMax: result.layerCount - 1,
          previewSimTime: 0,
          previewSimPlaying: false,
        });
      } else if (type === 'error') {
        setWorkerBusy(false);
        set({
          sliceProgress: {
            stage: 'error', percent: 0, currentLayer: 0, totalLayers: 0,
            message: `Slicing failed: ${e.data.message}`,
          },
        });
      }
    });

    // Transfer typed arrays so the worker receives them without copying.
    const transferables: Transferable[] = geometryData.flatMap((g) => {
      const list: Transferable[] = [g.positions.buffer, g.transformElements.buffer];
      if (g.index) list.push(g.index.buffer);
      return list;
    });

    worker.postMessage(
      {
        type: 'slice',
        requestId,
        payload: { geometryData, printerProfile, materialProfile, printProfile },
      },
      transferables,
    );
  },

  cancelSlice: () => {
    const requestId = getActiveSliceRequestId();
    const worker = getCurrentSlicerWorker();
    if (isWorkerBusy() && worker) {
      worker.postMessage({ type: 'cancel', requestId });
    }
    set({
      sliceProgress: {
        stage: 'idle', percent: 0, currentLayer: 0, totalLayers: 0,
        message: 'Slicing cancelled',
      },
    });
  },

  setSliceProgress: (progress) => set({ sliceProgress: progress }),

  ...createPreviewActions({ set, get }),
}),
{
  name: 'dzign3d-slicer-plate',
  storage: idbStorage as unknown as PersistStorage<SlicerStore, unknown>,

  partialize: ((state) => ({
    // Profiles — user-managed, must survive page reload
    printerProfiles: state.printerProfiles,
    materialProfiles: state.materialProfiles,
    printProfiles: state.printProfiles,

    // Active selections
    activePrinterProfileId: state.activePrinterProfileId,
    activeMaterialProfileId: state.activeMaterialProfileId,
    activePrintProfileId: state.activePrintProfileId,

    // Per-printer last-used profile memory
    printerLastMaterial: state.printerLastMaterial,
    printerLastPrint: state.printerLastPrint,

    // Plate objects (geometry serialized to plain JSON)
    plateObjects: state.plateObjects.map((obj) => ({
      ...obj,
      geometry: serializeGeom(obj.geometry),
    })),
    selectedPlateObjectId: state.selectedPlateObjectId,
    transformMode: state.transformMode,
  }) as unknown as SlicerStore) as (state: SlicerStore) => SlicerStore,

  onRehydrateStorage: () => (state) => {
    if (!state) return;

    // Restore plate geometry
    if (state.plateObjects) {
      state.plateObjects = state.plateObjects.map((obj) => ({
        ...obj,
        geometry: obj.geometry && !(obj.geometry instanceof THREE.BufferGeometry)
          ? deserializeGeom(obj.geometry as unknown as SerializedGeom)
          : obj.geometry,
      })) as PlateObject[];
    }

    // If IDB had no profiles (fresh install or cleared storage), fall back to
    // built-in defaults so the app is never left with an empty profile list.
    if (!state.printerProfiles?.length)  state.printerProfiles  = DEFAULT_PRINTER_PROFILES;
    if (!state.materialProfiles?.length) state.materialProfiles = DEFAULT_MATERIAL_PROFILES;
    if (!state.printProfiles?.length)    state.printProfiles    = DEFAULT_PRINT_PROFILES;

    // Ensure active IDs still point to existing profiles (they may have been
    // deleted in another session or the saved ID may predate a default-reset).
    const hasPrinter  = state.printerProfiles.some((p) => p.id === state.activePrinterProfileId);
    const hasMaterial = state.materialProfiles.some((m) => m.id === state.activeMaterialProfileId);
    const hasPrint    = state.printProfiles.some((p)    => p.id === state.activePrintProfileId);
    if (!hasPrinter)  state.activePrinterProfileId  = state.printerProfiles[0]?.id  ?? '';
    if (!hasMaterial) state.activeMaterialProfileId = state.materialProfiles[0]?.id ?? '';
    if (!hasPrint)    state.activePrintProfileId    = state.printProfiles[0]?.id    ?? '';
  },
}));

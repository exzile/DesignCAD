import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildBox, sliceGeometry } from './_helpers/slicerSystemHelpers';
import { useSlicerStore } from '../store/slicerStore';
import {
  DEFAULT_MATERIAL_PROFILES,
  DEFAULT_PRINTER_PROFILES,
  DEFAULT_PRINT_PROFILES,
} from '../types/slicer';
import type { PlateObject } from '../types/slicer';

const workerMock = vi.hoisted(() => {
  let busy = false;
  let activeRequestId = 0;
  const worker = {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    onmessage: null as ((event: MessageEvent) => void) | null,
  };
  return {
    worker,
    reset: () => {
      busy = false;
      activeRequestId = 0;
      worker.postMessage.mockClear();
      worker.terminate.mockClear();
      worker.onmessage = null;
    },
    getSlicerWorker: vi.fn((onMessage: (event: MessageEvent) => void) => {
      worker.onmessage = onMessage;
      return worker;
    }),
    getCurrentSlicerWorker: vi.fn(() => worker),
    isWorkerBusy: vi.fn(() => busy),
    setWorkerBusy: vi.fn((nextBusy: boolean) => {
      busy = nextBusy;
    }),
    nextSliceRequestId: vi.fn(() => {
      activeRequestId += 1;
      return activeRequestId;
    }),
    getActiveSliceRequestId: vi.fn(() => activeRequestId),
    resetSlicerWorker: vi.fn(() => {
      busy = false;
    }),
  };
});

vi.mock('../store/slicer/worker', () => ({
  getSlicerWorker: workerMock.getSlicerWorker,
  getCurrentSlicerWorker: workerMock.getCurrentSlicerWorker,
  isWorkerBusy: workerMock.isWorkerBusy,
  setWorkerBusy: workerMock.setWorkerBusy,
  nextSliceRequestId: workerMock.nextSliceRequestId,
  getActiveSliceRequestId: workerMock.getActiveSliceRequestId,
  resetSlicerWorker: workerMock.resetSlicerWorker,
}));

function makePlateObject(geometry: THREE.BufferGeometry): PlateObject {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox ?? new THREE.Box3();
  return {
    id: 'plate-object-1',
    name: 'Settings propagation box',
    featureId: 'feature-1',
    geometry,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    boundingBox: {
      min: { x: box.min.x, y: box.min.y, z: box.min.z },
      max: { x: box.max.x, y: box.max.y, z: box.max.z },
    },
  };
}

describe('Slicer settings propagation', () => {
  beforeEach(() => {
    workerMock.reset();
    useSlicerStore.setState({
      printerProfiles: DEFAULT_PRINTER_PROFILES,
      materialProfiles: DEFAULT_MATERIAL_PROFILES,
      printProfiles: DEFAULT_PRINT_PROFILES,
      activePrinterProfileId: DEFAULT_PRINTER_PROFILES[0].id,
      activeMaterialProfileId: DEFAULT_MATERIAL_PROFILES[0].id,
      activePrintProfileId: DEFAULT_PRINT_PROFILES[0].id,
      plateObjects: [],
      selectedPlateObjectId: null,
      sliceProgress: {
        stage: 'idle',
        percent: 0,
        currentLayer: 0,
        totalLayers: 0,
        message: '',
      },
      sliceResult: null,
      previewMode: 'model',
      previewLayer: 0,
      previewLayerStart: 0,
      previewLayerMax: 0,
    });
  });

  it('sends the active right-panel print profile values to the slicer worker', () => {
    const state = useSlicerStore.getState();
    state.updatePrintProfile(state.activePrintProfileId, {
      layerHeight: 0.31,
      firstLayerHeight: 0.31,
      wallCount: 4,
      infillDensity: 7,
      supportEnabled: true,
    });
    useSlicerStore.setState({
      plateObjects: [makePlateObject(buildBox(12, 12, 2))],
    });

    useSlicerStore.getState().startSlice();

    expect(workerMock.worker.postMessage).toHaveBeenCalledTimes(1);
    const [message] = workerMock.worker.postMessage.mock.calls[0];
    expect(message.payload.printProfile).toMatchObject({
      layerHeight: 0.31,
      firstLayerHeight: 0.31,
      wallCount: 4,
      infillDensity: 7,
      supportEnabled: true,
    });
  });

  it('uses print profile layer height when producing preview layers', async () => {
    const coarse = await sliceGeometry(buildBox(10, 10, 2), {
      layerHeight: 0.4,
      firstLayerHeight: 0.4,
    });
    const fine = await sliceGeometry(buildBox(10, 10, 2), {
      layerHeight: 0.1,
      firstLayerHeight: 0.1,
    });

    expect(fine.layerCount).toBeGreaterThan(coarse.layerCount);
    expect(fine.layers.length).toBe(fine.layerCount);
    expect(coarse.layers.length).toBe(coarse.layerCount);
  }, 60_000);
});

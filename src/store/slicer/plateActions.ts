import * as THREE from 'three';
import type { StoreApi } from 'zustand';
import type { PlateObject } from '../../types/slicer';
import { isBufferGeometry } from './persistence';
import type { SlicerStore } from '../slicerStore';

type PlateActionSlice = Pick<
  SlicerStore,
  | 'addToPlate'
  | 'removeFromPlate'
  | 'selectPlateObject'
  | 'updatePlateObject'
  | 'autoArrange'
  | 'clearPlate'
  | 'importFileToPlate'
>;

export function createPlateActions({
  set,
  get,
}: {
  set: StoreApi<SlicerStore>['setState'];
  get: StoreApi<SlicerStore>['getState'];
}): PlateActionSlice {
  return {
  addToPlate: (featureId, name, geometry) => {
    const bbox = new THREE.Box3();
    if (isBufferGeometry(geometry)) {
      geometry.computeBoundingBox();
      if (geometry.boundingBox) {
        bbox.copy(geometry.boundingBox);
      }
    }

    const isEmptyBbox = !isFinite(bbox.min.x) || !isFinite(bbox.max.x);
    const safeBbox = isEmptyBbox
      ? { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } }
      : { min: { x: bbox.min.x, y: bbox.min.y, z: bbox.min.z }, max: { x: bbox.max.x, y: bbox.max.y, z: bbox.max.z } };

    const plateObject: PlateObject = {
      id: crypto.randomUUID(),
      featureId,
      name,
      geometry,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      boundingBox: safeBbox,
    };

    set((state) => ({
      plateObjects: [...state.plateObjects, plateObject],
      selectedPlateObjectId: plateObject.id,
    }));

    get().autoArrange();
  },

  removeFromPlate: (id) => set((state) => ({
    plateObjects: state.plateObjects.filter((o) => o.id !== id),
    selectedPlateObjectId: state.selectedPlateObjectId === id ? null : state.selectedPlateObjectId,
    sliceResult: null,
    previewMode: 'model',
    previewLayer: 0,
    previewLayerStart: 0,
    previewLayerMax: 0,
    previewSimEnabled: false,
    previewSimPlaying: false,
    previewSimTime: 0,
  })),

  selectPlateObject: (id) => set({ selectedPlateObjectId: id }),

  updatePlateObject: (id, updates) => set((state) => ({
    plateObjects: state.plateObjects.map((o) =>
      o.id === id ? { ...o, ...updates } : o,
    ),
  })),

  autoArrange: () => {
    const { plateObjects, getActivePrinterProfile } = get();
    if (plateObjects.length === 0) return;

    const printer = getActivePrinterProfile();
    const bedWidth = printer?.buildVolume?.x ?? 220;
    const bedDepth = printer?.buildVolume?.y ?? 220;
    const spacing = 10;

    type Cell = {
      obj: typeof plateObjects[0];
      gridX: number;
      gridY: number;
      w: number;
      d: number;
      minX: number;
      minY: number;
      minZ: number;
    };

    const cells: Cell[] = [];
    let curX = 0;
    let curY = 0;
    let rowH = 0;
    let layoutW = 0;
    let layoutD = 0;

    for (const obj of plateObjects) {
      const sx = obj.scale?.x ?? 1;
      const sy = obj.scale?.y ?? 1;
      const sz = obj.scale?.z ?? 1;

      const rawW = (obj.boundingBox.max.x - obj.boundingBox.min.x) * sx;
      const rawD = (obj.boundingBox.max.y - obj.boundingBox.min.y) * sy;
      const w = isFinite(rawW) && rawW > 0 ? rawW : 50;
      const d = isFinite(rawD) && rawD > 0 ? rawD : 50;

      const minX = isFinite(obj.boundingBox.min.x) ? obj.boundingBox.min.x * sx : 0;
      const minY = isFinite(obj.boundingBox.min.y) ? obj.boundingBox.min.y * sy : 0;
      const minZ = isFinite(obj.boundingBox.min.z) ? obj.boundingBox.min.z * sz : 0;

      if (cells.length > 0 && curX + w > bedWidth) {
        layoutW = Math.max(layoutW, curX - spacing);
        curX = 0;
        curY += rowH + spacing;
        rowH = 0;
      }

      cells.push({ obj, gridX: curX, gridY: curY, w, d, minX, minY, minZ });
      curX += w + spacing;
      rowH = Math.max(rowH, d);
      layoutW = Math.max(layoutW, curX - spacing);
      layoutD = curY + rowH;
    }

    const offsetX = (bedWidth - layoutW) / 2;
    const offsetY = (bedDepth - layoutD) / 2;

    const arranged = cells.map(({ obj, gridX, gridY, minX, minY, minZ }) => ({
      ...obj,
      position: {
        x: offsetX + gridX - minX,
        y: offsetY + gridY - minY,
        z: -minZ,
      },
    }));

    set({ plateObjects: arranged });
  },

  clearPlate: () => set({
    plateObjects: [],
    selectedPlateObjectId: null,
    sliceResult: null,
    previewMode: 'model',
    previewLayer: 0,
    previewLayerStart: 0,
    previewLayerMax: 0,
    previewSimEnabled: false,
    previewSimPlaying: false,
    previewSimTime: 0,
  }),

  importFileToPlate: async (file: File) => {
    try {
      const { FileImporter } = await import('../../engine/FileImporter');
      const group = await FileImporter.importFile(file);

      let geometry: THREE.BufferGeometry | null = null;
      group.traverse((child) => {
        if (geometry) return;
        if ((child as THREE.Mesh).isMesh) {
          geometry = (child as THREE.Mesh).geometry as THREE.BufferGeometry;
        }
      });

      if (!geometry) {
        throw new Error('No mesh geometry found in file');
      }

      const geom = geometry as THREE.BufferGeometry;
      geom.computeBoundingBox();
      const bbox = geom.boundingBox ?? new THREE.Box3();

      const plateObject = {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^.]+$/, ''),
        geometry: geom,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        boundingBox: {
          min: { x: bbox.min.x, y: bbox.min.y, z: bbox.min.z },
          max: { x: bbox.max.x, y: bbox.max.y, z: bbox.max.z },
        },
      };

      set((state) => ({
        plateObjects: [...state.plateObjects, plateObject],
        selectedPlateObjectId: plateObject.id,
      }));

      get().autoArrange();
    } catch (err) {
      console.error('File import failed:', err);
      throw err;
    }
  },
  };
}

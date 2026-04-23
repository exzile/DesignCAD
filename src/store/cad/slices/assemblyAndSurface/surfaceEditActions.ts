import * as THREE from 'three';
import type { Feature } from '../../../../types/cad';
import { GeometryEngine } from '../../../../engine/GeometryEngine';
import type { CADSliceContext } from '../../sliceContext';
import type { CADState } from '../../state';

const SURFACE_MATERIAL = () =>
  new THREE.MeshPhysicalMaterial({
    color: 0x8899aa,
    metalness: 0.3,
    roughness: 0.4,
    side: THREE.DoubleSide,
  });

function configureMesh(geom: THREE.BufferGeometry) {
  const mesh = new THREE.Mesh(geom, SURFACE_MATERIAL());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createSurfaceEditActions({ set, get }: CADSliceContext): Partial<CADState> {
  return {
    showDeleteFaceDialog: false,
    deleteFaceIds: [],
    openDeleteFaceDialog: () => set({ activeDialog: 'delete-face', showDeleteFaceDialog: true, deleteFaceIds: [] }),
    addDeleteFace: (id) =>
      set((s) => ({
        deleteFaceIds: s.deleteFaceIds.includes(id) ? s.deleteFaceIds : [...s.deleteFaceIds, id],
      })),
    clearDeleteFaces: () => set({ deleteFaceIds: [] }),
    closeDeleteFaceDialog: () => set({ activeDialog: null, showDeleteFaceDialog: false, deleteFaceIds: [] }),
    commitDeleteFace: (params) => {
      const { features } = get();
      const n = features.filter((f) => f.params?.featureKind === 'delete-face').length + 1;
      const faceIds = params.faceIds.length > 0 ? params.faceIds : get().deleteFaceIds;
      const feature: Feature = {
        id: crypto.randomUUID(),
        name: `Delete Face ${n}`,
        type: 'thicken',
        params: { featureKind: 'delete-face', faceIds: faceIds.join(','), healMode: params.healMode },
        visible: true,
        suppressed: false,
        timestamp: Date.now(),
        bodyKind: 'surface',
      };
      get().addFeature(feature);
      set({ activeDialog: null, showDeleteFaceDialog: false, deleteFaceIds: [] });
      get().setStatusMessage(`Delete Face ${n}: ${faceIds.length} face${faceIds.length !== 1 ? 's' : ''} removed`);
    },

    commitSurfaceTrim: (params) => {
      const { features } = get();
      const n = features.filter((f) => f.params?.featureKind === 'surface-trim').length + 1;
      const feature: Feature = {
        id: crypto.randomUUID(),
        name: `Surface Trim ${n}`,
        type: 'split-body',
        params: { featureKind: 'surface-trim', ...params },
        visible: true,
        suppressed: false,
        timestamp: Date.now(),
        bodyKind: 'surface',
      };
      get().addFeature(feature);
      get().setStatusMessage(`Surface Trim ${n} created`);
    },

    commitSurfaceSplit: (params) => {
      const { features } = get();
      const n = features.filter((f) => f.params?.featureKind === 'surface-split').length + 1;
      const source = features.find((f) => f.id === params.sourceFeatureId)?.mesh as THREE.Mesh | undefined;
      const splitterMesh = features.find((f) => f.id === params.splitterFeatureId)?.mesh as THREE.Mesh | undefined;
      const newFeatures: Feature[] = [];
      if (source && splitterMesh) {
        const geos = GeometryEngine.splitSurface(source, splitterMesh);
        geos.forEach((g, idx) => {
          newFeatures.push({
            id: crypto.randomUUID(),
            name: `Surface Split ${n}${geos.length > 1 ? `-${idx + 1}` : ''}`,
            type: 'split-body',
            params: { featureKind: 'surface-split', ...params, pieceIndex: idx },
            mesh: configureMesh(g),
            visible: true,
            suppressed: false,
            timestamp: Date.now(),
            bodyKind: 'surface',
          });
        });
      } else {
        const geom = new THREE.PlaneGeometry(10, 10);
        newFeatures.push({
          id: crypto.randomUUID(),
          name: `Surface Split ${n}`,
          type: 'split-body',
          params: { featureKind: 'surface-split', ...params, placeholder: 1 },
          mesh: configureMesh(geom),
          visible: true,
          suppressed: false,
          timestamp: Date.now(),
          bodyKind: 'surface',
        });
      }
      set({ features: [...features, ...newFeatures] });
      get().setStatusMessage(`Surface Split ${n}: ${newFeatures.length} piece${newFeatures.length !== 1 ? 's' : ''}`);
    },

    commitUntrim: (params) => {
      const { features } = get();
      const n = features.filter((f) => f.params?.featureKind === 'surface-untrim').length + 1;
      const feature: Feature = {
        id: crypto.randomUUID(),
        name: `Untrim ${n}`,
        type: 'split-body',
        params: { featureKind: 'surface-untrim', ...params },
        visible: true,
        suppressed: false,
        timestamp: Date.now(),
        bodyKind: 'surface',
      };
      get().addFeature(feature);
      get().setStatusMessage(`Untrim ${n} created`);
    },

    commitOffsetSurface: (params) => {
      const { features } = get();
      const n = features.filter((f) => f.params?.featureKind === 'offset-surface').length + 1;
      const sourceMesh = [...features]
        .reverse()
        .find((f) => f.mesh && (f.mesh as THREE.Mesh).isMesh && f.bodyKind === 'surface')?.mesh as THREE.Mesh | undefined;
      const signedDistance =
        params.direction === 'inward' ? -params.offsetDistance : params.offsetDistance;
      const mesh = sourceMesh
        ? configureMesh(GeometryEngine.offsetSurface(sourceMesh, signedDistance))
        : undefined;

      const feature: Feature = {
        id: crypto.randomUUID(),
        name: `Offset Surface ${n}`,
        type: 'offset-face',
        params: { featureKind: 'offset-surface', ...params },
        mesh,
        visible: true,
        suppressed: false,
        timestamp: Date.now(),
        bodyKind: 'surface',
      };
      get().addFeature(feature);
      get().setStatusMessage(`Offset Surface ${n} created`);
    },

    commitSurfaceExtend: (params) => {
      const { features } = get();
      const n = features.filter((f) => f.params?.featureKind === 'surface-extend').length + 1;
      const sourceMesh = [...features]
        .reverse()
        .find((f) => f.mesh && (f.mesh as THREE.Mesh).isMesh && f.bodyKind === 'surface')?.mesh as THREE.Mesh | undefined;
      const mode =
        params.extensionType === 'natural'
          ? 'natural'
          : params.extensionType === 'linear'
            ? 'perpendicular'
            : 'tangent';
      const mesh = sourceMesh
        ? configureMesh(GeometryEngine.extendSurface(sourceMesh, params.extendDistance, mode))
        : undefined;
      const feature: Feature = {
        id: crypto.randomUUID(),
        name: `Surface Extend ${n}`,
        type: 'direct-edit',
        params: { featureKind: 'surface-extend', ...params },
        mesh,
        visible: true,
        suppressed: false,
        timestamp: Date.now(),
        bodyKind: 'surface',
      };
      get().addFeature(feature);
      get().setStatusMessage(`Surface Extend ${n} created`);
    },

    commitStitch: (params) => {
      const { features } = get();
      const n = features.filter((f) => f.params?.featureKind === 'stitch').length + 1;
      const selected = params.sourceFeatureIds.length > 0
        ? features.filter((f) => params.sourceFeatureIds.includes(f.id) && f.mesh && f.bodyKind === 'surface')
        : [];
      const sourceMeshes = (selected.length > 0
        ? selected
        : features.filter((f) => f.mesh && f.bodyKind === 'surface')).map((f) => f.mesh as THREE.Mesh);
      const stitched = sourceMeshes.length > 0
        ? GeometryEngine.stitchSurfaces(sourceMeshes, params.tolerance)
        : null;
      const mesh = stitched ? configureMesh(stitched.geometry) : undefined;
      const feature: Feature = {
        id: crypto.randomUUID(),
        name: `Stitch ${n}`,
        type: 'combine',
        params: { featureKind: 'stitch', ...params },
        mesh,
        visible: true,
        suppressed: false,
        timestamp: Date.now(),
        bodyKind: stitched?.isSolid ? 'solid' : 'surface',
      };
      get().addFeature(feature);
      if (!params.keepOriginal && params.sourceFeatureIds.length > 0) {
        set({
          features: features.map((f) => (params.sourceFeatureIds.includes(f.id) ? { ...f, visible: false } : f)),
        });
      }
      get().setStatusMessage(`Stitch ${n} created`);
    },

    commitUnstitch: (params) => {
      const { features } = get();
      const n = features.filter((f) => f.params?.featureKind === 'unstitch').length + 1;
      const sourceMesh = features.find((f) => f.id === params.sourceFeatureId)?.mesh as THREE.Mesh | undefined;
      const newFeatures: Feature[] = [];
      if (sourceMesh) {
        const geos = GeometryEngine.unstitchSurface(sourceMesh);
        geos.forEach((g, idx) => {
          newFeatures.push({
            id: crypto.randomUUID(),
            name: `Surface Face ${n}${geos.length > 1 ? `-${idx + 1}` : ''}`,
            type: 'split-body',
            params: {
              featureKind: 'unstitch',
              sourceFeatureId: params.sourceFeatureId,
              faceIndex: idx,
              keepOriginal: params.keepOriginal ? 1 : 0,
            },
            mesh: configureMesh(g),
            visible: true,
            suppressed: false,
            timestamp: Date.now(),
            bodyKind: 'surface',
          });
        });
      } else {
        newFeatures.push({
          id: crypto.randomUUID(),
          name: `Unstitch ${n}`,
          type: 'split-body',
          params: {
            featureKind: 'unstitch',
            sourceFeatureId: params.sourceFeatureId,
            keepOriginal: params.keepOriginal ? 1 : 0,
          },
          visible: true,
          suppressed: false,
          timestamp: Date.now(),
          bodyKind: 'surface',
        });
      }

      const nextFeatures = params.keepOriginal
        ? features
        : features.map((f) => (f.id === params.sourceFeatureId ? { ...f, visible: false } : f));
      set({ features: [...nextFeatures, ...newFeatures] });
      get().setStatusMessage(`Unstitch ${n}: separated into ${newFeatures.length} face${newFeatures.length !== 1 ? 's' : ''}`);
    },

    commitThicken: (params) => {
      const { features } = get();
      const n = features.filter((f) => f.params?.featureKind === 'thicken-solid').length + 1;
      const sourceMesh = [...features]
        .reverse()
        .find((f) => f.mesh && (f.mesh as THREE.Mesh).isMesh && f.bodyKind === 'surface')?.mesh as THREE.Mesh | undefined;
      const mesh = sourceMesh
        ? configureMesh(GeometryEngine.thickenSurface(sourceMesh, params.thickness, params.direction))
        : undefined;
      const feature: Feature = {
        id: crypto.randomUUID(),
        name: `Thicken (${params.thickness}mm, ${params.direction})`,
        type: 'thicken',
        params: { featureKind: 'thicken-solid', ...params },
        mesh,
        visible: true,
        suppressed: false,
        timestamp: Date.now(),
        bodyKind: 'solid',
      };
      get().addFeature(feature);
      get().setStatusMessage(`Thicken ${n}: ${params.thickness}mm ${params.direction}`);
    },
  };
}

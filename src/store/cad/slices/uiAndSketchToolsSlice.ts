import * as THREE from 'three';
import type { Feature, Parameter } from '../../../types/cad';
import { evaluateExpression, resolveParameters } from '../../../utils/expressionEval';
import { useComponentStore } from '../../componentStore';
import type { CADSliceContext } from '../sliceContext';
import type { CADState } from '../state';

export function createUiAndSketchToolsSlice({ set, get }: CADSliceContext) {
  const slice: Partial<CADState> = {
  showExportDialog: false,
  setShowExportDialog: (show) => set({ showExportDialog: show }),

  // D6 Fillet edge selection
  filletEdgeIds: [],
  addFilletEdge: (id) => set((state) => ({
    filletEdgeIds: state.filletEdgeIds.includes(id) ? state.filletEdgeIds : [...state.filletEdgeIds, id],
  })),
  removeFilletEdge: (id) => set((state) => ({ filletEdgeIds: state.filletEdgeIds.filter((e) => e !== id) })),
  clearFilletEdges: () => set({ filletEdgeIds: [] }),

  // D7 Chamfer edge selection
  chamferEdgeIds: [],
  addChamferEdge: (id) => set((state) => ({
    chamferEdgeIds: state.chamferEdgeIds.includes(id) ? state.chamferEdgeIds : [...state.chamferEdgeIds, id],
  })),
  removeChamferEdge: (id) => set((state) => ({ chamferEdgeIds: state.chamferEdgeIds.filter((e) => e !== id) })),
  clearChamferEdges: () => set({ chamferEdgeIds: [] }),

  activeDialog: null,
  setActiveDialog: (dialog) => set((state) => ({
    activeDialog: dialog,
    // D186: closing the dialog also clears editing state so the next one opens fresh
    editingFeatureId: dialog === null ? null : state.editingFeatureId,
    // Clear edge selections when closing fillet/chamfer dialogs
    filletEdgeIds: dialog === 'fillet' ? [] : state.filletEdgeIds,
    chamferEdgeIds: dialog === 'chamfer' ? [] : state.chamferEdgeIds,
  })),
  dialogPayload: null,
  setDialogPayload: (payload) => set({ dialogPayload: payload }),

  measurePoints: [],
  setMeasurePoints: (pts) => set({ measurePoints: pts }),
  clearMeasure: () => set({ measurePoints: [] }),

  statusMessage: 'Ready',
  setStatusMessage: (message) => set({ statusMessage: message }),

  units: 'mm',
  setUnits: (units) => set({ units: units }),
  selectionFilter: { bodies: true, faces: true, edges: true, vertices: true, sketches: true, construction: true },
  setSelectionFilter: (f) => set((state) => ({ selectionFilter: { ...state.selectionFilter, ...f } })),

  // D207 — Sketch Grid / Snap settings
  sketchGridEnabled: true,
  sketchSnapEnabled: true,
  setSketchGridEnabled: (v) => set({ sketchGridEnabled: v }),
  setSketchSnapEnabled: (v) => set({ sketchSnapEnabled: v }),

  cameraHomeCounter: 0,
  triggerCameraHome: () => set((state) => ({ cameraHomeCounter: state.cameraHomeCounter + 1 })),
  cameraNavMode: null,
  setCameraNavMode: (mode) => set({ cameraNavMode: mode }),
  // NAV-19
  viewportLayout: '1',
  setViewportLayout: (layout) => set({ viewportLayout: layout }),
  zoomToFitCounter: 0,
  triggerZoomToFit: () => set((state) => ({ zoomToFitCounter: state.zoomToFitCounter + 1 })),
  zoomWindowTrigger: null,
  triggerZoomWindow: (rect) => set({ zoomWindowTrigger: rect }),
  clearZoomWindow: () => set({ zoomWindowTrigger: null }),

  parameters: [],
  addParameter: (name, expression, description, group) => {
    const newParam: Parameter = {
      id: crypto.randomUUID(),
      name,
      expression,
      value: NaN,
      description,
      group,
    };
    set((state) => ({
      parameters: resolveParameters([...state.parameters, newParam]),
    }));
  },
  updateParameter: (id, updates) => {
    set((state) => {
      const updated = state.parameters.map(p =>
        p.id === id ? { ...p, ...updates } : p
      );
      return { parameters: resolveParameters(updated) };
    });
  },
  removeParameter: (id) => {
    set((state) => ({
      parameters: resolveParameters(state.parameters.filter(p => p.id !== id)),
    }));
  },
  evaluateExpression: (expr) => {
    return evaluateExpression(expr, get().parameters);
  },

  // A5 — delegates to componentStore.setComponentGrounded so callers reaching
  // for the cadStore facade still get a working ground/unground action.
  // Previously this was a void-stub that silently did nothing.
  groundComponent: (id, grounded) => {
    useComponentStore.getState().setComponentGrounded(id, grounded);
  },

  // A9 — Component Pattern
  createComponentPattern: (sourceId, type, params) => {
    const componentStore = useComponentStore.getState();
    const { components, bodies } = componentStore;
    const source = components[sourceId];
    if (!source) return;

    const axisVec = (a: 'X' | 'Y' | 'Z'): THREE.Vector3 =>
      a === 'X' ? new THREE.Vector3(1, 0, 0) : a === 'Y' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);

    const n = type === 'linear' ? params.count : params.circularCount;
    const parentId = source.parentId ?? componentStore.rootComponentId;

    for (let i = 1; i < n; i++) {
      let offsetMatrix: THREE.Matrix4;
      if (type === 'linear') {
        const dir = axisVec(params.axis).multiplyScalar(params.spacing * i);
        offsetMatrix = new THREE.Matrix4().makeTranslation(dir.x, dir.y, dir.z);
      } else {
        const angle = ((Math.PI * 2) / n) * i;
        offsetMatrix = new THREE.Matrix4().makeRotationAxis(axisVec(params.circularAxis), angle);
      }

      // Create new child component for this copy
      const newCompId = componentStore.addComponent(parentId, `${source.name} (${i + 1})`);

      // Clone each body from the source into the new component
      for (const bodyId of source.bodyIds) {
        const srcBody = bodies[bodyId];
        if (!srcBody || !srcBody.mesh) continue;
        const srcMesh = srcBody.mesh as THREE.Mesh;
        const clonedMesh = srcMesh.clone();
        clonedMesh.applyMatrix4(offsetMatrix);
        clonedMesh.userData.pickable = true;

        const newBodyId = componentStore.addBody(newCompId, `${srcBody.name} (${i + 1})`);
        componentStore.setBodyMesh(newBodyId, clonedMesh as THREE.Mesh);
      }
    }

    const feature: Feature = {
      id: crypto.randomUUID(),
      name: `Component Pattern (${type}, ×${n})`,
      type: 'linear-pattern',
      params: { sourceComponentId: sourceId, patternType: type, ...params },
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
    };

    get().addFeature(feature);
    get().setStatusMessage(`Component pattern: ${n - 1} cop${n - 1 === 1 ? 'y' : 'ies'} created`);
  },

  // ─── D12: Sketch Text ─────────────────────────────────────────────────────
  sketchTextContent: 'Text',
  sketchTextHeight: 5,
  sketchTextFont: 'default',
  sketchTextBold: false,
  sketchTextItalic: false,
  setSketchTextContent: (v) => set({ sketchTextContent: v }),
  setSketchTextHeight: (v) => set({ sketchTextHeight: v }),
  setSketchTextFont: (v) => set({ sketchTextFont: v }),
  setSketchTextBold: (v) => set({ sketchTextBold: v }),
  setSketchTextItalic: (v) => set({ sketchTextItalic: v }),
  startSketchTextTool: () => {
    const { activeSketch } = get();
    if (!activeSketch) {
      set({ statusMessage: 'Open a sketch first before using Sketch Text' });
      return;
    }
    set({ activeTool: 'sketch-text', statusMessage: 'Sketch Text — click on the sketch to place text' });
  },
  commitSketchTextEntities: (segments) => {
    const { activeSketch } = get();
    if (!activeSketch) return;
    const newEntities = segments.map((seg) => ({
      id: crypto.randomUUID(),
      type: 'line' as const,
      points: [
        { id: crypto.randomUUID(), x: seg.x1, y: seg.y1, z: seg.z1 },
        { id: crypto.randomUUID(), x: seg.x2, y: seg.y2, z: seg.z2 },
      ],
    }));
    set({
      activeSketch: {
        ...activeSketch,
        entities: [...activeSketch.entities, ...newEntities],
      },
      activeTool: 'select',
      statusMessage: 'Text placed',
    });
  },
  cancelSketchTextTool: () => set({ activeTool: 'select', statusMessage: 'Sketch Text cancelled' }),

  // ─── D28: Dimension tool ──────────────────────────────────────────────────
  activeDimensionType: 'linear',
  dimensionOffset: 10,
  dimensionDrivenMode: false,
  dimensionOrientation: 'auto',
  dimensionToleranceMode: 'none',
  dimensionToleranceUpper: 0.1,
  dimensionToleranceLower: 0.1,
  pendingDimensionEntityIds: [],
  setActiveDimensionType: (t) => set({ activeDimensionType: t }),
  setDimensionOffset: (v) => set({ dimensionOffset: v }),
  setDimensionDrivenMode: (v) => set({ dimensionDrivenMode: v }),
  setDimensionOrientation: (v) => set({ dimensionOrientation: v }),
  setDimensionToleranceMode: (v) => set({ dimensionToleranceMode: v }),
  setDimensionToleranceUpper: (v) => set({ dimensionToleranceUpper: v }),
  setDimensionToleranceLower: (v) => set({ dimensionToleranceLower: v }),
  startDimensionTool: () => {
    const { activeSketch } = get();
    if (!activeSketch) {
      set({ statusMessage: 'Open a sketch first before using the Dimension tool' });
      return;
    }
    set({ activeTool: 'dimension', pendingDimensionEntityIds: [], statusMessage: 'Dimension — click entities to measure' });
  },
  cancelDimensionTool: () => set({ activeTool: 'select', pendingDimensionEntityIds: [], statusMessage: 'Dimension tool cancelled' }),
  addPendingDimensionEntity: (id) => set((state) => ({
    pendingDimensionEntityIds: state.pendingDimensionEntityIds.includes(id)
      ? state.pendingDimensionEntityIds
      : [...state.pendingDimensionEntityIds, id],
  })),
  addSketchDimension: (dim) => {
    const { activeSketch } = get();
    if (!activeSketch) return;
    if ((activeSketch.dimensions ?? []).some((d) => d.id === dim.id)) return;
    get().pushUndo();
    set({
      sketches: get().sketches.map((s) =>
        s.id === activeSketch.id
          ? { ...s, dimensions: [...(s.dimensions ?? []), dim] }
          : s
      ),
    });
    // CORR-7: skip auto-solve when compute is deferred
    if (!get().sketchComputeDeferred) get().solveSketch();
  },
  removeDimension: (dimId) => {
    const { activeSketch } = get();
    if (!activeSketch) return;
    set({
      sketches: get().sketches.map((s) =>
        s.id === activeSketch.id
          ? { ...s, dimensions: (s.dimensions ?? []).filter((d) => d.id !== dimId) }
          : s
      ),
    });
  },

  // ─── S10: Spline post-commit handle editing ───────────────────────────────
  editingSplineEntityId: null,
  hoveredSplinePointIndex: null,
  draggingSplinePointIndex: null,
  setEditingSplineEntityId: (id) => set({ editingSplineEntityId: id }),
  setHoveredSplinePointIndex: (i) => set({ hoveredSplinePointIndex: i }),
  setDraggingSplinePointIndex: (i) => set({ draggingSplinePointIndex: i }),
  updateSplineControlPoint: (entityId, pointIndex, x, y, z) => {
    const { activeSketch } = get();
    if (!activeSketch) return;
    const updatedEntities = activeSketch.entities.map((e) => {
      if (e.id !== entityId) return e;
      const updatedPoints = e.points.map((pt, i) => {
        if (i !== pointIndex) return pt;
        return { ...pt, x, y, z };
      });
      return { ...e, points: updatedPoints };
    });
    set({ activeSketch: { ...activeSketch, entities: updatedEntities } });
  },

  // ─── D45: Project / Include live-link toggle ──────────────────────────────
  projectLiveLink: true,
  setProjectLiveLink: (v) => set({ projectLiveLink: v }),
  cancelSketchProjectTool: () => set({ activeTool: 'select', statusMessage: 'Project cancelled' }),

  // S3 — Intersection Curve
  startSketchIntersectTool: () => set({
    activeTool: 'sketch-intersect',
    statusMessage: 'Click a solid face to create intersection curve with sketch plane',
  }),
  cancelSketchIntersectTool: () => set({
    activeTool: 'select',
    statusMessage: 'Intersection curve cancelled',
  }),

  // D46 — Project to Surface
  startSketchProjectSurfaceTool: () => set({
    activeTool: 'sketch-project-surface',
    statusMessage: 'Click a body face to project all sketch curves onto it',
  }),
  cancelSketchProjectSurfaceTool: () => set({
    activeTool: 'select',
    statusMessage: 'Project to surface cancelled',
  }),

  // ── CONSTRUCTION GEOMETRY (D175–D180) ──
  constructionPlanes: [],
  constructionAxes: [],
  constructionPoints: [],
  addConstructionPlane: (p) => set((state) => ({
    constructionPlanes: [
      ...state.constructionPlanes,
      {
        ...p,
        id: crypto.randomUUID(),
        name: 'Plane ' + (state.constructionPlanes.length + 1),
      },
    ],
  })),
  addConstructionAxis: (a) => set((state) => ({
    constructionAxes: [
      ...state.constructionAxes,
      {
        ...a,
        id: crypto.randomUUID(),
        name: 'Axis ' + (state.constructionAxes.length + 1),
      },
    ],
  })),
  addConstructionPoint: (p) => set((state) => ({
    constructionPoints: [
      ...state.constructionPoints,
      {
        ...p,
        id: crypto.randomUUID(),
        name: 'Point ' + (state.constructionPoints.length + 1),
      },
    ],
  })),
  cancelConstructTool: () => set({ activeTool: 'select' }),

  // ── D171 Replace Face ────────────────────────────────────────────────────
  replaceFaceSourceId: null,
  replaceFaceTargetId: null,
  openReplaceFaceDialog: () => set({
    activeDialog: 'replace-face',
    replaceFaceSourceId: null,
    replaceFaceTargetId: null,
  }),
  setReplaceFaceSource: (id) => set({ replaceFaceSourceId: id }),
  setReplaceFaceTarget: (id) => set({ replaceFaceTargetId: id }),
  commitReplaceFace: () => {
    const { replaceFaceSourceId, replaceFaceTargetId, features, setActiveDialog } = get();
    if (!replaceFaceSourceId || !replaceFaceTargetId) return;
    const n = features.filter((f) => f.type === 'replace-face').length + 1;
    const feature: Feature = {
      id: crypto.randomUUID(),
      name: `Replace Face ${n}`,
      type: 'replace-face',
      params: { sourceId: replaceFaceSourceId, targetId: replaceFaceTargetId },
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
    };
    get().addFeature(feature);
    setActiveDialog(null);
    set({ replaceFaceSourceId: null, replaceFaceTargetId: null });
  },

  // ── D123 Direct Edit ────────────────────────────────────────────────────
  directEditFaceId: null,
  openDirectEditDialog: () => set({
    activeDialog: 'direct-edit',
    directEditFaceId: null,
  }),
  setDirectEditFace: (id) => set({ directEditFaceId: id }),
  commitDirectEdit: (params) => {
    const { directEditFaceId, features, setActiveDialog } = get();
    get().pushUndo();
    const n = features.filter((f) => f.type === 'direct-edit').length + 1;
    const feature: Feature = {
      id: crypto.randomUUID(),
      name: `Direct Edit ${n}`,
      type: 'direct-edit',
      params: { faceId: directEditFaceId ?? '', ...params },
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
    };
    get().addFeature(feature);
    setActiveDialog(null);
    set({ directEditFaceId: null });
  },

  // ── D137 Texture Extrude ────────────────────────────────────────────────
  textureExtrudeFaceId: null,
  openTextureExtrudeDialog: () => set({
    activeDialog: 'texture-extrude',
    textureExtrudeFaceId: null,
  }),
  setTextureExtrudeFace: (id) => set({ textureExtrudeFaceId: id }),
  commitTextureExtrude: (params) => {
    const { textureExtrudeFaceId, features, setActiveDialog } = get();
    const n = features.filter((f) => f.type === 'texture-extrude').length + 1;
    const feature: Feature = {
      id: crypto.randomUUID(),
      name: `Texture Extrude ${n}`,
      type: 'texture-extrude',
      params: { faceId: textureExtrudeFaceId ?? '', ...params },
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
    };
    get().addFeature(feature);
    setActiveDialog(null);
    set({ textureExtrudeFaceId: null });
  },

  // ── D192 Decal ───────────────────────────────────────────────────────────
  decalFaceId: null,
  decalFaceNormal: null,
  decalFaceCentroid: null,
  openDecalDialog: () => set({
    activeDialog: 'decal',
    decalFaceId: null,
    decalFaceNormal: null,
    decalFaceCentroid: null,
  }),
  setDecalFace: (id, normal, centroid) => set({ decalFaceId: id, decalFaceNormal: normal, decalFaceCentroid: centroid }),
  closeDecalDialog: () => set({ activeDialog: null, decalFaceId: null, decalFaceNormal: null, decalFaceCentroid: null }),
  commitDecal: (params) => {
    const { decalFaceId, features, setActiveDialog } = get();
    const n = features.filter((f) => f.type === 'decal').length + 1;
    const feature: Feature = {
      id: crypto.randomUUID(),
      name: `Decal ${n}`,
      type: 'decal',
      params: { ...params, faceId: params.faceId ?? decalFaceId ?? '' },
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
    };
    get().addFeature(feature);
    setActiveDialog(null);
    set({ decalFaceId: null, decalFaceNormal: null, decalFaceCentroid: null });
  },

  // ── D193 Attached Canvas ─────────────────────────────────────────────────
  attachedCanvasId: null,
  openAttachedCanvasDialog: (canvasId) => set({
    activeDialog: 'attached-canvas',
    attachedCanvasId: canvasId ?? null,
  }),
  closeAttachedCanvasDialog: () => set({ activeDialog: null, attachedCanvasId: null }),
  updateCanvas: (id, changes) => set((state) => ({
    canvasReferences: state.canvasReferences.map((c) =>
      c.id === id ? { ...c, ...changes } : c
    ),
    // Also update matching feature params
    features: state.features.map((f) => {
      if (f.id !== id) return f;
      return { ...f, params: { ...f.params, ...changes } };
    }),
  })),

  // ── D182/D183 picker slices ──────────────────────────────────────────────
  lipGrooveEdgeId: null,
  setLipGrooveEdge: (id) => set({ lipGrooveEdgeId: id }),
  snapFitFaceId: null,
  setSnapFitFace: (id) => set({ snapFitFaceId: id }),

  // ── D185 Split Face ──────────────────────────────────────────────────────
  splitFaceId: null,
  openSplitFaceDialog: () => set({
    activeDialog: 'split-face',
    splitFaceId: null,
  }),
  setSplitFace: (id) => set({ splitFaceId: id }),
  closeSplitFaceDialog: () => set({ activeDialog: null, splitFaceId: null }),
  commitSplitFace: (params) => {
    const { splitFaceId, features, setActiveDialog } = get();
    const n = features.filter((f) => f.type === 'split-face').length + 1;
    const feature: Feature = {
      id: crypto.randomUUID(),
      name: `Split Face ${n}`,
      type: 'split-face',
      params: { ...params, faceId: params.faceId ?? splitFaceId ?? '' },
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
    };
    get().addFeature(feature);
    setActiveDialog(null);
    set({ splitFaceId: null });
  },

  // ── Hole face placement ──────────────────────────────────────────────────
  holeFaceId: null,
  holeFaceNormal: null,
  holeFaceCentroid: null,
  holeDraftDiameter: 5,
  holeDraftDepth: 10,
  openHoleDialog: () => set({
    activeDialog: 'hole',
    holeFaceId: null,
    holeFaceNormal: null,
    holeFaceCentroid: null,
    holeDraftDiameter: 5,
    holeDraftDepth: 10,
  }),
  setHoleFace: (id, normal, centroid) => set({
    holeFaceId: id,
    holeFaceNormal: normal,
    holeFaceCentroid: centroid,
  }),
  clearHoleFace: () => set({
    holeFaceId: null,
    holeFaceNormal: null,
    holeFaceCentroid: null,
  }),
  setHoleDraftDiameter: (d) => set({ holeDraftDiameter: d }),
  setHoleDraftDepth: (d) => set({ holeDraftDepth: d }),
  closeHoleDialog: () => set({
    activeDialog: null,
    holeFaceId: null,
    holeFaceNormal: null,
    holeFaceCentroid: null,
  }),

  // ── SOL-I2: Shell face removal selection ────────────────────────────────
  shellRemoveFaceIds: [],
  addShellRemoveFace: (id) => set((state) => ({
    shellRemoveFaceIds: state.shellRemoveFaceIds.includes(id)
      ? state.shellRemoveFaceIds
      : [...state.shellRemoveFaceIds, id],
  })),
  removeShellRemoveFace: (id) => set((state) => ({
    shellRemoveFaceIds: state.shellRemoveFaceIds.filter((x) => x !== id),
  })),
  clearShellRemoveFaces: () => set({ shellRemoveFaceIds: [] }),

  // ── SOL-I7: Shell individual face thickness overrides ────────────────────
  shellFaceThicknesses: {},
  setShellFaceThickness: (faceId, thickness) => set((state) => ({
    shellFaceThicknesses: { ...state.shellFaceThicknesses, [faceId]: thickness },
  })),
  clearShellFaceThicknesses: () => set({ shellFaceThicknesses: {} }),

  // ── SOL-I3: Draft parting line face picker ───────────────────────────────
  draftPartingFaceId: null,
  draftPartingFaceNormal: null,
  draftPartingFaceCentroid: null,
  setDraftPartingFace: (id, normal, centroid) => set({
    draftPartingFaceId: id,
    draftPartingFaceNormal: normal,
    draftPartingFaceCentroid: centroid,
  }),
  clearDraftPartingFace: () => set({
    draftPartingFaceId: null,
    draftPartingFaceNormal: null,
    draftPartingFaceCentroid: null,
  }),

  // ── SOL-I5: Remove Face face picker ─────────────────────────────────────
  removeFaceFaceId: null,
  removeFaceFaceNormal: null,
  removeFaceFaceCentroid: null,
  setRemoveFaceFace: (id, normal, centroid) => set({
    removeFaceFaceId: id,
    removeFaceFaceNormal: normal,
    removeFaceFaceCentroid: centroid,
  }),
  clearRemoveFaceFace: () => set({
    removeFaceFaceId: null,
    removeFaceFaceNormal: null,
    removeFaceFaceCentroid: null,
  }),

  // ── CTX-8: Mesh export trigger ───────────────────────────────────────────
  exportBodyId: null,
  exportBodyFormat: null,
  triggerBodyExport: (bodyId, format) => set({ exportBodyId: bodyId, exportBodyFormat: format }),
  clearBodyExport: () => set({ exportBodyId: null, exportBodyFormat: null }),

  // ── D183 Bounding Solid ──────────────────────────────────────────────────
  openBoundingSolidDialog: () => set({ activeDialog: 'bounding-solid' }),
  closeBoundingSolidDialog: () => set({ activeDialog: null }),
  commitBoundingSolid: (params) => {
    const { features, setActiveDialog } = get();
    const { shape, padding } = params;
    const n = features.filter((f) => f.type === 'bounding-solid').length + 1;

    // Compute the combined Box3 of all feature meshes
    const box = new THREE.Box3();
    let hasGeometry = false;
    for (const f of features) {
      if (!f.mesh || !f.visible) continue;
      const b = new THREE.Box3().setFromObject(f.mesh);
      if (!b.isEmpty()) {
        box.union(b);
        hasGeometry = true;
      }
    }

    let geom: THREE.BufferGeometry;
    if (!hasGeometry) {
      // Fallback: unit box
      geom = new THREE.BoxGeometry(1, 1, 1);
    } else {
      box.expandByScalar(padding);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      if (shape === 'box') {
        geom = new THREE.BoxGeometry(size.x, size.y, size.z);
      } else {
        // Cylinder: bounding sphere radius
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);
        const r = sphere.radius;
        geom = new THREE.CylinderGeometry(r, r, size.y + padding * 2, 32);
      }

      const mat = new THREE.MeshStandardMaterial({ color: 0x4488ff, transparent: true, opacity: 0.3, wireframe: false });
      const mesh = new THREE.Mesh(geom, mat);

      const center2 = new THREE.Vector3();
      box.getCenter(center2);
      mesh.position.copy(center2);

      const feature: Feature = {
        id: crypto.randomUUID(),
        name: `Bounding Solid ${n}`,
        type: 'bounding-solid',
        params: { shape, padding },
        mesh,
        visible: true,
        suppressed: false,
        timestamp: Date.now(),
      };
      get().addFeature(feature);
      setActiveDialog(null);
      return;
    }

    // Fallback path (no geometry)
    const mat = new THREE.MeshStandardMaterial({ color: 0x4488ff, transparent: true, opacity: 0.3 });
    const mesh = new THREE.Mesh(geom, mat);
    const feature: Feature = {
      id: crypto.randomUUID(),
      name: `Bounding Solid ${n}`,
      type: 'bounding-solid',
      params: { shape, padding },
      mesh,
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
    };
    get().addFeature(feature);
    setActiveDialog(null);
  },

  // ── A11 — Joint Origins ────────────────────────────────────────────────
  };

  return slice;
}

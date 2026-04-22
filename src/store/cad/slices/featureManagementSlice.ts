import * as THREE from 'three';
import type { Feature } from '../../../types/cad';
import { GeometryEngine } from '../../../engine/GeometryEngine';
import { useComponentStore } from '../../componentStore';
import type { CADSliceContext } from '../sliceContext';
import type { CADState } from '../state';

export function createFeatureManagementSlice({ set, get }: CADSliceContext) {
  const slice: Partial<CADState> = {
  features: [],
  addFeature: (feature) => {
    const { historyEnabled } = get();
    if (historyEnabled) get().pushUndo();
    const f = historyEnabled ? feature : { ...feature, suppressTimeline: true };
    set((state) => ({ features: [...state.features, f] }));
  },
  addPrimitive: (kind, params) => set((state) => {
    const label =
      kind === 'box' ? 'Box' :
      kind === 'cylinder' ? 'Cylinder' :
      kind === 'sphere' ? 'Sphere' :
      kind === 'coil' ? 'Coil' : 'Torus';
    const count = state.features.filter((f) => f.type === 'primitive').length + 1;

    // For coil we pre-build the mesh so PrimitiveBodies doesn't need to handle it
    let mesh: Feature['mesh'] | undefined;
    if (kind === 'coil') {
      const geom = GeometryEngine.coilGeometry(
        (params.outerRadius as number) || 15,
        (params.wireRadius as number) || 2,
        (params.pitch as number) || 10,
        (params.turns as number) || 5,
      );
      // Use a fresh MeshPhysicalMaterial matching the EXTRUDE_MATERIAL style
      const mat = new THREE.MeshPhysicalMaterial({ color: 0x8899aa, metalness: 0.3, roughness: 0.4, side: THREE.DoubleSide });
      const m = new THREE.Mesh(geom, mat);
      m.castShadow = true;
      m.receiveShadow = true;
      mesh = m;
    }

    const feature: Feature = {
      id: crypto.randomUUID(),
      name: `${label} ${count}`,
      type: 'primitive',
      params: { kind, ...params },
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
      ...(mesh ? { mesh } : {}),
    };
    return {
      features: [...state.features, feature],
      statusMessage: `${label} added`,
    };
  }),

  insertFastener: (params) => {
    get().pushUndo();
    const { features, units } = get();
    const componentStore = useComponentStore.getState();
    const { rootComponentId } = componentStore;
    const scale = units === 'in' ? 1 / 25.4 : 1;
    const d = params.diameter * scale;
    const hd = params.headDiameter * scale;
    const hh = params.headHeight * scale;
    const len = params.length * scale;

    const group = new THREE.Group();

    const isNut = params.type === 'hex-nut';
    const isWasher = params.type === 'washer';

    if (!isNut && !isWasher) {
      const shankGeo = new THREE.CylinderGeometry(d / 2, d / 2, len, 16);
      const shankMesh = new THREE.Mesh(shankGeo, new THREE.MeshStandardMaterial({ color: '#B0B8C0', metalness: 0.8, roughness: 0.3 }));
      shankMesh.position.y = -len / 2;
      group.add(shankMesh);
    }

    const headSegs = (params.type === 'hex-bolt' || params.type === 'hex-nut') ? 6 : 16;
    const headGeo = new THREE.CylinderGeometry(hd / 2, hd / 2, hh, headSegs);
    const headMesh = new THREE.Mesh(headGeo, new THREE.MeshStandardMaterial({ color: '#B0B8C0', metalness: 0.8, roughness: 0.3 }));

    if (isNut || isWasher) {
      headMesh.position.y = 0;
    } else if (params.type === 'flat-head') {
      headMesh.position.y = -hh / 2;
    } else {
      headMesh.position.y = hh / 2;
    }
    group.add(headMesh);

    group.position.set(params.x * scale, params.y * scale, params.z * scale);

    const featureId = crypto.randomUUID();
    const bodyId = componentStore.addBody(rootComponentId, `${params.size} ${params.type}`);
    if (bodyId) {
      componentStore.addFeatureToBody(bodyId, featureId);
    }
    const feature: Feature = {
      id: featureId,
      name: `${params.size} ${params.type.replace(/-/g, ' ')}`,
      type: 'fastener',
      params: { ...params } as unknown as Record<string, number | string | boolean | number[]>,
      mesh: group as unknown as THREE.Mesh,
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
      bodyKind: 'brep',
    };
    set({ features: [...features, feature], statusMessage: `${params.size} ${params.type} inserted` });
  },

  removeFeature: (id) => {
    get().pushUndo();
    // Capture the mesh reference before removal so we can dispose AFTER
    // the feature is out of state (prevents renderer accessing disposed GPU resources).
    const target = get().features.find((f) => f.id === id);
    set((state) => ({ features: state.features.filter((f) => f.id !== id) }));
    // Now safe to dispose — feature is no longer in state.
    //
    // CRITICAL: skip materials tagged `userData.shared = true` — those are
    // module-level singletons (EXTRUDE_MATERIAL, SKETCH_MATERIAL, etc. in
    // GeometryEngine.ts). Disposing them turns every other feature still
    // using them into a black/broken material instance.
    const disposeMat = (mat: THREE.Material | THREE.Material[] | null | undefined) => {
      if (!mat) return;
      const arr = Array.isArray(mat) ? mat : [mat];
      for (const m of arr) {
        if (m?.userData?.shared) continue;
        m?.dispose?.();
      }
    };
    if (target?.mesh) {
      const m = target.mesh as THREE.Object3D;
      if (m instanceof THREE.Mesh) {
        m.geometry?.dispose();
        disposeMat(m.material);
      } else if (m instanceof THREE.Group) {
        m.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            disposeMat(child.material);
          }
        });
      }
    }
  },
  deriveFromDesign: (itemIds, sourceFileName) => {
    get().pushUndo();
    const { features } = get();
    const now = Date.now();
    const newFeatures: Feature[] = itemIds.map((itemId, i) => ({
      id: crypto.randomUUID(),
      name: `Derived: ${itemId.slice(0, 8)}\u2026`,
      type: 'derive' as import('../../../types/cad').FeatureType,
      params: { sourceFileName, sourceItemId: itemId } as unknown as Record<string, number | string | boolean | number[]>,
      visible: true,
      suppressed: false,
      timestamp: now + i,
      derivedFrom: sourceFileName,
    }));
    set({ features: [...features, ...newFeatures], statusMessage: `Derived ${newFeatures.length} item(s) from ${sourceFileName}` });
  },
  renameFeature: (id, name) => set((state) => ({
    features: state.features.map((f) => f.id === id ? { ...f, name } : f),
  })),
  // D186 Edit Feature state
  editingFeatureId: null,
  setEditingFeatureId: (id) => set({ editingFeatureId: id }),
  updateFeatureParams: (id, params) => {
    get().pushUndo();
    set((state) => ({
      features: state.features.map((f) =>
        f.id === id ? { ...f, params: { ...f.params, ...params } } : f,
      ),
      statusMessage: 'Feature parameters updated',
    }));
  },
  // D189 reorder feature
  reorderFeature: (id, newIndex) => set((state) => {
    const idx = state.features.findIndex((f) => f.id === id);
    if (idx === -1) return {};
    const next = [...state.features];
    const [moved] = next.splice(idx, 1);
    const clamped = Math.max(0, Math.min(newIndex, next.length));
    next.splice(clamped, 0, moved);
    return { features: next, statusMessage: `Moved ${moved.name}` };
  }),
  // D190 rollback bar
  rollbackIndex: -1,
  setRollbackIndex: (index) => set({ rollbackIndex: index }),

  // MM3 — Base Feature container
  baseFeatureActive: false,
  openBaseFeature: (name) => {
    const { features } = get();
    const n = features.filter((f) => f.type === 'base-feature').length + 1;
    const feature: Feature = {
      id: crypto.randomUUID(),
      name: name || `Base Feature ${n}`,
      type: 'base-feature',
      params: {},
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
      isBaseFeatureContainer: true,
      baseFeatureOpen: true,
    };
    set((state) => ({
      features: [...state.features, feature],
      baseFeatureActive: true,
      statusMessage: 'Base Feature open — direct edits inside will not trigger parametric recompute',
    }));
  },
  finishBaseFeature: () => set((state) => ({
    baseFeatureActive: false,
    // Mark the open container as closed
    features: state.features.map((f) =>
      f.isBaseFeatureContainer && f.baseFeatureOpen ? { ...f, baseFeatureOpen: false } : f,
    ),
    statusMessage: 'Base Feature closed',
  })),

  // MM4 — Timeline feature groups
  featureGroups: [],
  createFeatureGroup: (name, featureIds) => {
    const groupId = crypto.randomUUID();
    set((state) => ({
      featureGroups: [...state.featureGroups, { id: groupId, name, collapsed: false }],
      features: state.features.map((f) =>
        featureIds.includes(f.id) ? { ...f, groupId } : f,
      ),
      statusMessage: `Group "${name}" created`,
    }));
  },
  renameFeatureGroup: (groupId, name) => set((state) => ({
    featureGroups: state.featureGroups.map((g) => g.id === groupId ? { ...g, name } : g),
    statusMessage: `Group renamed to "${name}"`,
  })),
  deleteFeatureGroup: (groupId) => set((state) => ({
    featureGroups: state.featureGroups.filter((g) => g.id !== groupId),
    features: state.features.map((f) => f.groupId === groupId ? { ...f, groupId: undefined } : f),
    statusMessage: 'Group deleted',
  })),
  moveFeatureToGroup: (featureId, groupId) => set((state) => ({
    features: state.features.map((f) =>
      f.id === featureId ? { ...f, groupId: groupId ?? undefined } : f,
    ),
  })),

  toggleFeatureGroup: (groupId) => set((state) => ({
    featureGroups: state.featureGroups.map((g) =>
      g.id === groupId ? { ...g, collapsed: !g.collapsed } : g,
    ),
  })),
  // CORR-17: nest a group inside another
  nestGroupInGroup: (childGroupId, parentGroupId) => set((state) => ({
    featureGroups: state.featureGroups.map((g) =>
      g.id === childGroupId ? { ...g, parentGroupId: parentGroupId ?? undefined } : g,
    ),
  })),
  // D119 Tessellate
  tessellateFeature: (featureId) => {
    const { features } = get();
    const feature = features.find((f) => f.id === featureId);
    if (!feature?.mesh) {
      get().setStatusMessage('No mesh found on selected feature');
      return;
    }
    const geom = GeometryEngine.extractMeshGeometry(feature.mesh as THREE.Mesh | THREE.Group);
    if (!geom) {
      get().setStatusMessage('No mesh found on selected feature');
      return;
    }
    const mat = new THREE.MeshPhysicalMaterial({ color: 0x8899aa, metalness: 0.3, roughness: 0.4, side: THREE.DoubleSide });
    const newMesh = new THREE.Mesh(geom, mat);
    newMesh.castShadow = true;
    newMesh.receiveShadow = true;
    const n = features.filter((f) => f.params.kind === 'tessellate').length + 1;
    const newFeature: Feature = {
      id: crypto.randomUUID(),
      name: `Tessellate ${n}`,
      type: 'primitive',
      params: { kind: 'tessellate' },
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
      mesh: newMesh,
      bodyKind: 'mesh',
    };
    set((state) => ({
      features: [...state.features, newFeature],
      statusMessage: 'Feature tessellated as mesh body',
    }));
  },
  // D125 Mesh Reduce
  reduceMesh: (featureId, reductionPercent) => {
    const { features } = get();
    const feature = features.find((f) => f.id === featureId);
    if (!feature?.mesh) {
      get().setStatusMessage('Mesh Reduce: selected feature has no mesh');
      return;
    }
    // Build a new simplified mesh rather than mutating the existing one in-place.
    // Mutating geometry on a Zustand-owned object bypasses set() and leaves
    // React unaware of the change. Instead we clone, simplify, then replace
    // the feature in state via set().
    const applyToMesh = async (m: THREE.Mesh): Promise<THREE.Mesh> => {
      const newGeom = await GeometryEngine.simplifyGeometry(m.geometry, reductionPercent);
      const clone = new THREE.Mesh(newGeom, m.material);
      clone.castShadow = m.castShadow;
      clone.receiveShadow = m.receiveShadow;
      Object.assign(clone.userData, m.userData);
      return clone;
    };
    const featureMesh = feature.mesh as THREE.Object3D;
    // Re-validate the feature/mesh AFTER the await — by the time the simplify
    // promise resolves, the user could have deleted the feature, replaced its
    // mesh, or kicked off another reduce. Without this guard the post-await
    // set() would write the new mesh into whatever feature row currently has
    // the matching id, and dispose a mesh that's already been replaced.
    const stillValid = (currentMesh: THREE.Object3D | null | undefined): boolean => {
      const live = get().features.find((f) => f.id === featureId);
      return !!live && live.mesh === currentMesh;
    };
    const onErr = (err: unknown) => {
      get().setStatusMessage(`Mesh Reduce failed: ${(err as Error)?.message ?? 'unknown error'}`);
    };
    if (featureMesh instanceof THREE.Mesh) {
      applyToMesh(featureMesh).then((newMesh) => {
        if (!stillValid(featureMesh)) {
          // Stale — drop the freshly built mesh so we don't leak it
          newMesh.geometry.dispose();
          return;
        }
        const oldMesh = feature.mesh;
        set((state) => ({
          features: state.features.map((f) =>
            f.id === featureId ? { ...f, mesh: newMesh } : f,
          ),
        }));
        // Dispose old geometry AFTER removing from state
        if (oldMesh instanceof THREE.Mesh) oldMesh.geometry.dispose();
        get().setStatusMessage(`Mesh reduced by ${reductionPercent}%`);
      }).catch(onErr);
    } else if (featureMesh instanceof THREE.Group) {
      const meshes: THREE.Mesh[] = [];
      featureMesh.traverse((child) => {
        if (child instanceof THREE.Mesh) meshes.push(child);
      });
      Promise.all(meshes.map(applyToMesh)).then((newMeshes) => {
        if (!stillValid(featureMesh)) {
          // Stale — drop all freshly built meshes' geometries
          for (const m of newMeshes) m.geometry.dispose();
          return;
        }
        const oldGroup = feature.mesh;
        const newGroup = new THREE.Group();
        newMeshes.forEach((m) => newGroup.add(m));
        set((state) => ({
          features: state.features.map((f) =>
            f.id === featureId ? { ...f, mesh: newGroup as unknown as THREE.Mesh } : f,
          ),
        }));
        // Dispose old geometries AFTER removal
        if (oldGroup instanceof THREE.Group) {
          oldGroup.traverse((child) => {
            if (child instanceof THREE.Mesh) child.geometry.dispose();
          });
        }
        get().setStatusMessage(`Mesh reduced by ${reductionPercent}%`);
      }).catch(onErr);
    } else {
      get().setStatusMessage('Mesh Reduce: feature is not simplifiable');
    }
  },
  // D115 Reverse Normals
  reverseNormals: (featureId) => {
    const { features } = get();
    const feature = features.find((f) => f.id === featureId);
    if (!feature?.mesh) {
      get().setStatusMessage('Reverse Normal: selected feature has no mesh');
      return;
    }
    const featureMesh = feature.mesh as THREE.Object3D;
    if (featureMesh instanceof THREE.Mesh) {
      GeometryEngine.reverseNormals(featureMesh.geometry);
    } else if (featureMesh instanceof THREE.Group) {
      featureMesh.traverse((child) => {
        if (child instanceof THREE.Mesh) GeometryEngine.reverseNormals(child.geometry);
      });
    }
    // Mutating mesh.geometry in place doesn't notify Zustand subscribers — replace
    // the features array reference so the timeline / re-renderers see the change.
    set((state) => ({
      features: state.features.map((f) => f.id === featureId ? { ...f } : f),
    }));
    get().setStatusMessage('Normals reversed');
  },
  // UTL1 — Show All / Hide
  showAllFeatures: () => set((state) => ({
    features: state.features.map((f) => ({ ...f, visible: true })),
    statusMessage: 'All features shown',
  })),
  hideFeature: (id) => set((state) => ({
    features: state.features.map((f) => f.id === id ? { ...f, visible: false } : f),
    statusMessage: 'Feature hidden',
  })),

  // MSH8 — commitReverseNormal: clone geometry with flipped normals
  commitReverseNormal: (featureId) => {
    const { features } = get();
    const feature = features.find((f) => f.id === featureId);
    if (!feature?.mesh) {
      get().setStatusMessage('Reverse Normal: no mesh on selected feature');
      return;
    }
    const srcMesh = feature.mesh as THREE.Mesh;
    if (!(srcMesh instanceof THREE.Mesh)) {
      get().setStatusMessage('Reverse Normal: feature is not a mesh');
      return;
    }
    const newMesh = GeometryEngine.reverseMeshNormals(srcMesh);
    newMesh.castShadow = true;
    newMesh.receiveShadow = true;
    // Dispose the previous geometry — reverseMeshNormals returns a fresh
    // mesh with cloned geometry, so the source's BufferGeometry is now orphan.
    const oldMesh = feature.mesh;
    set((state) => ({
      features: state.features.map((f) => f.id === featureId ? { ...f, mesh: newMesh } : f),
      statusMessage: 'Mesh normals reversed',
    }));
    if (oldMesh instanceof THREE.Mesh) oldMesh.geometry.dispose();
  },

  // MSH7 — commitMeshCombine: merge all listed feature meshes into one
  commitMeshCombine: (featureIds) => {
    const { features } = get();
    const meshes: THREE.Mesh[] = [];
    for (const fid of featureIds) {
      const f = features.find((x) => x.id === fid);
      if (f?.mesh instanceof THREE.Mesh) meshes.push(f.mesh as THREE.Mesh);
    }
    if (meshes.length < 2) {
      get().setStatusMessage('Mesh Combine: need at least 2 mesh features');
      return;
    }
    const combined = GeometryEngine.combineMeshes(meshes);
    combined.castShadow = true;
    combined.receiveShadow = true;
    const n = features.filter((f) => f.name.startsWith('Mesh Combine')).length + 1;
    const newFeature: Feature = {
      id: crypto.randomUUID(),
      name: `Mesh Combine ${n}`,
      type: 'import',
      params: { featureKind: 'mesh-combine', sourceIds: featureIds.join(',') },
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
      mesh: combined,
      bodyKind: 'mesh',
    };
    set((state) => ({
      features: [...state.features, newFeature],
      statusMessage: 'Meshes combined',
    }));
  },

  // MSH11 — commitMeshTransform: apply translate/rotate/scale to a mesh
  commitMeshTransform: (featureId, params) => {
    const { features } = get();
    const feature = features.find((f) => f.id === featureId);
    if (!feature?.mesh) {
      get().setStatusMessage('Mesh Transform: no mesh on selected feature');
      return;
    }
    const srcMesh = feature.mesh as THREE.Mesh;
    if (!(srcMesh instanceof THREE.Mesh)) {
      get().setStatusMessage('Mesh Transform: feature is not a mesh');
      return;
    }
    // Validate inputs before mutating — scale=0 collapses the mesh permanently
    // and there's no rollback path. NaN/Infinity rotations propagate into
    // the geometry and corrupt every downstream raycast.
    const finite = (v: number) => Number.isFinite(v);
    if (!finite(params.tx) || !finite(params.ty) || !finite(params.tz) ||
        !finite(params.rx) || !finite(params.ry) || !finite(params.rz) ||
        !finite(params.scale) || params.scale === 0) {
      get().setStatusMessage('Mesh Transform: invalid params (translate/rotate must be finite, scale != 0)');
      return;
    }
    get().pushUndo();
    const newMesh = GeometryEngine.transformMesh(srcMesh, params);
    newMesh.castShadow = true;
    newMesh.receiveShadow = true;
    const oldMesh = feature.mesh;
    set((state) => ({
      features: state.features.map((f) => f.id === featureId ? { ...f, mesh: newMesh } : f),
      statusMessage: 'Mesh transformed',
    }));
    // Defer disposal so undo can still reference the old geometry.
    // setTimeout(0) ensures the set() completes and state is stable first.
    if (oldMesh instanceof THREE.Mesh) {
      const geo = oldMesh.geometry;
      setTimeout(() => geo.dispose(), 0);
    }
  },

  // SLD13 — commitScale: scale a feature mesh by sx/sy/sz
  commitScale: (featureId, sx, sy, sz) => {
    const { features } = get();
    const feature = features.find((f) => f.id === featureId);
    if (!feature?.mesh) {
      get().setStatusMessage('Scale: no mesh on selected feature');
      return;
    }
    const srcMesh = feature.mesh as THREE.Mesh;
    if (!(srcMesh instanceof THREE.Mesh)) {
      get().setStatusMessage('Scale: feature is not a mesh');
      return;
    }
    // Validate before mutating — any zero axis flattens the mesh permanently.
    if (!Number.isFinite(sx) || !Number.isFinite(sy) || !Number.isFinite(sz) ||
        sx === 0 || sy === 0 || sz === 0) {
      get().setStatusMessage('Scale: factors must be finite and non-zero');
      return;
    }
    get().pushUndo();
    const newMesh = GeometryEngine.scaleMesh(srcMesh, sx, sy, sz);
    newMesh.castShadow = true;
    newMesh.receiveShadow = true;
    set((state) => ({
      features: state.features.map((f) => f.id === featureId ? { ...f, mesh: newMesh } : f),
      statusMessage: `Scaled ${sx}×${sy}×${sz}`,
    }));
  },

  // SLD12 — commitCombine: boolean op on two feature meshes
  commitCombine: (targetFeatureId, toolFeatureId, operation, keepTool) => {
    const { features } = get();
    const targetFeature = features.find((f) => f.id === targetFeatureId);
    const toolFeature = features.find((f) => f.id === toolFeatureId);
    if (!targetFeature?.mesh || !(targetFeature.mesh instanceof THREE.Mesh)) {
      get().setStatusMessage('Combine: target has no mesh');
      return;
    }
    if (!toolFeature?.mesh || !(toolFeature.mesh instanceof THREE.Mesh)) {
      get().setStatusMessage('Combine: tool has no mesh');
      return;
    }
    get().pushUndo();
    const tgtMesh = targetFeature.mesh as THREE.Mesh;
    const toolMesh = toolFeature.mesh as THREE.Mesh;
    let resultGeom: THREE.BufferGeometry;
    // CSG can throw on degenerate / non-manifold inputs. Catch + report so
    // the user gets a status message instead of a silent broken state, and
    // the partially-built result (if any) doesn't end up in the scene.
    try {
      if (operation === 'join') {
        resultGeom = GeometryEngine.csgUnion(tgtMesh.geometry, toolMesh.geometry);
      } else if (operation === 'cut') {
        resultGeom = GeometryEngine.csgSubtract(tgtMesh.geometry, toolMesh.geometry);
      } else {
        resultGeom = GeometryEngine.csgIntersect(tgtMesh.geometry, toolMesh.geometry);
      }
    } catch (err) {
      get().setStatusMessage(`Combine (${operation}) failed: ${(err as Error)?.message ?? 'unknown CSG error'}`);
      return;
    }
    const newMesh = new THREE.Mesh(resultGeom, tgtMesh.material);
    newMesh.castShadow = true;
    newMesh.receiveShadow = true;
    set((state) => {
      let updated = state.features.map((f) =>
        f.id === targetFeatureId ? { ...f, mesh: newMesh } : f
      );
      if (!keepTool) {
        updated = updated.filter((f) => f.id !== toolFeatureId);
      }
      return { features: updated, statusMessage: `Combine (${operation}) applied` };
    });
  },

  // SLD17 — commitMirrorFeature: mirror a feature's mesh across a plane
  commitMirrorFeature: (featureId, plane) => {
    const { features } = get();
    const feature = features.find((f) => f.id === featureId);
    if (!feature?.mesh) {
      get().setStatusMessage('Mirror Feature: no mesh on selected feature');
      return;
    }
    const srcMesh = feature.mesh as THREE.Mesh;
    if (!(srcMesh instanceof THREE.Mesh)) {
      get().setStatusMessage('Mirror Feature: feature is not a mesh');
      return;
    }
    get().pushUndo();
    const mirrored = GeometryEngine.mirrorMesh(srcMesh, plane);
    mirrored.castShadow = true;
    mirrored.receiveShadow = true;
    const n = features.filter((f) => f.name.startsWith('Mirror Feature')).length + 1;
    const newFeature: Feature = {
      id: crypto.randomUUID(),
      name: `Mirror Feature ${n}`,
      type: 'mirror',
      params: { featureKind: 'mirror-feature', sourceId: featureId, plane },
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
      mesh: mirrored,
      bodyKind: feature.bodyKind,
    };
    set((state) => ({
      features: [...state.features, newFeature],
      statusMessage: `Feature mirrored on ${plane} plane`,
    }));
  },

  toggleFeatureVisibility: (id) => set((state) => ({
    features: state.features.map((f) =>
      f.id === id ? { ...f, visible: !f.visible } : f
    ),
  })),
  toggleFeatureSuppressed: (id) => set((state) => ({
    features: state.features.map((f) =>
      f.id === id ? { ...f, suppressed: !f.suppressed } : f
    ),
  })),
  };

  return slice;
}

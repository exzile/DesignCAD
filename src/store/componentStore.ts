import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as THREE from 'three';
import type {
  Component, Body, ConstructionGeometry, Joint,
  RigidGroup, ComponentConstraint,
} from '../types/cad';
import { GeometryEngine } from '../engine/GeometryEngine';
import type { ComponentStore } from './component/types';
import { componentStorage } from './component/storage';
import { createRootComponent, defaultComponentMaterial } from './component/defaults';
import { createAnimationState, liveJointValues } from './component/actions/animation';
import { createAssemblyState } from './component/actions/assembly';

const rootId = crypto.randomUUID();

export const _liveJointValues = liveJointValues;

export const useComponentStore = create<ComponentStore>()(persist((set, get) => ({
  rootComponentId: rootId,

  components: {
    [rootId]: createRootComponent(rootId),
  },

  bodies: {},
  constructions: {},
  joints: {},
  componentConstraints: [] as ComponentConstraint[],

  activeComponentId: rootId,
  setActiveComponentId: (id) => set({ activeComponentId: id ?? rootId }),

  selectedBodyId: null,
  setSelectedBodyId: (id) => set({ selectedBodyId: id }),

  newDocument: () => {
    const newRootId = crypto.randomUUID();
    set({
      rootComponentId: newRootId,
      activeComponentId: newRootId,
      selectedBodyId: null,
      components: {
        [newRootId]: createRootComponent(newRootId),
      },
      bodies: {},
      constructions: {},
      joints: {},
      componentConstraints: [],
    });
  },

  // ===== Component Operations =====
  addComponent: (parentId, name) => {
    const { components } = get();
    const parent = components[parentId];
    if (!parent) return parentId;

    const id = crypto.randomUUID();
    const childCount = parent.childIds.length;
    const colors = ['#5B9BD5', '#ED7D31', '#70AD47', '#FFC000', '#5B5EA6',
      '#44C4A1', '#FF6B6B', '#C678DD', '#E06C75', '#98C379'];

    const component: Component = {
      id,
      name: name || `Component ${Object.keys(components).length}`,
      parentId,
      childIds: [],
      bodyIds: [],
      sketchIds: [],
      constructionIds: [],
      constructionPlaneIds: [],
      constructionAxisIds: [],
      constructionPointIds: [],
      jointIds: [],
      transform: new THREE.Matrix4(),
      visible: true,
      grounded: false,
      isLinked: false,
      color: colors[childCount % colors.length],
    };

    set({
      components: {
        ...components,
        [id]: component,
        [parentId]: { ...parent, childIds: [...parent.childIds, id] },
      },
    });

    return id;
  },

  removeComponent: (id) => {
    const { components, bodies, constructions, joints } = get();
    const comp = components[id];
    if (!comp || !comp.parentId) return; // Can't remove root

    // Remove from parent
    const parent = components[comp.parentId];
    const updatedComponents = { ...components };
    updatedComponents[comp.parentId] = {
      ...parent,
      childIds: parent.childIds.filter(cid => cid !== id),
    };

    // Recursively collect all children to remove
    const toRemove = new Set<string>();
    const collectChildren = (compId: string) => {
      toRemove.add(compId);
      const c = components[compId];
      if (c) c.childIds.forEach(collectChildren);
    };
    collectChildren(id);

    // Remove components, bodies, constructions, joints
    const updatedBodies = { ...bodies };
    const updatedConstructions = { ...constructions };
    const updatedJoints = { ...joints };

    for (const removeId of toRemove) {
      const c = updatedComponents[removeId];
      if (c) {
        c.bodyIds.forEach(bid => delete updatedBodies[bid]);
        c.constructionIds.forEach(cid => delete updatedConstructions[cid]);
        c.jointIds.forEach(jid => delete updatedJoints[jid]);
      }
      delete updatedComponents[removeId];
    }

    set({
      components: updatedComponents,
      bodies: updatedBodies,
      constructions: updatedConstructions,
      joints: updatedJoints,
    });
  },

  renameComponent: (id, name) => {
    const { components } = get();
    const comp = components[id];
    if (!comp) return;
    set({ components: { ...components, [id]: { ...comp, name } } });
  },

  duplicateComponent: (id) => {
    const { components, bodies } = get();
    const comp = components[id];
    if (!comp || !comp.parentId) return id;

    const newId = get().addComponent(comp.parentId, `${comp.name} (Copy)`);

    // Deep-copy each body so the duplicate gets independent geometry and does
    // not share array refs with the source component. The mesh is cloned via
    // THREE.Object3D.clone() so each component has its own scene object.
    const newBodies: Record<string, Body> = {};
    const newBodyIds: string[] = [];

    for (const bodyId of comp.bodyIds) {
      const body = bodies[bodyId];
      if (!body) continue;
      const newBodyId = crypto.randomUUID();
      newBodies[newBodyId] = {
        ...body,
        id: newBodyId,
        componentId: newId,
        // Clone the Three.js scene object so edits to one don't affect the other.
        mesh: body.mesh ? body.mesh.clone() : null,
        // Each body starts with its own empty feature list; the source feature
        // history is not transferred because features reference the original body.
        featureIds: [],
        material: { ...body.material },
      };
      newBodyIds.push(newBodyId);
    }

    const updatedComponents = { ...get().components };
    updatedComponents[newId] = { ...updatedComponents[newId], bodyIds: newBodyIds };

    set({
      bodies: { ...get().bodies, ...newBodies },
      components: updatedComponents,
    });

    return newId;
  },

  // A22 — Mirror Component
  mirrorComponent: (params) => {
    const { components, bodies } = get();
    const { componentId, mirrorPlane } = params;
    const sourceComp = components[componentId];
    if (!sourceComp || !sourceComp.parentId) return null;

    const newId = get().addComponent(sourceComp.parentId, `${sourceComp.name} (Mirror)`);

    const mirroredBodies: Record<string, Body> = {};
    const newBodyIds: string[] = [];

    for (const bodyId of sourceComp.bodyIds) {
      const body = bodies[bodyId];
      if (!body) continue;

      let mirroredMesh: THREE.Mesh | THREE.Group | null = null;

      const applyMirror = (mesh: THREE.Mesh, plane: string): THREE.Mesh => {
        if (plane === 'XY' || plane === 'XZ' || plane === 'YZ') {
          return GeometryEngine.mirrorMesh(mesh, plane as 'XY' | 'XZ' | 'YZ');
        }
        // Construction plane: reflect through custom plane normal
        const cloned = mesh.clone();
        cloned.geometry = mesh.geometry.clone();
        if (plane === 'XY') { cloned.scale.z *= -1; cloned.position.z *= -1; }
        else if (plane === 'XZ') { cloned.scale.y *= -1; cloned.position.y *= -1; }
        else if (plane === 'YZ') { cloned.scale.x *= -1; cloned.position.x *= -1; }
        return cloned;
      };

      if (body.mesh instanceof THREE.Mesh) {
        mirroredMesh = applyMirror(body.mesh, mirrorPlane);
      } else if (body.mesh instanceof THREE.Group) {
        const group = new THREE.Group();
        body.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            group.add(applyMirror(child, mirrorPlane));
          }
        });
        mirroredMesh = group;
      }

      const newBodyId = crypto.randomUUID();
      mirroredBodies[newBodyId] = {
        id: newBodyId,
        name: `${body.name} (Mirror)`,
        componentId: newId,
        mesh: mirroredMesh,
        visible: true,
        material: { ...body.material },
        featureIds: [],
      };
      newBodyIds.push(newBodyId);
    }

    const updatedComponents = { ...get().components };
    updatedComponents[newId] = {
      ...updatedComponents[newId],
      bodyIds: newBodyIds,
      isLinked: params.createLinked,
    };

    set({
      bodies: { ...get().bodies, ...mirroredBodies },
      components: updatedComponents,
    });

    return newId;
  },

  // A23 — Duplicate Component With Joints
  duplicateComponentWithJoints: (componentId) => {
    const { components, joints } = get();
    const comp = components[componentId];
    if (!comp || !comp.parentId) return componentId;

    const newId = get().duplicateComponent(componentId);

    // Find all joints referencing the source component
    const relatedJoints = Object.values(joints).filter(
      (j) => j.componentId1 === componentId || j.componentId2 === componentId,
    );

    if (relatedJoints.length === 0) return newId;

    const newJoints: Record<string, Joint> = { ...get().joints };
    const newJointIds: string[] = [];

    for (const joint of relatedJoints) {
      const newJointId = crypto.randomUUID();
      newJoints[newJointId] = {
        ...joint,
        id: newJointId,
        name: `${joint.name} (Copy)`,
        componentId1: joint.componentId1 === componentId ? newId : joint.componentId1,
        componentId2: joint.componentId2 === componentId ? newId : joint.componentId2,
      };
      newJointIds.push(newJointId);
    }

    const updatedComponents = { ...get().components };
    updatedComponents[newId] = {
      ...updatedComponents[newId],
      jointIds: [...(updatedComponents[newId].jointIds ?? []), ...newJointIds],
    };

    set({ joints: newJoints, components: updatedComponents });
    return newId;
  },

  toggleComponentVisibility: (id) => {
    const { components } = get();
    const comp = components[id];
    if (!comp) return;
    set({ components: { ...components, [id]: { ...comp, visible: !comp.visible } } });
  },

  setComponentGrounded: (id, grounded) => {
    const { components } = get();
    const comp = components[id];
    if (!comp) return;
    set({ components: { ...components, [id]: { ...comp, grounded } } });
  },

  makeComponentIndependent: (id) => {
    const { components } = get();
    const comp = components[id];
    if (!comp || !comp.isLinked) return;
    // A28: clear the linked flag so this becomes a local embedded component
    set({ components: { ...components, [id]: { ...comp, isLinked: false } } });
  },

  moveComponent: (id, newParentId) => {
    const { components } = get();
    const comp = components[id];
    if (!comp || !comp.parentId || id === newParentId) return;

    const oldParent = components[comp.parentId];
    const newParent = components[newParentId];
    if (!oldParent || !newParent) return;

    set({
      components: {
        ...components,
        [id]: { ...comp, parentId: newParentId },
        [comp.parentId]: { ...oldParent, childIds: oldParent.childIds.filter(cid => cid !== id) },
        [newParentId]: { ...newParent, childIds: [...newParent.childIds, id] },
      },
    });
  },

  // ===== Body Operations =====
  addBody: (componentId, name) => {
    const { components, bodies } = get();
    const comp = components[componentId];
    if (!comp) return '';

    const id = crypto.randomUUID();
    const body: Body = {
      id,
      name: name || `Body ${Object.keys(bodies).length + 1}`,
      componentId,
      mesh: null,
      visible: true,
      material: { ...defaultComponentMaterial },
      featureIds: [],
    };

    set({
      bodies: { ...bodies, [id]: body },
      components: { ...components, [componentId]: { ...comp, bodyIds: [...comp.bodyIds, id] } },
    });

    return id;
  },

  removeBody: (id) => {
    const { components, bodies } = get();
    const body = bodies[id];
    if (!body) return;

    const comp = components[body.componentId];
    const updatedBodies = { ...bodies };
    delete updatedBodies[id];

    set({
      bodies: updatedBodies,
      components: comp ? {
        ...components,
        [body.componentId]: { ...comp, bodyIds: comp.bodyIds.filter(bid => bid !== id) },
      } : components,
    });
  },

  renameBody: (id, name) => {
    const { bodies } = get();
    const body = bodies[id];
    if (!body) return;
    set({ bodies: { ...bodies, [id]: { ...body, name } } });
  },

  toggleBodyVisibility: (id) => {
    const { bodies } = get();
    const body = bodies[id];
    if (!body) return;
    set({ bodies: { ...bodies, [id]: { ...body, visible: !body.visible } } });
  },

  isolateBody: (id) => {
    const { bodies } = get();
    // If already isolated (only this body visible), restore all
    const allIds = Object.keys(bodies);
    const alreadyIsolated = allIds.every((bid) => bid === id ? bodies[bid].visible : !bodies[bid].visible);
    const updated = Object.fromEntries(
      allIds.map((bid) => [bid, { ...bodies[bid], visible: alreadyIsolated ? true : bid === id }])
    );
    set({ bodies: updated });
  },

  showAllBodies: () => {
    const { bodies } = get();
    const updated = Object.fromEntries(
      Object.entries(bodies).map(([id, b]) => [id, { ...b, visible: true }])
    );
    set({ bodies: updated });
  },

  setBodyMaterial: (id, material) => {
    const { bodies } = get();
    const body = bodies[id];
    if (!body) return;
    set({ bodies: { ...bodies, [id]: { ...body, material } } });
  },

  setBodyMesh: (id, mesh) => {
    const { bodies } = get();
    const body = bodies[id];
    if (!body) return;
    set({ bodies: { ...bodies, [id]: { ...body, mesh } } });
  },

  setBodyOpacity: (id, opacity) => {
    const { bodies } = get();
    const body = bodies[id];
    if (!body) return;
    const clamped = Math.max(0, Math.min(1, opacity));
    set({ bodies: { ...bodies, [id]: { ...body, opacity: clamped } } });
  },

  toggleBodySelectable: (id) => {
    const { bodies } = get();
    const body = bodies[id];
    if (!body) return;
    const next = body.selectable === false ? true : false;
    set({ bodies: { ...bodies, [id]: { ...body, selectable: next } } });
  },

  addFeatureToBody: (bodyId, featureId) => {
    const { bodies } = get();
    const body = bodies[bodyId];
    if (!body) return;
    set({
      bodies: { ...bodies, [bodyId]: { ...body, featureIds: [...body.featureIds, featureId] } },
    });
  },

  // D168 Mirror a solid body through one of the three world planes.
  // Adds the reflected body to the same component and returns its id.
  mirrorBody: (bodyId, plane) => {
    const { bodies, components } = get();
    const body = bodies[bodyId];
    if (!body) return null;

    let mirroredMesh: THREE.Mesh | THREE.Group | null = null;
    if (body.mesh instanceof THREE.Mesh) {
      mirroredMesh = GeometryEngine.mirrorMesh(body.mesh, plane);
    } else if (body.mesh instanceof THREE.Group) {
      const group = new THREE.Group();
      body.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          group.add(GeometryEngine.mirrorMesh(child, plane));
        }
      });
      mirroredMesh = group;
    }

    const id = crypto.randomUUID();
    const mirrored: Body = {
      id,
      name: `${body.name} (Mirror ${plane})`,
      componentId: body.componentId,
      mesh: mirroredMesh,
      visible: true,
      material: { ...body.material },
      featureIds: [],
    };

    const comp = components[body.componentId];
    set({
      bodies: { ...bodies, [id]: mirrored },
      components: comp
        ? {
            ...components,
            [body.componentId]: { ...comp, bodyIds: [...comp.bodyIds, id] },
          }
        : components,
    });

    return id;
  },

  // ===== Construction Geometry =====
  addConstruction: (geometry) => {
    const { constructions, components } = get();
    const id = crypto.randomUUID();
    const construction: ConstructionGeometry = { ...geometry, id };

    const comp = components[geometry.componentId];
    set({
      constructions: { ...constructions, [id]: construction },
      components: comp ? {
        ...components,
        [geometry.componentId]: {
          ...comp,
          constructionIds: [...comp.constructionIds, id],
          // CORR-16: also maintain typed sub-collections
          constructionPlaneIds: geometry.type === 'plane'
            ? [...(comp.constructionPlaneIds ?? []), id]
            : (comp.constructionPlaneIds ?? []),
          constructionAxisIds: geometry.type === 'axis'
            ? [...(comp.constructionAxisIds ?? []), id]
            : (comp.constructionAxisIds ?? []),
          constructionPointIds: geometry.type === 'point'
            ? [...(comp.constructionPointIds ?? []), id]
            : (comp.constructionPointIds ?? []),
        },
      } : components,
    });

    return id;
  },

  removeConstruction: (id) => {
    const { constructions, components } = get();
    const construction = constructions[id];
    if (!construction) return;

    const updated = { ...constructions };
    delete updated[id];

    const comp = components[construction.componentId];
    set({
      constructions: updated,
      components: comp ? {
        ...components,
        [construction.componentId]: {
          ...comp,
          constructionIds: comp.constructionIds.filter(cid => cid !== id),
          // CORR-16: also remove from the appropriate typed collection
          constructionPlaneIds: (comp.constructionPlaneIds ?? []).filter(cid => cid !== id),
          constructionAxisIds: (comp.constructionAxisIds ?? []).filter(cid => cid !== id),
          constructionPointIds: (comp.constructionPointIds ?? []).filter(cid => cid !== id),
        },
      } : components,
    });
  },

  toggleConstructionVisibility: (id) => {
    const { constructions } = get();
    const c = constructions[id];
    if (!c) return;
    set({ constructions: { ...constructions, [id]: { ...c, visible: !c.visible } } });
  },

  // ===== Joints =====
  addJoint: (joint) => {
    const { joints, components } = get();
    const id = crypto.randomUUID();
    const newJoint: Joint = { ...joint, id };

    const comp = components[joint.componentId1];
    set({
      joints: { ...joints, [id]: newJoint },
      components: comp ? {
        ...components,
        [joint.componentId1]: {
          ...comp,
          jointIds: [...comp.jointIds, id],
        },
      } : components,
    });

    return id;
  },

  removeJoint: (id) => {
    const { joints } = get();
    const updated = { ...joints };
    delete updated[id];
    set({ joints: updated });
  },

  setJointValue: (id, rotation, translation) => {
    const { joints } = get();
    const joint = joints[id];
    if (!joint) return;
    set({
      joints: {
        ...joints,
        [id]: {
          ...joint,
          rotationValue: rotation ?? joint.rotationValue,
          translationValue: translation ?? joint.translationValue,
        },
      },
    });
  },

  toggleJointLock: (id) => {
    const { joints } = get();
    const joint = joints[id];
    if (!joint) return;
    set({ joints: { ...joints, [id]: { ...joint, locked: !joint.locked } } });
  },

  // ===== Rigid Groups (A18) =====
  rigidGroups: [],
  addRigidGroup: (componentIds, name) => {
    const { rigidGroups } = get();
    const id = crypto.randomUUID();
    const n = rigidGroups.length + 1;
    const group: RigidGroup = { id, name: name ?? `Rigid Group ${n}`, componentIds };
    set({ rigidGroups: [...rigidGroups, group] });
  },
  removeRigidGroup: (id) => {
    const { rigidGroups } = get();
    set({ rigidGroups: rigidGroups.filter((g) => g.id !== id) });
  },

  // ===== Motion Links (A20) =====
  motionLinks: [],
  addMotionLink: (link) => {
    const { motionLinks } = get();
    const id = crypto.randomUUID();
    set({ motionLinks: [...motionLinks, { ...link, id }] });
  },
  removeMotionLink: (id) => {
    const { motionLinks } = get();
    set({ motionLinks: motionLinks.filter((m) => m.id !== id) });
  },

  // ===== UI Tree State =====
  expandedIds: new Set([rootId]),
  toggleExpanded: (id) => {
    const { expandedIds } = get();
    const updated = new Set(expandedIds);
    if (updated.has(id)) updated.delete(id);
    else updated.add(id);
    set({ expandedIds: updated });
  },

  ...createAnimationState({ set, get }),

  ...createAssemblyState({ set, get }),
}),
{
  name: 'dzign3d-component-store',
  storage: componentStorage,

  onRehydrateStorage: () => (state) => {
    if (!state) return;
    // Reconstruct THREE.Matrix4 from serialized number[] for components
    for (const comp of Object.values(state.components ?? {})) {
      if (Array.isArray((comp as unknown as { transform: unknown }).transform)) {
        comp.transform = new THREE.Matrix4().fromArray(
          (comp as unknown as { transform: number[] }).transform,
        );
      }
    }
    // Reconstruct THREE.Matrix4 from serialized number[] for occurrences
    for (const occ of Object.values(state.occurrences ?? {})) {
      if (Array.isArray((occ as unknown as { transform: unknown }).transform)) {
        occ.transform = new THREE.Matrix4().fromArray(
          (occ as unknown as { transform: number[] }).transform,
        );
      }
    }
    // Reconstruct THREE.Vector3 for Joint origin / axis
    for (const joint of Object.values(state.joints ?? {})) {
      const j = joint as unknown as { origin: unknown; axis?: unknown };
      if (j.origin && !((j.origin) instanceof THREE.Vector3)) {
        const o = j.origin as { x?: number; y?: number; z?: number } | number[];
        if (Array.isArray(o)) {
          joint.origin = new THREE.Vector3(o[0] ?? 0, o[1] ?? 0, o[2] ?? 0);
        } else {
          joint.origin = new THREE.Vector3(o.x ?? 0, o.y ?? 0, o.z ?? 0);
        }
      }
      if (j.axis && !((j.axis) instanceof THREE.Vector3)) {
        const a = j.axis as { x?: number; y?: number; z?: number } | number[];
        if (Array.isArray(a)) {
          joint.axis = new THREE.Vector3(a[0] ?? 0, a[1] ?? 0, a[2] ?? 0);
        } else {
          joint.axis = new THREE.Vector3(a.x ?? 0, a.y ?? 0, a.z ?? 0);
        }
      }
    }
    // Reconstruct THREE.Vector3 for explodedOffsets
    for (const [key, val] of Object.entries(state.explodedOffsets ?? {})) {
      if (!(val instanceof THREE.Vector3)) {
        const v = val as unknown as { x?: number; y?: number; z?: number } | number[];
        if (Array.isArray(v)) {
          state.explodedOffsets[key] = new THREE.Vector3(v[0] ?? 0, v[1] ?? 0, v[2] ?? 0);
        } else {
          state.explodedOffsets[key] = new THREE.Vector3(v.x ?? 0, v.y ?? 0, v.z ?? 0);
        }
      }
    }
  },

  partialize: (state) => ({
    rootComponentId: state.rootComponentId,
    // Serialize THREE.Matrix4 as number[] (16 elements)
    components: Object.fromEntries(
      Object.entries(state.components).map(([id, comp]) => [
        id,
        {
          ...comp,
          transform: comp.transform instanceof THREE.Matrix4
            ? comp.transform.toArray()
            : comp.transform,
        },
      ]),
    ),
    // Exclude mesh (THREE.Object3D) from bodies
    bodies: Object.fromEntries(
      Object.entries(state.bodies).map(([id, body]) => [
        id,
        { ...body, mesh: null },
      ]),
    ),
    // Serialize Joint: origin and axis as plain objects
    joints: Object.fromEntries(
      Object.entries(state.joints).map(([id, joint]) => [
        id,
        {
          ...joint,
          origin: joint.origin instanceof THREE.Vector3
            ? { x: joint.origin.x, y: joint.origin.y, z: joint.origin.z }
            : joint.origin,
          axis: joint.axis instanceof THREE.Vector3
            ? { x: joint.axis.x, y: joint.axis.y, z: joint.axis.z }
            : joint.axis,
        },
      ]),
    ),
    rigidGroups: state.rigidGroups,
    motionLinks: state.motionLinks,
    animationTracks: state.animationTracks,
    animationDuration: state.animationDuration,
    animationLoop: state.animationLoop,
    // Serialize occurrences: THREE.Matrix4 as number[]
    occurrences: Object.fromEntries(
      Object.entries(state.occurrences).map(([id, occ]) => [
        id,
        {
          ...occ,
          transform: occ.transform instanceof THREE.Matrix4
            ? occ.transform.toArray()
            : occ.transform,
        },
      ]),
    ),
    definitions: state.definitions,
    componentConstraints: state.componentConstraints,
    // Serialize explodedOffsets: THREE.Vector3 as plain objects
    explodedOffsets: Object.fromEntries(
      Object.entries(state.explodedOffsets).map(([id, v]) => [
        id,
        v instanceof THREE.Vector3
          ? { x: v.x, y: v.y, z: v.z }
          : v,
      ]),
    ),
  }),
}));

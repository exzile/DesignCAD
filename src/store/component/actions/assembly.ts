import * as THREE from 'three';
import type { ComponentConstraint, ComponentDefinition, ComponentOccurrence } from '../../../types/cad';
import type { ComponentStore } from '../types';
import type { ComponentStoreApi } from '../storeApi';

export function createAssemblyState(api: ComponentStoreApi): Pick<
  ComponentStore,
  | 'explodeActive'
  | 'explodeFactor'
  | 'explodedOffsets'
  | 'setExplodeFactor'
  | 'toggleExplode'
  | 'definitions'
  | 'occurrences'
  | 'createDefinitionFromComponent'
  | 'placeOccurrence'
  | 'removeOccurrence'
  | 'setOccurrenceGrounded'
  | 'setOccurrenceTransform'
  | 'toggleOccurrenceVisibility'
  | 'addComponentConstraint'
  | 'removeComponentConstraint'
  | 'suppressComponentConstraint'
  | 'solveComponentConstraint'
  | 'solveAllComponentConstraints'
> {
  const { get, set } = api;

  const solveConstraintIntoComponents = (
    workingComponents: ComponentStore['components'],
    constraint: ComponentConstraint,
  ): ComponentStore['components'] => {
    const compA = workingComponents[constraint.entityA.componentId];
    const compB = workingComponents[constraint.entityB.componentId];
    if (!compA || !compB) return workingComponents;

    const nA = new THREE.Vector3(...constraint.entityA.normal);
    const nB = new THREE.Vector3(...constraint.entityB.normal);
    const cA = new THREE.Vector3(...constraint.entityA.centroid);
    const cB = new THREE.Vector3(...constraint.entityB.centroid);
    const targetNormal = constraint.type === 'flush' ? nA.clone() : nA.clone().negate();
    const rotAxis = new THREE.Vector3().crossVectors(nB, targetNormal);
    const rotAngle = Math.acos(Math.max(-1, Math.min(1, nB.dot(targetNormal))));
    const rotation = new THREE.Matrix4();

    if (rotAxis.lengthSq() > 1e-10 && Math.abs(rotAngle) > 1e-6) {
      rotation.makeRotationAxis(rotAxis.normalize(), rotAngle);
    } else if (rotAngle > Math.PI - 1e-6) {
      const perpendicular = Math.abs(nB.x) < 0.9
        ? new THREE.Vector3(1, 0, 0)
        : new THREE.Vector3(0, 1, 0);
      const flipAxis = new THREE.Vector3().crossVectors(nB, perpendicular).normalize();
      rotation.makeRotationAxis(flipAxis, Math.PI);
    }

    const newTransform = rotation.clone().multiply(compB.transform);
    const rotatedCB = cB.clone().applyMatrix4(rotation);
    const translationOffset = cA.clone().sub(rotatedCB);
    if (constraint.type === 'mate' && constraint.offset) {
      translationOffset.addScaledVector(nA, constraint.offset);
    }
    const currentPosition = new THREE.Vector3().setFromMatrixPosition(newTransform);
    newTransform.setPosition(currentPosition.add(translationOffset));

    return {
      ...workingComponents,
      [constraint.entityB.componentId]: { ...compB, transform: newTransform },
    };
  };

  return {
    explodeActive: false,
    explodeFactor: 0,
    explodedOffsets: {},
    setExplodeFactor: (factor) => {
      const { components, bodies } = get();
      const offsets: Record<string, THREE.Vector3> = {};
      const bodyCenters = new Map<string, THREE.Vector3>();
      const bounds = new THREE.Box3();

      for (const component of Object.values(components)) {
        for (const bodyId of component.bodyIds) {
          if (bodyCenters.has(bodyId)) continue;
          const body = bodies[bodyId];
          if (!body?.mesh) continue;
          bounds.setFromObject(body.mesh);
          const center = new THREE.Vector3();
          bounds.getCenter(center);
          bodyCenters.set(bodyId, center);
        }
      }

      const centroid = new THREE.Vector3();
      let count = 0;
      for (const center of bodyCenters.values()) {
        centroid.add(center);
        count++;
      }
      if (count > 0) centroid.divideScalar(count);

      const componentCenter = new THREE.Vector3();
      for (const component of Object.values(components)) {
        if (component.bodyIds.length === 0) continue;
        componentCenter.set(0, 0, 0);
        let bodyCount = 0;
        for (const bodyId of component.bodyIds) {
          const center = bodyCenters.get(bodyId);
          if (!center) continue;
          componentCenter.add(center);
          bodyCount++;
        }
        if (bodyCount === 0) continue;
        componentCenter.divideScalar(bodyCount);
        const direction = componentCenter.clone().sub(centroid);
        if (direction.length() < 0.001) continue;
        offsets[component.id] = direction.normalize().multiplyScalar(factor * 10);
      }

      set({ explodeFactor: factor, explodedOffsets: offsets });
    },
    toggleExplode: () => {
      const nextActive = !get().explodeActive;
      set({ explodeActive: nextActive });
      get().setExplodeFactor(nextActive ? 1 : 0);
    },

    definitions: {},
    occurrences: {},

    createDefinitionFromComponent: (componentId) => {
      const { components, definitions } = get();
      const component = components[componentId];
      if (!component) return componentId;

      const definition: ComponentDefinition = {
        id: component.id,
        name: component.name,
        bodyIds: [...component.bodyIds],
        sketchIds: [...component.sketchIds],
        constructionIds: [...component.constructionIds],
        constructionPlaneIds: [...component.constructionPlaneIds],
        constructionAxisIds: [...component.constructionAxisIds],
        constructionPointIds: [...component.constructionPointIds],
        jointIds: [...component.jointIds],
        color: component.color,
        childDefinitionIds: [...component.childIds],
      };
      set({ definitions: { ...definitions, [definition.id]: definition } });
      return definition.id;
    },

    placeOccurrence: (definitionId, parentOccurrenceId, transform) => {
      const { definitions, occurrences } = get();
      const definition = definitions[definitionId];
      if (!definition) return '';

      const id = crypto.randomUUID();
      const occurrence: ComponentOccurrence = {
        id,
        definitionId,
        name: definition.name,
        parentOccurrenceId,
        childOccurrenceIds: [],
        transform: transform ?? new THREE.Matrix4(),
        visible: true,
        isGrounded: false,
        isLinked: false,
      };

      const updated = { ...occurrences, [id]: occurrence };
      if (parentOccurrenceId && occurrences[parentOccurrenceId]) {
        const parent = occurrences[parentOccurrenceId];
        updated[parentOccurrenceId] = {
          ...parent,
          childOccurrenceIds: [...parent.childOccurrenceIds, id],
        };
      }
      set({ occurrences: updated });
      return id;
    },

    removeOccurrence: (occurrenceId) => {
      const { occurrences } = get();
      const occurrence = occurrences[occurrenceId];
      if (!occurrence) return;

      const updated = { ...occurrences };
      delete updated[occurrenceId];
      if (occurrence.parentOccurrenceId && updated[occurrence.parentOccurrenceId]) {
        const parent = updated[occurrence.parentOccurrenceId];
        updated[occurrence.parentOccurrenceId] = {
          ...parent,
          childOccurrenceIds: parent.childOccurrenceIds.filter((id) => id !== occurrenceId),
        };
      }
      set({ occurrences: updated });
    },

    setOccurrenceGrounded: (occurrenceId, grounded) => {
      const occurrence = get().occurrences[occurrenceId];
      if (!occurrence) return;
      set({
        occurrences: {
          ...get().occurrences,
          [occurrenceId]: { ...occurrence, isGrounded: grounded },
        },
      });
    },

    setOccurrenceTransform: (occurrenceId, transform) => {
      const occurrence = get().occurrences[occurrenceId];
      if (!occurrence) return;
      set({
        occurrences: {
          ...get().occurrences,
          [occurrenceId]: { ...occurrence, transform },
        },
      });
    },

    toggleOccurrenceVisibility: (occurrenceId) => {
      const occurrence = get().occurrences[occurrenceId];
      if (!occurrence) return;
      set({
        occurrences: {
          ...get().occurrences,
          [occurrenceId]: { ...occurrence, visible: !occurrence.visible },
        },
      });
    },

    addComponentConstraint: (constraint) => {
      const id = crypto.randomUUID();
      const fullConstraint: ComponentConstraint = { ...constraint, id };
      set({ componentConstraints: [...get().componentConstraints, fullConstraint] });
      return id;
    },

    removeComponentConstraint: (id) => {
      set({ componentConstraints: get().componentConstraints.filter((constraint) => constraint.id !== id) });
    },

    suppressComponentConstraint: (id, suppressed) => {
      set({
        componentConstraints: get().componentConstraints.map((constraint) =>
          constraint.id === id ? { ...constraint, suppressed } : constraint,
        ),
      });
    },

    solveComponentConstraint: (constraintId) => {
      const constraint = get().componentConstraints.find((entry) => entry.id === constraintId);
      if (!constraint || constraint.suppressed) return;
      set({ components: solveConstraintIntoComponents(get().components, constraint) });
    },

    solveAllComponentConstraints: () => {
      const { componentConstraints } = get();
      let workingComponents = { ...get().components };
      const staleIds: string[] = [];

      for (const constraint of componentConstraints) {
        if (constraint.suppressed) continue;
        if (!workingComponents[constraint.entityA.componentId] || !workingComponents[constraint.entityB.componentId]) {
          staleIds.push(constraint.id);
          continue;
        }
        workingComponents = solveConstraintIntoComponents(workingComponents, constraint);
      }

      set({
        components: workingComponents,
        ...(staleIds.length > 0
          ? { componentConstraints: componentConstraints.filter((constraint) => !staleIds.includes(constraint.id)) }
          : {}),
      });
    },
  };
}

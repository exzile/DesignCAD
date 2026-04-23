import { useEffect } from 'react';
import * as THREE from 'three';
import { useCADStore } from '../../../../../store/cadStore';
import type { ConstraintType, Sketch, SketchConstraint, SketchEntity, Tool } from '../../../../../types/cad';

interface ConstraintToolContext {
  activeTool: string;
  activeSketch: Sketch | null;
  addToConstraintSelection: (entityId: string) => void;
  clearConstraintSelection: () => void;
  addSketchConstraint: (constraint: SketchConstraint) => void;
  setActiveTool: (tool: Tool) => void;
  getWorldPoint: (event: MouseEvent) => THREE.Vector3 | null;
  setStatusMessage: (message: string) => void;
  gl: { domElement: HTMLCanvasElement };
}

function getRequiredConstraintCount(type: ConstraintType): number {
  switch (type) {
    case 'horizontal':
    case 'vertical':
    case 'fix':
      return 1;
    case 'symmetric':
      return 3;
    default:
      return 2;
  }
}

function findNearestEntity(entities: SketchEntity[], worldPoint: THREE.Vector3): SketchEntity | null {
  const entityPickRadius = 2;
  let best: SketchEntity | null = null;
  let bestDistance = entityPickRadius;

  for (const entity of entities) {
    if (
      (entity.type === 'line' || entity.type === 'construction-line' || entity.type === 'centerline') &&
      entity.points.length >= 2
    ) {
      const start = new THREE.Vector3(entity.points[0].x, entity.points[0].y, entity.points[0].z);
      const end = new THREE.Vector3(
        entity.points[entity.points.length - 1].x,
        entity.points[entity.points.length - 1].y,
        entity.points[entity.points.length - 1].z,
      );
      const delta = end.clone().sub(start);
      const deltaLength = delta.length();
      if (deltaLength < 1e-8) {
        continue;
      }
      const projection = Math.max(
        0,
        Math.min(1, worldPoint.clone().sub(start).dot(delta) / (deltaLength * deltaLength)),
      );
      const closest = start.clone().add(delta.multiplyScalar(projection));
      const distance = worldPoint.distanceTo(closest);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = entity;
      }
      continue;
    }

    if ((entity.type === 'circle' || entity.type === 'arc') && entity.points.length >= 1 && entity.radius) {
      const center = new THREE.Vector3(entity.points[0].x, entity.points[0].y, entity.points[0].z);
      const distance = Math.abs(worldPoint.distanceTo(center) - entity.radius);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = entity;
      }
    }
  }

  return best;
}

export function useSketchConstraintTool({
  activeTool,
  activeSketch,
  addToConstraintSelection,
  clearConstraintSelection,
  addSketchConstraint,
  setActiveTool,
  getWorldPoint,
  setStatusMessage,
  gl,
}: ConstraintToolContext): void {
  useEffect(() => {
    if (!activeSketch || !activeTool.startsWith('constrain-')) {
      return;
    }

    const constraintType = activeTool.replace('constrain-', '') as ConstraintType;
    const requiredCount = getRequiredConstraintCount(constraintType);

    const handleClick = (event: MouseEvent) => {
      if (event.button !== 0) {
        return;
      }

      const worldPoint = getWorldPoint(event);
      if (!worldPoint) {
        return;
      }

      const entity = findNearestEntity(activeSketch.entities, worldPoint);
      if (!entity) {
        setStatusMessage(`${constraintType}: click closer to a sketch entity`);
        return;
      }

      const currentSelection = useCADStore.getState().constraintSelection;
      if (currentSelection.includes(entity.id)) {
        setStatusMessage(`${constraintType}: entity already selected, click a different one`);
        return;
      }

      const nextSelection = [...currentSelection, entity.id];
      if (nextSelection.length < requiredCount) {
        addToConstraintSelection(entity.id);
        const remaining = requiredCount - nextSelection.length;
        setStatusMessage(`${constraintType}: ${remaining} more entity click${remaining > 1 ? 's' : ''} needed`);
        return;
      }

      addSketchConstraint({
        id: crypto.randomUUID(),
        type: constraintType,
        entityIds: nextSelection,
        ...(constraintType === 'offset'
          ? { value: useCADStore.getState().constraintOffsetValue }
          : {}),
      });
      clearConstraintSelection();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        clearConstraintSelection();
        setActiveTool('select');
      }
    };

    const canvas = gl.domElement;
    canvas.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      canvas.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    activeSketch,
    activeTool,
    addSketchConstraint,
    addToConstraintSelection,
    clearConstraintSelection,
    getWorldPoint,
    gl,
    setActiveTool,
    setStatusMessage,
  ]);
}

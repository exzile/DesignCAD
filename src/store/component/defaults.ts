import * as THREE from 'three';
import type { MaterialAppearance } from '../../types/cad';

export const defaultComponentMaterial: MaterialAppearance = {
  id: 'default-blue',
  name: 'Default Blue',
  color: '#4F8FD8',
  metalness: 0.08,
  roughness: 0.58,
  opacity: 1,
  category: 'plastic',
};

export function createRootComponent(rootId: string) {
  return {
    id: rootId,
    name: 'Assembly',
    parentId: null,
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
    grounded: true,
    isLinked: false,
    color: '#5B9BD5',
  };
}

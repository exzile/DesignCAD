import * as THREE from 'three';
import type { MaterialAppearance } from '../../types/cad';

export const defaultComponentMaterial: MaterialAppearance = {
  id: 'aluminum',
  name: 'Aluminum',
  color: '#B0B8C0',
  metalness: 0.8,
  roughness: 0.3,
  opacity: 1,
  category: 'metal',
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

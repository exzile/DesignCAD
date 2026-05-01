import * as THREE from 'three';

const CONTACT_EPSILON = 1e-5;

function rangesOverlapOrTouch(aMin: number, aMax: number, bMin: number, bMax: number): boolean {
  return aMax >= bMin - CONTACT_EPSILON && bMax >= aMin - CONTACT_EPSILON;
}

export function boxesHaveJoinableContact(current: THREE.Box3, tool: THREE.Box3): boolean {
  if (current.isEmpty() || tool.isEmpty()) return false;

  const overlapX = rangesOverlapOrTouch(current.min.x, current.max.x, tool.min.x, tool.max.x);
  const overlapY = rangesOverlapOrTouch(current.min.y, current.max.y, tool.min.y, tool.max.y);
  const overlapZ = rangesOverlapOrTouch(current.min.z, current.max.z, tool.min.z, tool.max.z);

  if (!(overlapX && overlapY && overlapZ)) return false;

  const xTouch =
    Math.abs(current.max.x - tool.min.x) <= CONTACT_EPSILON ||
    Math.abs(tool.max.x - current.min.x) <= CONTACT_EPSILON;
  const yTouch =
    Math.abs(current.max.y - tool.min.y) <= CONTACT_EPSILON ||
    Math.abs(tool.max.y - current.min.y) <= CONTACT_EPSILON;
  const zTouch =
    Math.abs(current.max.z - tool.min.z) <= CONTACT_EPSILON ||
    Math.abs(tool.max.z - current.min.z) <= CONTACT_EPSILON;

  const xInterior = current.max.x > tool.min.x + CONTACT_EPSILON && tool.max.x > current.min.x + CONTACT_EPSILON;
  const yInterior = current.max.y > tool.min.y + CONTACT_EPSILON && tool.max.y > current.min.y + CONTACT_EPSILON;
  const zInterior = current.max.z > tool.min.z + CONTACT_EPSILON && tool.max.z > current.min.z + CONTACT_EPSILON;

  return (
    (xInterior && yInterior && zInterior) ||
    (xTouch && yInterior && zInterior) ||
    (yTouch && xInterior && zInterior) ||
    (zTouch && xInterior && yInterior)
  );
}

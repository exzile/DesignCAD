export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

const ZERO: Vec3 = { x: 0, y: 0, z: 0 };
const ONE: Vec3 = { x: 1, y: 1, z: 1 };

function toFinite(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizePosition(position: unknown): Vec3 {
  const p = (position ?? {}) as Partial<Vec3>;
  return {
    x: toFinite(p.x, 0),
    y: toFinite(p.y, 0),
    z: toFinite(p.z, 0),
  };
}

export function normalizeScale(scale: unknown): Vec3 {
  if (typeof scale === 'number') {
    const s = toFinite(scale, 1);
    return { x: s, y: s, z: s };
  }

  const s = (scale ?? {}) as Partial<Vec3>;
  return {
    x: toFinite(s.x, 1),
    y: toFinite(s.y, 1),
    z: toFinite(s.z, 1),
  };
}

export function normalizeRotationRadians(rotation: unknown): Vec3 {
  if (typeof rotation === 'number') {
    return { x: 0, y: 0, z: (toFinite(rotation, 0) * Math.PI) / 180 };
  }

  const r = (rotation ?? ZERO) as Partial<Vec3>;
  return {
    x: toFinite(r.x, 0),
    y: toFinite(r.y, 0),
    z: toFinite(r.z, 0),
  };
}

export function normalizeRotationDegreesToRadians(rotation: unknown): Vec3 {
  if (typeof rotation === 'number') {
    return { x: 0, y: 0, z: (toFinite(rotation, 0) * Math.PI) / 180 };
  }

  const r = (rotation ?? ZERO) as Partial<Vec3>;
  return {
    x: (toFinite(r.x, 0) * Math.PI) / 180,
    y: (toFinite(r.y, 0) * Math.PI) / 180,
    z: (toFinite(r.z, 0) * Math.PI) / 180,
  };
}

export function fallbackVec3(value: unknown, fallback: Vec3): Vec3 {
  if (!value || typeof value !== 'object') return fallback;
  const v = value as Partial<Vec3>;
  return {
    x: toFinite(v.x, fallback.x),
    y: toFinite(v.y, fallback.y),
    z: toFinite(v.z, fallback.z),
  };
}

export const DEFAULT_VEC3_ZERO = ZERO;
export const DEFAULT_VEC3_ONE = ONE;

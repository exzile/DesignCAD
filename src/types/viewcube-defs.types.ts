export interface FaceDef {
  name: string;
  normal: [number, number, number];
  up: [number, number, number];
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
}

export interface EdgeDef {
  name: string;
  direction: [number, number, number];
  up: [number, number, number];
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
}

export interface CornerDef {
  name: string;
  direction: [number, number, number];
  up: [number, number, number];
  position: [number, number, number];
  size: number;
}

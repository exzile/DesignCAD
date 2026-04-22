export type FormElementType = 'vertex' | 'edge' | 'face';

export interface FormVertex {
  id: string;
  position: [number, number, number];
  crease: number;
}

export interface FormEdge {
  id: string;
  vertexIds: [string, string];
  crease: number;
}

export interface FormFace {
  id: string;
  vertexIds: string[];
}

export interface FormCage {
  id: string;
  name: string;
  vertices: FormVertex[];
  edges: FormEdge[];
  faces: FormFace[];
  subdivisionLevel: number;
  visible: boolean;
  componentId?: string;
}

export interface FormSelection {
  bodyId: string;
  type: FormElementType;
  ids: string[];
}

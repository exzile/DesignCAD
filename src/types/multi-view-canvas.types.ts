export type Layout = '2h' | '2v' | '4';

export type QuadrantKey = 'top' | 'front' | 'right' | 'perspective';

export interface QuadrantDef {
  key: QuadrantKey;
  label: string;
  color: string;
}

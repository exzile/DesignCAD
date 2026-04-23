export type IssueKind =
  | 'overhang'
  | 'off-plate'
  | 'tiny-features'
  | 'no-geometry'
  | 'missing-supports';

export interface Issue {
  kind: IssueKind;
  severity: 'info' | 'warning' | 'error';
  message: string;
  triangles?: number[];
}

export interface ObjectReport {
  objectId: string;
  objectName: string;
  issues: Issue[];
  highlightedTriangles: Set<number>;
}

export interface PrintabilityReport {
  objects: ObjectReport[];
  totals: {
    errors: number;
    warnings: number;
    info: number;
  };
}

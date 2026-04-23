export type BundleSlice = 'cad' | 'slicer' | 'printer' | 'theme';

export interface ImportResult {
  ok: boolean;
  appliedSections: string[];
  warnings: string[];
  error?: string;
}

export interface OpenResult extends ImportResult {
  filename?: string;
}

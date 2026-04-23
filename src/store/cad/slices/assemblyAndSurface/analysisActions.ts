import type { CADSliceContext } from '../../sliceContext';
import type { CADState } from '../../state';

export function createAnalysisActions({ set }: CADSliceContext): Partial<CADState> {
  return {
    activeAnalysis: null,
    setActiveAnalysis: (a) =>
      set((s) => ({
        activeAnalysis: s.activeAnalysis === a ? null : a,
      })),
    analysisParams: {
      direction: 'y',
      frequency: 8,
      minAngle: 15,
      uCount: 5,
      vCount: 5,
      minRadius: 1.0,
      combScale: 1.0,
    },
    setAnalysisParams: (p) =>
      set((s) => ({
        analysisParams: { ...s.analysisParams, ...p },
      })),
  };
}

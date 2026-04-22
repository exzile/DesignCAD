import type * as THREE from 'three';
import type { SliceResult } from '../../../../../types/slicer';
import { finalizeGCodeStats, appendEndGCode } from '../../../gcode/footer';
import { prepareSliceRun } from './prepareSliceRun';
import { prepareLayerState } from './prepareLayerState';
import { emitGroupedAndContourWalls } from './emitGroupedAndContourWalls';
import { emitContourInfill } from './emitContourInfill';
import { finalizeLayer } from './finalizeLayer';

export async function runSlicePipeline(
  pipeline: any,
  geometries: { geometry: THREE.BufferGeometry; transform: THREE.Matrix4 }[],
): Promise<SliceResult> {
  const run = prepareSliceRun(pipeline, geometries);

  for (let li = 0; li < run.totalLayers; li++) {
    const layer = await prepareLayerState(pipeline, run, li);
    if (!layer) continue;
    const contourData = emitGroupedAndContourWalls(pipeline, run, layer);
    emitContourInfill(pipeline, run, layer, contourData);
    finalizeLayer(pipeline, run, layer);
  }

  pipeline.reportProgress('generating', 95, run.totalLayers, run.totalLayers, 'Writing end G-code...');
  appendEndGCode(run.gcode, run.printer, run.mat);
  const stats = finalizeGCodeStats(
    run.gcode,
    run.totalTime,
    run.emitter.totalExtruded,
    run.printer,
    run.mat,
  );
  pipeline.reportProgress('complete', 100, run.totalLayers, run.totalLayers, 'Slicing complete.');

  return {
    gcode: run.gcode.join('\n'),
    layerCount: run.totalLayers,
    printTime: stats.estimatedTime,
    filamentUsed: run.emitter.totalExtruded,
    filamentWeight: stats.filamentWeight,
    filamentCost: stats.filamentCost,
    layers: run.sliceLayers,
  };
}

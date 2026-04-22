import * as THREE from 'three';
import type { SliceResult } from '../../../../types/slicer';
import { SlicePipelineBase } from './SlicePipelineBase';
import { runSlicePipeline } from './steps/runSlicePipeline';

export class SlicePipeline extends SlicePipelineBase {
  async slice(
    geometries: { geometry: THREE.BufferGeometry; transform: THREE.Matrix4 }[],
  ): Promise<SliceResult> {
    return runSlicePipeline(this, geometries);
  }
}

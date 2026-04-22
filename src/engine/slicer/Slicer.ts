import type { PrintProfile } from '../../types/slicer';
import { shouldRetractOnTravel } from './gcode/travel';
import { SlicePipeline } from './pipeline/execution/SlicePipeline';

export class Slicer extends SlicePipeline {
  shouldRetractOnTravel(distance: number, extrudedSinceRetract: number, pp: PrintProfile): boolean {
    return shouldRetractOnTravel(distance, extrudedSinceRetract, pp);
  }
}

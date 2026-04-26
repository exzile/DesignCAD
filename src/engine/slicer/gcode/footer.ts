import type {
  MaterialProfile,
  PrinterProfile,
} from '../../../types/slicer';
import type { FinalizedGCodeStats } from '../../../types/slicer-gcode-footer.types';
import { resolveGCodeTemplate } from './runtime';
import { dedupeEndGCode } from './startEnd';

export function appendEndGCode(
  gcode: string[],
  printer: PrinterProfile,
  material: MaterialProfile,
): void {
  gcode.push('');
  gcode.push('; ----- End G-code -----');
  const rawEndGCode = resolveGCodeTemplate(printer.endGCode, {
    nozzleTemp: material.nozzleTemp,
    bedTemp: material.bedTemp,
  });
  const endTemplateHasPrintMacro = /^\s*END_PRINT\b/m.test(rawEndGCode);
  if (!endTemplateHasPrintMacro) {
    gcode.push('M73 P100 ; Print complete');
    gcode.push('M107 ; Fan off');
    if (material.finalPrintingTemperature !== undefined) {
      gcode.push(`M104 S${material.finalPrintingTemperature} ; Cooldown nozzle`);
    }
  }
  const endGCode = dedupeEndGCode(rawEndGCode, {
    slicerTurnsFanOff: !endTemplateHasPrintMacro,
    slicerSetsFinalNozzleTemp: !endTemplateHasPrintMacro && material.finalPrintingTemperature !== undefined,
  });
  if (endGCode) gcode.push(endGCode);
}

export function finalizeGCodeStats(
  gcode: string[],
  totalTime: number,
  totalExtruded: number,
  printer: PrinterProfile,
  material: MaterialProfile,
): FinalizedGCodeStats {
  const filamentCrossSection = Math.PI * (printer.filamentDiameter / 2) ** 2;
  const filamentVolumeMm3 = totalExtruded * filamentCrossSection;
  const filamentVolumeCm3 = filamentVolumeMm3 / 1000;
  const filamentWeight = filamentVolumeCm3 * material.density;
  const filamentCost = (filamentWeight / 1000) * material.costPerKg;

  const estimatedTime = totalTime * (printer.printTimeEstimationFactor ?? 1.0);
  const hours = Math.floor(estimatedTime / 3600);
  const minutes = Math.floor((estimatedTime % 3600) / 60);
  const timeIndex = gcode.findIndex((line) => line.includes('PRINT_TIME_PLACEHOLDER'));
  const filamentIndex = gcode.findIndex((line) => line.includes('FILAMENT_USED_PLACEHOLDER'));
  if (timeIndex >= 0) {
    gcode[timeIndex] = `; Estimated print time: ${hours}h ${minutes}m`;
  }
  if (filamentIndex >= 0) {
    gcode[filamentIndex] = `; Filament used: ${totalExtruded.toFixed(1)}mm (${filamentWeight.toFixed(1)}g)`;
  }

  return {
    estimatedTime,
    filamentWeight,
    filamentCost,
  };
}

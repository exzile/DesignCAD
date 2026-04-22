export interface PrinterProfile {
  id: string;
  name: string;
  // Build volume
  buildVolume: { x: number; y: number; z: number };
  // Nozzle
  nozzleDiameter: number; // mm (0.4 default)
  nozzleCount: number;
  // Filament
  filamentDiameter: number; // 1.75 or 2.85
  // Heated bed
  hasHeatedBed: boolean;
  hasHeatedChamber: boolean;
  // Limits
  maxNozzleTemp: number;
  maxBedTemp: number;
  maxSpeed: number; // mm/s
  maxAcceleration: number; // mm/s²
  // Origin
  originCenter: boolean; // center or front-left
  // G-code flavor
  gcodeFlavorType: 'reprap' | 'marlin' | 'klipper' | 'duet';
  // Retraction mode
  firmwareRetraction?: boolean; // use G10/G11 instead of E-move retraction
  // Heatup behaviour
  waitForBuildPlate?: boolean;  // true = M190 (blocking), false = M140 (non-blocking); default true
  waitForNozzle?: boolean;      // true = M109 (blocking), false = M104 (non-blocking); default true
  // Fan output scaling
  scaleFanSpeedTo01?: boolean;  // emit M106 S0.0–1.0 instead of S0–255 (some Klipper configs)
  // Per-axis machine limits — emitted as M203 (max speed) and M201 (max accel) in start G-code.
  // Undefined means "don't emit" — keeps existing firmware defaults.
  maxSpeedX?: number;     // mm/s — M203 X
  maxSpeedY?: number;     // mm/s — M203 Y
  maxSpeedZ?: number;     // mm/s — M203 Z
  maxSpeedE?: number;     // mm/s — M203 E
  maxAccelX?: number;     // mm/s² — M201 X
  maxAccelY?: number;     // mm/s² — M201 Y
  maxAccelZ?: number;     // mm/s² — M201 Z
  maxAccelE?: number;     // mm/s² — M201 E
  // Default acceleration (M204 S) and jerk (M205 X/Y)
  defaultAcceleration?: number; // mm/s² — M204 S
  defaultJerk?: number;         // mm/s  — M205 X Y
  // Time estimation
  printTimeEstimationFactor?: number; // multiply computed print time by this factor (default 1.0)
  // Build plate
  buildPlateShape?: 'rectangular' | 'elliptic';
  // Printhead clearance (gantry offsets from nozzle tip)
  printheadMinX?: number;   // X min (negative = left of nozzle)
  printheadMinY?: number;   // Y min (negative = towards back)
  printheadMaxX?: number;   // X max (positive = right of nozzle)
  printheadMaxY?: number;   // Y max (positive = towards front)
  gantryHeight?: number;    // mm — vertical clearance of the printhead
  // Multi-extruder
  applyExtruderOffsets?: boolean;
  startGCodeMustBeFirst?: boolean;
  extruderOffsetX?: number;    // mm — nozzle X offset from primary
  extruderOffsetY?: number;    // mm — nozzle Y offset from primary
  coolingFanNumber?: number;   // fan index (0-based)
  // Extruder G-code snippets
  extruderPrestartGCode?: string;
  extruderStartGCode?: string;
  extruderEndGCode?: string;
  extruderChangeDuration?: number;      // s
  extruderStartGCodeDuration?: number;  // s
  extruderEndGCodeDuration?: number;    // s
  // Start/end gcode templates
  startGCode: string;
  endGCode: string;
  // Fields whose values were imported from a connected printer (shown with
  // lock badge in UI; edit via the board's config.g + resync).
  machineSourcedFields?: string[];
}

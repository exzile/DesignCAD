import type { PrinterProfile, MaterialProfile, PrintProfile } from '../types/slicer';

// Parses parameter values from a single G-code line, e.g. "M208 X220 Y220 Z250"
function params(line: string): Record<string, string> {
  const out: Record<string, string> = {};
  const tokens = line.trim().split(/\s+/).slice(1);
  for (const tok of tokens) {
    if (tok.startsWith(';')) break;
    const letter = tok[0]?.toUpperCase();
    if (letter && /[A-Z]/.test(letter)) {
      out[letter] = tok.slice(1);
    }
  }
  return out;
}

function num(p: Record<string, string>, key: string): number | undefined {
  const v = parseFloat(p[key] ?? '');
  return isNaN(v) ? undefined : v;
}

// Strip inline comments and return only executable G/M/T lines
function codeLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/;.*$/, '').trim())
    .filter((l) => l.length > 0 && /^[MmGgTt]\d+/.test(l));
}

// All comment lines (for scanning nozzle diameter hints left by slicers)
function commentLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith(';'));
}

export interface PrintProfilePatch {
  fields: Partial<Pick<PrintProfile,
    'accelerationEnabled' | 'accelerationPrint' | 'accelerationTravel' |
    'accelerationWall' | 'accelerationInfill' | 'accelerationTopBottom' | 'accelerationSupport' |
    'jerkEnabled' | 'jerkPrint' | 'jerkTravel' |
    'jerkWall' | 'jerkInfill' | 'jerkTopBottom'
  >>;
  machineSourcedFields: string[];
}

export interface MaterialProfilePatch {
  fields: Partial<Pick<MaterialProfile,
    'retractionDistance' | 'retractionSpeed' | 'retractionRetractSpeed' | 'retractionPrimeSpeed' |
    'retractionZHop' | 'linearAdvanceEnabled' | 'linearAdvanceFactor'
  >>;
  machineSourcedFields: string[];
}

export interface DuetConfigParseResult {
  profile: Partial<Omit<PrinterProfile, 'id' | 'name' | 'startGCode' | 'endGCode'>>;
  startGCode: string;
  endGCode: string;
  /** G-code to run when the extruder is activated (tool0.g content) */
  extruderStartGCode: string;
  /** G-code to run when the extruder is released (tfree0.g content) */
  extruderEndGCode: string;
  /** G-code to run before the extruder is activated (tpre0.g content) */
  extruderPrestartGCode: string;
  /** Material profile fields derived from machine config (retraction, pressure advance) */
  materialPatch: MaterialProfilePatch;
  /** Print profile fields derived from machine config (acceleration, jerk) */
  printPatch: PrintProfilePatch;
}

function parseMainConfig(text: string, overrideText: string): {
  buildX?: number; buildY?: number; buildZ?: number;
  originCenter: boolean;
  nozzleDiameter: number;
  filamentDiameter: number;
  nozzleCount: number;
  hasHeatedBed: boolean;
  hasHeatedChamber: boolean;
  maxSpeedX?: number; maxSpeedY?: number; maxSpeedZ?: number; maxSpeedE?: number;
  maxAccelX?: number; maxAccelY?: number; maxAccelZ?: number; maxAccelE?: number;
  defaultAcceleration?: number;
  defaultJerk?: number;
  maxNozzleTemp: number;
  maxBedTemp: number;
  extruderOffsetX?: number;
  extruderOffsetY?: number;
  coolingFanNumber?: number;
  // Retraction (M207)
  retractionDistance?: number;
  retractionRetractSpeed?: number;
  retractionPrimeSpeed?: number;
  retractionZHop?: number;
  // Pressure advance (M572)
  pressureAdvance?: number;
} {
  // Merge config.g + config-override.g; override values win for calibrated entries
  const allLines = [...codeLines(text), ...codeLines(overrideText)];
  const allComments = [...commentLines(text), ...commentLines(overrideText)];

  let buildX: number | undefined;
  let buildY: number | undefined;
  let buildZ: number | undefined;
  let originCenter = false;
  let nozzleDiameter = 0.4;
  let filamentDiameter = 1.75;
  let nozzleCount = 1;
  let hasHeatedBed = false;
  let hasHeatedChamber = false;
  let maxSpeedX: number | undefined;
  let maxSpeedY: number | undefined;
  let maxSpeedZ: number | undefined;
  let maxSpeedE: number | undefined;
  let maxAccelX: number | undefined;
  let maxAccelY: number | undefined;
  let maxAccelZ: number | undefined;
  let maxAccelE: number | undefined;
  let defaultAcceleration: number | undefined;
  let defaultJerk: number | undefined;
  let maxNozzleTemp = 300;
  let maxBedTemp = 120;
  let extruderOffsetX: number | undefined;
  let extruderOffsetY: number | undefined;
  let coolingFanNumber: number | undefined;
  let retractionDistance: number | undefined;
  let retractionRetractSpeed: number | undefined;
  let retractionPrimeSpeed: number | undefined;
  let retractionZHop: number | undefined;
  let pressureAdvance: number | undefined;

  // Scan comments for nozzle diameter hints (e.g. left by Cura/SuperSlicer exports)
  for (const c of allComments) {
    const m = c.match(/nozzle[_\s-]?(?:diameter|size)[_\s]*[=:]\s*([\d.]+)/i);
    if (m) { nozzleDiameter = parseFloat(m[1]); break; }
  }

  for (const line of allLines) {
    const upper = line.toUpperCase();
    const p = params(line);

    // M208 — axis limits / build volume
    if (upper.startsWith('M208')) {
      const s = p['S'];
      if (!s || s === '0') {
        if (p['X'] !== undefined) buildX = Math.abs(num(p, 'X') ?? 0);
        if (p['Y'] !== undefined) buildY = Math.abs(num(p, 'Y') ?? 0);
        if (p['Z'] !== undefined) buildZ = Math.abs(num(p, 'Z') ?? 0);
      }
      if (s === '1') {
        const x1 = num(p, 'X');
        if (x1 !== undefined && x1 < 0) originCenter = true;
      }
    }

    // M200 — filament diameter (D param)
    if (upper.startsWith('M200')) {
      const d = num(p, 'D');
      if (d !== undefined && d > 0) filamentDiameter = d;
    }

    // M203 — max speeds mm/min → mm/s
    if (upper.startsWith('M203')) {
      const toMms = (v: number) => Math.round(v / 60);
      if (p['X'] !== undefined) maxSpeedX = toMms(num(p, 'X') ?? 0);
      if (p['Y'] !== undefined) maxSpeedY = toMms(num(p, 'Y') ?? 0);
      if (p['Z'] !== undefined) maxSpeedZ = toMms(num(p, 'Z') ?? 0);
      if (p['E'] !== undefined) maxSpeedE = toMms(num(p, 'E') ?? 0);
    }

    // M201 — max accelerations mm/s²
    if (upper.startsWith('M201')) {
      if (p['X'] !== undefined) maxAccelX = num(p, 'X');
      if (p['Y'] !== undefined) maxAccelY = num(p, 'Y');
      if (p['Z'] !== undefined) maxAccelZ = num(p, 'Z');
      if (p['E'] !== undefined) maxAccelE = num(p, 'E');
    }

    // M204 — default print acceleration
    if (upper.startsWith('M204')) {
      const s = num(p, 'S');
      if (s !== undefined) defaultAcceleration = s;
    }

    // M566 — instantaneous speed change (Duet jerk), mm/min → mm/s
    if (upper.startsWith('M566')) {
      const x = num(p, 'X');
      if (x !== undefined) defaultJerk = Math.round(x / 60);
    }

    // M563 — define tool: count extruders, read fan assignment
    if (upper.startsWith('M563')) {
      const toolNum = num(p, 'P');
      if (toolNum !== undefined) {
        nozzleCount = Math.max(nozzleCount, Math.floor(toolNum) + 1);
        // F param = fan number for tool 0
        if (Math.floor(toolNum) === 0 && p['F'] !== undefined) {
          coolingFanNumber = Math.floor(num(p, 'F') ?? 0);
        }
      }
    }

    // G10 Px — tool position / temperature (nozzle diameter hint via R param rarely used,
    // but X/Y offsets for multi-extruder are here)
    if (upper.startsWith('G10') && p['P'] !== undefined) {
      const toolIdx = Math.floor(num(p, 'P') ?? -1);
      if (toolIdx === 0) {
        if (p['X'] !== undefined) extruderOffsetX = num(p, 'X');
        if (p['Y'] !== undefined) extruderOffsetY = num(p, 'Y');
      }
    }

    // M305 / M308 — temperature sensor → detect heated bed (heater 0) and chamber
    if (upper.startsWith('M305') || upper.startsWith('M308')) {
      const pVal = p['P'] ?? '';
      if (pVal === '0') hasHeatedBed = true;
      if (pVal === '2') hasHeatedChamber = true;  // heater 2 = chamber on many setups
    }

    // M140 — bed temp → heated bed present
    if (upper.startsWith('M140')) hasHeatedBed = true;

    // M141 — chamber temp → heated chamber present
    if (upper.startsWith('M141')) hasHeatedChamber = true;

    // M143 — max temp per heater
    if (upper.startsWith('M143')) {
      const h = p['H'];
      const s = num(p, 'S');
      if (s !== undefined) {
        if (!h || h === '1') maxNozzleTemp = Math.max(maxNozzleTemp, s);
        else if (h === '0') maxBedTemp = Math.max(maxBedTemp, s);
      }
    }

    // M207 — firmware retraction: S=distance F=retractSpeed(mm/min) T=primeSpeed(mm/min) Z=zhop
    if (upper.startsWith('M207')) {
      const s = num(p, 'S');
      const f = num(p, 'F');
      const t = num(p, 'T');
      const z = num(p, 'Z');
      if (s !== undefined) retractionDistance = s;
      if (f !== undefined) retractionRetractSpeed = Math.round(f / 60);
      if (t !== undefined) retractionPrimeSpeed = Math.round(t / 60);
      if (z !== undefined) retractionZHop = z;
    }

    // M572 — pressure advance: D=drive S=value (config-override.g usually has calibrated value)
    if (upper.startsWith('M572')) {
      const d = num(p, 'D');
      const s = num(p, 'S');
      // D0 = first extruder drive
      if ((d === undefined || d === 0) && s !== undefined) {
        pressureAdvance = s;
      }
    }
  }

  return {
    buildX, buildY, buildZ, originCenter,
    nozzleDiameter, filamentDiameter, nozzleCount,
    hasHeatedBed, hasHeatedChamber,
    maxSpeedX, maxSpeedY, maxSpeedZ, maxSpeedE,
    maxAccelX, maxAccelY, maxAccelZ, maxAccelE,
    defaultAcceleration, defaultJerk,
    maxNozzleTemp, maxBedTemp,
    extruderOffsetX, extruderOffsetY,
    coolingFanNumber,
    retractionDistance, retractionRetractSpeed, retractionPrimeSpeed, retractionZHop,
    pressureAdvance,
  };
}

export function parseDuetConfig(
  configG: string,
  startG = '',
  stopG = '',
  overrideG = '',
  tool0G = '',
  tpre0G = '',
  tfree0G = '',
): DuetConfigParseResult {
  const r = parseMainConfig(configG, overrideG);

  const maxSpeed = r.maxSpeedX ?? r.maxSpeedY ?? 200;
  const maxAccel = r.maxAccelX ?? r.maxAccelY ?? 3000;

  const profile: Partial<Omit<PrinterProfile, 'id' | 'name' | 'startGCode' | 'endGCode'>> = {
    gcodeFlavorType: 'duet',
    nozzleDiameter: r.nozzleDiameter,
    filamentDiameter: r.filamentDiameter,
    nozzleCount: r.nozzleCount,
    hasHeatedBed: r.hasHeatedBed,
    hasHeatedChamber: r.hasHeatedChamber,
    maxNozzleTemp: r.maxNozzleTemp,
    maxBedTemp: r.maxBedTemp,
    maxSpeed,
    maxAcceleration: maxAccel,
    originCenter: r.originCenter,
    ...(r.buildX !== undefined && r.buildY !== undefined && r.buildZ !== undefined
      ? { buildVolume: { x: r.buildX, y: r.buildY, z: r.buildZ } }
      : {}),
    ...(r.maxSpeedX !== undefined ? { maxSpeedX: r.maxSpeedX } : {}),
    ...(r.maxSpeedY !== undefined ? { maxSpeedY: r.maxSpeedY } : {}),
    ...(r.maxSpeedZ !== undefined ? { maxSpeedZ: r.maxSpeedZ } : {}),
    ...(r.maxSpeedE !== undefined ? { maxSpeedE: r.maxSpeedE } : {}),
    ...(r.maxAccelX !== undefined ? { maxAccelX: r.maxAccelX } : {}),
    ...(r.maxAccelY !== undefined ? { maxAccelY: r.maxAccelY } : {}),
    ...(r.maxAccelZ !== undefined ? { maxAccelZ: r.maxAccelZ } : {}),
    ...(r.maxAccelE !== undefined ? { maxAccelE: r.maxAccelE } : {}),
    ...(r.defaultAcceleration !== undefined ? { defaultAcceleration: r.defaultAcceleration } : {}),
    ...(r.defaultJerk !== undefined ? { defaultJerk: r.defaultJerk } : {}),
    ...(r.extruderOffsetX !== undefined ? { extruderOffsetX: r.extruderOffsetX } : {}),
    ...(r.extruderOffsetY !== undefined ? { extruderOffsetY: r.extruderOffsetY } : {}),
    ...(r.coolingFanNumber !== undefined ? { coolingFanNumber: r.coolingFanNumber } : {}),
  };

  // Build material profile patch from retraction + pressure advance
  const materialFields: MaterialProfilePatch['fields'] = {};
  const machineSourcedFields: string[] = [];

  if (r.retractionDistance !== undefined) {
    materialFields.retractionDistance = r.retractionDistance;
    machineSourcedFields.push('retractionDistance');
  }
  if (r.retractionRetractSpeed !== undefined) {
    materialFields.retractionRetractSpeed = r.retractionRetractSpeed;
    materialFields.retractionSpeed = r.retractionRetractSpeed; // keep base speed in sync
    machineSourcedFields.push('retractionSpeed', 'retractionRetractSpeed');
  }
  if (r.retractionPrimeSpeed !== undefined) {
    materialFields.retractionPrimeSpeed = r.retractionPrimeSpeed;
    machineSourcedFields.push('retractionPrimeSpeed');
  }
  if (r.retractionZHop !== undefined) {
    materialFields.retractionZHop = r.retractionZHop;
    machineSourcedFields.push('retractionZHop');
  }
  if (r.pressureAdvance !== undefined) {
    materialFields.linearAdvanceFactor = r.pressureAdvance;
    materialFields.linearAdvanceEnabled = true;
    machineSourcedFields.push('linearAdvanceFactor', 'linearAdvanceEnabled');
  }

  // Build print profile patch from acceleration (M204/M201) and jerk (M566)
  // Duet applies one value globally; we seed all per-zone fields from it so
  // the user has a sensible starting point and can tune individually.
  const printFields: PrintProfilePatch['fields'] = {};
  const printMachineSourced: string[] = [];

  // Prefer M204 S (default acceleration) over M201 X/Y (max acceleration limit)
  const accel = r.defaultAcceleration ?? r.maxAccelX ?? r.maxAccelY;
  if (accel !== undefined) {
    printFields.accelerationEnabled   = true;
    printFields.accelerationPrint     = accel;
    printFields.accelerationTravel    = accel;
    printFields.accelerationWall      = accel;
    printFields.accelerationInfill    = accel;
    printFields.accelerationTopBottom = accel;
    printFields.accelerationSupport   = accel;
    printMachineSourced.push(
      'accelerationEnabled', 'accelerationPrint', 'accelerationTravel',
      'accelerationWall', 'accelerationInfill', 'accelerationTopBottom', 'accelerationSupport',
    );
  }

  if (r.defaultJerk !== undefined) {
    printFields.jerkEnabled    = true;
    printFields.jerkPrint      = r.defaultJerk;
    printFields.jerkTravel     = r.defaultJerk;
    printFields.jerkWall       = r.defaultJerk;
    printFields.jerkInfill     = r.defaultJerk;
    printFields.jerkTopBottom  = r.defaultJerk;
    printMachineSourced.push(
      'jerkEnabled', 'jerkPrint', 'jerkTravel',
      'jerkWall', 'jerkInfill', 'jerkTopBottom',
    );
  }

  return {
    profile,
    startGCode: startG,
    endGCode: stopG,
    extruderStartGCode: tool0G,
    extruderEndGCode: tfree0G,
    extruderPrestartGCode: tpre0G,
    materialPatch: { fields: materialFields, machineSourcedFields },
    printPatch: { fields: printFields, machineSourcedFields: printMachineSourced },
  };
}

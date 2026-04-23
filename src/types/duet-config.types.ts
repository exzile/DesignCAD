import type { PrinterProfile, MaterialProfile, PrintProfile } from './slicer';

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
  /** Printer profile field names whose values came from config.g */
  profileMachineSourcedFields: string[];
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

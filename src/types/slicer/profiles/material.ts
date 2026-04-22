export interface MaterialProfile {
  id: string;
  printerId?: string;
  name: string;
  type: 'PLA' | 'ABS' | 'PETG' | 'TPU' | 'Nylon' | 'ASA' | 'PC' | 'PVA' | 'HIPS' | 'Custom';
  color: string; // hex color for preview
  // Temperatures
  nozzleTemp: number;
  nozzleTempFirstLayer: number;
  bedTemp: number;
  bedTempFirstLayer: number;
  chamberTemp: number;
  initialPrintingTemperature?: number; // preheat temp before bed reaches target (avoids ooze while waiting)
  finalPrintingTemperature?: number;   // cooldown temp emitted at end of print (before end G-code)
  // Fan
  fanSpeedMin: number; // 0-100%
  fanSpeedMax: number;
  fanDisableFirstLayers: number;
  // Retraction
  retractionDistance: number; // mm
  retractionSpeed: number; // mm/s — used as fallback for retract and prime
  retractionRetractSpeed?: number; // mm/s — retract (pull) speed; overrides retractionSpeed
  retractionPrimeSpeed?: number;   // mm/s — prime (push) speed; overrides retractionSpeed
  retractionZHop: number; // mm
  // Linear Advance (Marlin M900 / Klipper pressure_advance)
  linearAdvanceEnabled?: boolean; // emit M900 before print starts
  linearAdvanceFactor?: number;   // K value (Marlin) or pressure_advance (Klipper)

  // Shrinkage compensation
  shrinkageCompensationXY?: number; // % — scale XY contours up to pre-compensate for material shrinkage (e.g. 0.2)
  shrinkageCompensationZ?: number;  // % — scale Z layer heights to pre-compensate for vertical shrinkage

  // Flow
  flowRate: number; // multiplier (1.0 default)
  // Density for weight estimation
  density: number; // g/cm³
  costPerKg: number; // $ per kg
  // Fields whose values were imported from a connected printer (shown with machine badge in UI)
  machineSourcedFields?: string[];
}

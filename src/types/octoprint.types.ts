export interface OctoPrintConfig {
  url: string;       // e.g. "http://octopi.local" or "http://192.168.1.100"
  apiKey: string;    // OctoPrint API key from settings
}

export interface PrinterStatus {
  state: string;
  stateDescription: string;
  flags: {
    operational: boolean;
    printing: boolean;
    paused: boolean;
    error: boolean;
    ready: boolean;
    closedOrError: boolean;
  };
}

export interface TemperatureData {
  bed: { actual: number; target: number; offset: number };
  tool0: { actual: number; target: number; offset: number };
  tool1?: { actual: number; target: number; offset: number };
}

export interface PrintJob {
  file: { name: string; size: number; date: number };
  estimatedPrintTime: number;
  averagePrintTime: number | null;
  filament: {
    tool0?: { length: number; volume: number };
  };
}

export interface PrintProgress {
  completion: number;          // 0-100
  filepos: number;
  printTime: number;           // seconds elapsed
  printTimeLeft: number;       // seconds remaining
  printTimeLeftOrigin: string;
}

export interface PrinterFile {
  name: string;
  path: string;
  type: string;
  size: number;
  date: number;
  origin: 'local' | 'sdcard';
}

export interface ConnectionSettings {
  ports: string[];
  baudrates: number[];
  printerProfiles: { id: string; name: string }[];
  current: {
    port: string | null;
    baudrate: number | null;
    printerProfile: string | null;
    state: string;
  };
}

export interface OctoPrintEvent {
  type: 'temperature' | 'state' | 'progress' | 'job';
  data: TemperatureData | PrinterStatus | PrintProgress | PrintJob;
}

export interface PrinterState {
  connected: boolean;
  config: OctoPrintConfig | null;
  status: PrinterStatus | null;
  temperature: TemperatureData | null;
  job: PrintJob | null;
  progress: PrintProgress | null;
  files: PrinterFile[];
  error: string | null;
  webcamUrl: string | null;
}

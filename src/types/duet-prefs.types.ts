export type Units = 'metric' | 'imperial';
export type NotifSeverity = 'info' | 'warning' | 'error';
export type TemperatureUnit = 'C' | 'F';
export type DateFormat = 'relative' | 'absolute';
export type CameraStreamPreference = 'sub' | 'main';
export type CameraSourceType = 'network' | 'browser-usb' | 'server-usb';
export type CameraMainStreamProtocol = 'rtsp' | 'http' | 'hls';
export type CameraRtspTransport = 'tcp' | 'udp';
export type CameraPathPreset = 'generic' | 'amcrest';
export type CameraDashboardControlSection = 'record' | 'settings' | 'library' | 'timeline' | 'health';
export type CameraHdBridgeQuality = 'native' | '1080p' | '720p' | '480p';

export interface CameraDashboardPreset {
  id: string;
  name: string;
  showGrid: boolean;
  showCrosshair: boolean;
  flipImage: boolean;
  rotation: number;
  timelapseIntervalSec: number;
  timelapseFps: number;
}

export interface CameraDashboardCalibration {
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CameraDashboardPrefs {
  autoRecord: boolean;
  autoTimelapse: boolean;
  autoSnapshotFirstLayer: boolean;
  autoSnapshotLayer: boolean;
  autoSnapshotFinish: boolean;
  autoSnapshotError: boolean;
  scheduledSnapshots: boolean;
  scheduledSnapshotIntervalMin: number;
  anomalyCapture: boolean;
  timelapseIntervalSec: number;
  timelapseFps: number;
  showGrid: boolean;
  showCrosshair: boolean;
  flipImage: boolean;
  rotation: number;
  healthPanelOpen: boolean;
  activeControlSection: CameraDashboardControlSection;
  editorCollapsed: boolean;
  cameraPresets: CameraDashboardPreset[];
  calibration: CameraDashboardCalibration;
  ptzEnabled: boolean;
  ptzSpeed: number;
  hdBridgeQuality: CameraHdBridgeQuality;
}

export interface CustomButton {
  id: string;
  label: string;
  gcode: string;
}

export type KinematicsType = 'cartesian' | 'corexy' | 'delta' | 'other';

export interface MachineConfig {
  buildVolumeX: number;
  buildVolumeY: number;
  buildVolumeZ: number;
  nozzleDiameter: number;
  extruderCount: number;
  hasHeatedBed: boolean;
  hasHeatedChamber: boolean;
  maxFeedRateX: number;
  maxFeedRateY: number;
  maxFeedRateZ: number;
  maxAccelX: number;
  maxAccelY: number;
  maxAccelZ: number;
  kinematics: KinematicsType;
}

export interface DuetPrefs {
  // General
  units: Units;
  webcamSourceType: CameraSourceType;
  webcamHost: string;
  webcamUrl: string;
  webcamMainStreamUrl: string;
  webcamUsbDeviceId: string;
  webcamUsbDeviceLabel: string;
  webcamServerUsbDevice: string;
  webcamStreamPreference: CameraStreamPreference;
  webcamMainStreamProtocol: CameraMainStreamProtocol;
  webcamRtspTransport: CameraRtspTransport;
  webcamPathPreset: CameraPathPreset;
  webcamUsername: string;
  webcamPassword: string;
  cameraDashboard: CameraDashboardPrefs;
  // Behaviour
  confirmToolChange: boolean;
  silentPrompts: boolean;
  autoReconnect: boolean;
  reconnectInterval: number;
  maxRetries: number;
  // Notifications
  toastDurationMs: number;
  notificationsSound: boolean;
  notifMinSeverity: NotifSeverity;
  // Sound alerts
  soundAlertOnComplete: boolean;
  // Temperature display
  temperatureUnit: TemperatureUnit;
  // Date display
  dateFormat: DateFormat;
  // Custom dashboard buttons
  customButtons: CustomButton[];
  // Manual machine configuration (used when not connected or for non-auto boards)
  machineConfig: MachineConfig;
}

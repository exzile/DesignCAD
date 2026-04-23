export type Units = 'metric' | 'imperial';
export type NotifSeverity = 'info' | 'warning' | 'error';
export type TemperatureUnit = 'C' | 'F';
export type DateFormat = 'relative' | 'absolute';

export interface CustomButton {
  id: string;
  label: string;
  gcode: string;
}

export interface DuetPrefs {
  // General
  units: Units;
  webcamUrl: string;
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
}

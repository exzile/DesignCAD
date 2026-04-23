export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  // Backgrounds
  bgPrimary: string;
  bgSecondary: string;
  bgToolbar: string;
  bgPanel: string;
  bgCanvas: string;
  bgInput: string;         // input field background
  bgElevated: string;      // slightly raised panel/card (e.g. inner surfaces)
  bgElevatedHover: string; // elevated panel hover state
  bgHover: string;
  bgActive: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  // Borders
  border: string;
  borderLight: string;
  borderStrong: string;    // stronger/darker border for inner separators
  // Accent
  accent: string;
  accentHover: string;
  accentLight: string;
  accentDim: string;       // muted accent, e.g. hover states on accent buttons
  // Tab colors (Fusion 360 style - each tab has its own color)
  tabSolid: string;
  tabSurface: string;
  tabMesh: string;
  tabForm: string;
  tabManage: string;
  tabUtilities: string;
  tabPrepare: string;
  tabPrinter: string;
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  // Overlay
  overlay: string;         // modal/dropdown backdrop
  // 3D Viewport / Canvas colors
  canvasBg: string;           // WebGL clear color + container background
  gridCell: string;           // grid cell lines
  gridSection: string;        // grid section lines
  groundPlane: string;        // ground plane surface color
  groundPlaneEdge: string;    // ground plane edge/border color
  axisRed: string;            // X axis color
  axisGreen: string;          // Y axis color (up)
  axisBlue: string;           // Z axis color
  hemisphereColor: string;    // hemisphere light sky color
  hemisphereGround: string;   // hemisphere light ground color
}

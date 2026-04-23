import React from 'react';
import {
  LayoutDashboard,
  Activity,
  Terminal,
  Play,
  FolderOpen,
  FileCode,
  Grid3x3,
  History,
  Braces,
  Settings,
  FlaskConical,
  TrendingUp,
  Router,
  Plug,
} from 'lucide-react';
import DuetDashboard from '../DuetDashboard';
import DuetStatus from '../DuetStatus';
import DuetConsole from '../DuetConsole';
import DuetJobStatus from '../DuetJobStatus';
import DuetPrintHistory from '../DuetPrintHistory';
import DuetFileManager from '../DuetFileManager';
import DuetFilamentManager from '../DuetFilamentManager';
import DuetMacros from '../DuetMacros';
import DuetHeightMap from '../DuetHeightMap';
import DuetObjectModelBrowser from '../DuetObjectModelBrowser';
import DuetSettings from '../DuetSettings';
import DuetConfigEditor from '../DuetConfigEditor';
import DuetAnalytics from '../DuetAnalytics';
import DuetNetworkAndFirmware from '../DuetNetworkAndFirmware';
import DuetPlugins from '../DuetPlugins';

export const TABS = [
  { key: 'dashboard' as const, label: 'Dashboard', Icon: LayoutDashboard },
  { key: 'status' as const, label: 'Status', Icon: Activity },
  { key: 'console' as const, label: 'Console', Icon: Terminal },
  { key: 'job' as const, label: 'Job', Icon: Play },
  { key: 'history' as const, label: 'History', Icon: History },
  { key: 'analytics' as const, label: 'Analytics', Icon: TrendingUp },
  { key: 'files' as const, label: 'Files', Icon: FolderOpen },
  { key: 'filaments' as const, label: 'Filaments', Icon: FlaskConical },
  { key: 'macros' as const, label: 'Macros', Icon: FileCode },
  { key: 'heightmap' as const, label: 'Height Map', Icon: Grid3x3 },
  { key: 'model' as const, label: 'Model', Icon: Braces },
  { key: 'config' as const, label: 'Config', Icon: FileCode },
  { key: 'network' as const, label: 'Network', Icon: Router },
  { key: 'plugins' as const, label: 'Plugins', Icon: Plug },
  { key: 'settings' as const, label: 'Settings', Icon: Settings },
];

export type TabKey = (typeof TABS)[number]['key'];

export const TAB_COMPONENTS: Record<TabKey, React.ComponentType> = {
  dashboard: DuetDashboard,
  status: DuetStatus,
  console: DuetConsole,
  job: DuetJobStatus,
  history: DuetPrintHistory,
  analytics: DuetAnalytics,
  files: DuetFileManager,
  filaments: DuetFilamentManager,
  macros: DuetMacros,
  heightmap: DuetHeightMap,
  model: DuetObjectModelBrowser,
  config: DuetConfigEditor,
  network: DuetNetworkAndFirmware,
  plugins: DuetPlugins,
  settings: DuetSettings,
};

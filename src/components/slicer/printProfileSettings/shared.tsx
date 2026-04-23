import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import type { PrintProfile } from '../../../types/slicer';
import type { DetailLevel } from '../../../types/slicer-visibility.types';
import { useSlicerVisibilityStore } from '../../../store/slicerVisibilityStore';
import { SectionDivider } from '../workspace/settings/controls/SettingsFieldControls';

export type SettingsUpdate = (updates: Record<string, unknown>) => void;

export type SectionVisibilityKey =
  | 'quality'
  | 'walls'
  | 'topBottom'
  | 'infill'
  | 'speed'
  | 'travel'
  | 'cooling'
  | 'support'
  | 'adhesion'
  | 'specialModes'
  | 'experimental'
  | 'acceleration'
  | 'meshFixes'
  | 'compensation'
  | 'flow'
  | 'bridging'
  | 'smallFeatures'
  | 'primeTower'
  | 'modifierMeshes';

export type PrintSettingsSectionProps = {
  print: PrintProfile;
  upd: SettingsUpdate;
  isVisible: (section: SectionVisibilityKey) => boolean;
  showHelp: (settingKey: string, label: string) => void;
  machineSourcedFields: Set<string>;
  checkFirmware: (settingKey: string) => string | null;
};

export function Tier({
  min,
  level,
  children,
}: {
  min?: DetailLevel;
  level?: DetailLevel;
  children: ReactNode;
}) {
  const required: DetailLevel = min ?? level ?? 'basic';
  const meets = useSlicerVisibilityStore((s) => s.meetsLevel(required));
  if (!meets) return null;
  return <>{children}</>;
}

export function AdvancedDivider({ label = 'Advanced' }: { label?: string }) {
  return <SectionDivider label={label} icon={<Sparkles size={10} />} />;
}

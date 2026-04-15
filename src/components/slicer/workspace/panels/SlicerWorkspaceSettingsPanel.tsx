import { SlicerSettingsPanel } from '../../SlicerSettingsPanel';

export function SlicerWorkspaceSettingsPanel({
  onEditProfile,
}: {
  onEditProfile: (type: 'printer' | 'material' | 'print') => void;
}) {
  return <SlicerSettingsPanel onEditProfile={onEditProfile} />;
}

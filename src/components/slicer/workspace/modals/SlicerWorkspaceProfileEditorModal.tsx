import { SlicerProfileEditorModal } from '../../SlicerProfileEditorModal';

export function SlicerWorkspaceProfileEditorModal({
  type,
  onClose,
}: {
  type: 'printer' | 'material' | 'print';
  onClose: () => void;
}) {
  return <SlicerProfileEditorModal type={type} onClose={onClose} />;
}

import { useState } from 'react';
import { useSlicerStore } from '../../store/slicerStore';
import { useSlicerVisibilityStore } from '../../store/slicerVisibilityStore';
import type { PrintProfile } from '../../types/slicer';
import { getUnsupportedReason } from '../../utils/firmwareCompatibility';
import { getSettingHelp, type SettingHelp } from '../../utils/settingsHelpContent';
import { SettingsHelpModal } from './workspace/settings/SettingsHelpModal';
import { AccelerationSection, BridgingSection, CompensationSection, FlowSection, MeshFixesSection, ModifierMeshesSection, PrimeTowerSection, SmallFeaturesSection } from './printProfileSettings/advancedSections';
import { QualitySection, TopBottomSection, WallsSection } from './printProfileSettings/fundamentals';
import { CoolingSection, InfillSection, SpeedSection, TravelSection } from './printProfileSettings/processSections';
import { AdhesionSection, ExperimentalSection, SpecialModesSection, SupportSection } from './printProfileSettings/supportSections';

export function SlicerPrintProfileSettings({
  print,
  upd,
}: {
  print: PrintProfile;
  upd: (updates: Record<string, unknown>) => void;
}) {
  const isVisible = useSlicerVisibilityStore((s) => s.isVisible);
  useSlicerVisibilityStore((s) => s.visible);
  const machineSourcedFields = new Set(print.machineSourcedFields ?? []);
  const printer = useSlicerStore((s) => s.getActivePrinterProfile());
  const [helpModal, setHelpModal] = useState<{ title: string; help: SettingHelp } | null>(null);

  const checkFirmware = (settingKey: string): string | null => getUnsupportedReason(settingKey, printer);

  const showHelp = (settingKey: string, label: string) => {
    const help = getSettingHelp(settingKey);
    if (help) setHelpModal({ title: label, help });
  };

  const sectionProps = { print, upd, isVisible, showHelp, machineSourcedFields, checkFirmware };

  return (
    <>
      <QualitySection {...sectionProps} />
      <WallsSection {...sectionProps} />
      <TopBottomSection {...sectionProps} />
      <InfillSection {...sectionProps} />
      <SpeedSection {...sectionProps} />
      <TravelSection {...sectionProps} />
      <CoolingSection {...sectionProps} />
      <SupportSection {...sectionProps} />
      <AdhesionSection {...sectionProps} />
      <SpecialModesSection {...sectionProps} />
      <ExperimentalSection {...sectionProps} />
      <AccelerationSection {...sectionProps} />
      <MeshFixesSection {...sectionProps} />
      <CompensationSection {...sectionProps} />
      <FlowSection {...sectionProps} />
      <BridgingSection {...sectionProps} />
      <SmallFeaturesSection {...sectionProps} />
      <PrimeTowerSection {...sectionProps} />
      <ModifierMeshesSection {...sectionProps} />
      {helpModal && <SettingsHelpModal title={helpModal.title} help={helpModal.help} onClose={() => setHelpModal(null)} />}
    </>
  );
}

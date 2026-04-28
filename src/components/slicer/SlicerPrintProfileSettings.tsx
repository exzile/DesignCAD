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
  searchQuery = '',
}: {
  print: PrintProfile;
  upd: (updates: Record<string, unknown>) => void;
  searchQuery?: string;
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
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const matchesSearch = (terms: string) => (
    normalizedSearch === '' || terms.toLowerCase().includes(normalizedSearch)
  );

  const sections = [
    matchesSearch('quality layer height line width adaptive slicing closing radius mesh fixes')
      ? <QualitySection key="quality" {...sectionProps} />
      : null,
    matchesSearch('walls wall count line width outer inner thin wall seam arachne overhang')
      ? <WallsSection key="walls" {...sectionProps} />
      : null,
    matchesSearch('top bottom skin ironing surface thickness pattern layers')
      ? <TopBottomSection key="topBottom" {...sectionProps} />
      : null,
    matchesSearch('infill density pattern grid gyroid lightning cubic overlap')
      ? <InfillSection key="infill" {...sectionProps} />
      : null,
    matchesSearch('speed print travel first layer outer inner wall support infill acceleration')
      ? <SpeedSection key="speed" {...sectionProps} />
      : null,
    matchesSearch('travel combing retraction retract z hop avoid crossing prime wipe')
      ? <TravelSection key="travel" {...sectionProps} />
      : null,
    matchesSearch('cooling fan min layer time bridge lift head temperature')
      ? <CoolingSection key="cooling" {...sectionProps} />
      : null,
    matchesSearch('support overhang tree organic density interface roof floor tower')
      ? <SupportSection key="support" {...sectionProps} />
      : null,
    matchesSearch('adhesion build plate skirt brim raft prime blob first layer')
      ? <AdhesionSection key="adhesion" {...sectionProps} />
      : null,
    matchesSearch('special modes vase spiralize surface mode sequence mold relative extrusion')
      ? <SpecialModesSection key="specialModes" {...sectionProps} />
      : null,
    matchesSearch('experimental fuzzy skin coasting draft shield overhang scarf seam fluid ooze')
      ? <ExperimentalSection key="experimental" {...sectionProps} />
      : null,
    matchesSearch('acceleration jerk motion speed limits firmware')
      ? <AccelerationSection key="acceleration" {...sectionProps} />
      : null,
    matchesSearch('mesh fixes union remove holes extensive stitching slicing resolution')
      ? <MeshFixesSection key="meshFixes" {...sectionProps} />
      : null,
    matchesSearch('compensation xy hole horizontal expansion elephant foot')
      ? <CompensationSection key="compensation" {...sectionProps} />
      : null,
    matchesSearch('flow material extrusion compensation multiplier prime')
      ? <FlowSection key="flow" {...sectionProps} />
      : null,
    matchesSearch('bridging bridge speed fan flow wall skin infill')
      ? <BridgingSection key="bridging" {...sectionProps} />
      : null,
    matchesSearch('small features small hole min feature area speed')
      ? <SmallFeaturesSection key="smallFeatures" {...sectionProps} />
      : null,
    matchesSearch('prime tower wipe tower multi material')
      ? <PrimeTowerSection key="primeTower" {...sectionProps} />
      : null,
    matchesSearch('modifier meshes per model settings support blocker infill mesh')
      ? <ModifierMeshesSection key="modifierMeshes" {...sectionProps} />
      : null,
  ];
  const hasMatches = sections.some(Boolean);

  return (
    <>
      {hasMatches ? sections : (
        <div className="slicer-workspace-settings-panel__empty-results">
          No settings match "{searchQuery.trim()}".
        </div>
      )}
      {helpModal && <SettingsHelpModal title={helpModal.title} help={helpModal.help} onClose={() => setHelpModal(null)} />}
    </>
  );
}

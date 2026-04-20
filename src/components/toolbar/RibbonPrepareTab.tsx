import {
  Box, AlignCenter, X, MousePointer2,
  Printer, Diamond, Layers, Eye, Download,
} from 'lucide-react';
import { useCADStore } from '../../store/cadStore';
import { useSlicerStore } from '../../store/slicerStore';
import { usePrinterStore } from '../../store/printerStore';
import { NON_BODY_FEATURE_TYPES } from '../slicer/slicerFeatureTypes';
import { RibbonSection } from './FlyoutMenu';
import { ToolButton } from './ToolButton';

// Prepare ribbon — a single flat row of sections. Previously split across
// four sub-tabs (PLATE / PROFILES / SLICE / EXPORT), they now live side by
// side because the full toolset fits comfortably on one row at the default
// ribbon width.
//
// Printer + Material profile pickers live here too (as dropdowns on their
// respective buttons) so users don't have to dive into the settings panel
// just to swap the active profile — the settings panel is now reserved for
// detailed per-print-profile tweaks.

const ICON_LG = 28;
const ICON_SM = 18;

export function RibbonPrepareTab() {
  const setStatusMessage     = useCADStore((s) => s.setStatusMessage);
  const features             = useCADStore((s) => s.features);
  const selectedFeatureId    = useCADStore((s) => s.selectedFeatureId);
  const printerConnected     = usePrinterStore((s) => s.connected);
  const sliceProgress        = useSlicerStore((s) => s.sliceProgress);
  const sliceResult          = useSlicerStore((s) => s.sliceResult);
  const previewMode          = useSlicerStore((s) => s.previewMode);
  const printerProfiles      = useSlicerStore((s) => s.printerProfiles);
  const materialProfiles     = useSlicerStore((s) => s.materialProfiles);
  const activePrinterId      = useSlicerStore((s) => s.activePrinterProfileId);
  const activeMaterialId     = useSlicerStore((s) => s.activeMaterialProfileId);

  const activePrinterName = printerProfiles.find((p) => p.id === activePrinterId)?.name ?? 'Printer';
  const activeMaterialName = materialProfiles.find((m) => m.id === activeMaterialId)?.name ?? 'Material';

  // ── Build plate actions ──────────────────────────────────────────────────
  const addableFeatures = features.filter((f) =>
    !NON_BODY_FEATURE_TYPES.has(f.type) && !f.suppressed,
  );

  const handleAddModel = (id?: string) => {
    const target = (id && addableFeatures.find((f) => f.id === id))
      ?? (selectedFeatureId && addableFeatures.find((f) => f.id === selectedFeatureId))
      ?? addableFeatures[0];
    if (!target) {
      setStatusMessage('No models to add. Create a design first.');
      return;
    }
    useSlicerStore.getState().addToPlate(target.id, target.name, (target as { mesh?: unknown }).mesh);
    setStatusMessage(`Added "${target.name}" to build plate`);
  };

  const isSlicing = sliceProgress.stage === 'preparing'
    || sliceProgress.stage === 'slicing'
    || sliceProgress.stage === 'generating';

  return (
    <>
      <RibbonSection title="BUILD PLATE">
        <ToolButton
          icon={<Box size={ICON_LG} />}
          label="Add Model"
          onClick={() => handleAddModel()}
          disabled={addableFeatures.length === 0}
          dropdown={addableFeatures.length > 0 ? addableFeatures.map((f) => ({
            label: f.name,
            icon: <Box size={12} />,
            onClick: () => handleAddModel(f.id),
          })) : undefined}
          large
          colorClass="icon-blue"
        />
        <div className="ribbon-stack">
          <ToolButton
            icon={<AlignCenter size={ICON_SM} />}
            label="Auto Arrange"
            onClick={() => useSlicerStore.getState().autoArrange()}
            colorClass="icon-blue"
          />
          <ToolButton
            icon={<X size={ICON_SM} />}
            label="Clear Plate"
            onClick={() => useSlicerStore.getState().clearPlate()}
            colorClass="icon-red"
          />
        </div>
      </RibbonSection>

      <RibbonSection title="SELECT">
        <ToolButton icon={<MousePointer2 size={ICON_LG} />} label="Select" tool="select" large colorClass="icon-blue" />
      </RibbonSection>

      {/* Profile pickers — each large button opens the edit modal for that
          profile kind; the dropdown lets you switch the active profile. */}
      <RibbonSection title="PROFILES">
        <ToolButton
          icon={<Printer size={ICON_LG} />}
          label={activePrinterName}
          onClick={() => useSlicerStore.getState().setSettingsPanel('printer')}
          dropdown={printerProfiles.length > 0 ? printerProfiles.map((p) => ({
            label: p.name,
            icon: <Printer size={12} />,
            onClick: () => useSlicerStore.getState().setActivePrinterProfile(p.id),
          })) : undefined}
          large
          colorClass="icon-blue"
        />
        <ToolButton
          icon={<Diamond size={ICON_LG} />}
          label={activeMaterialName}
          onClick={() => useSlicerStore.getState().setSettingsPanel('material')}
          dropdown={materialProfiles.length > 0 ? materialProfiles.map((m) => ({
            label: m.name,
            icon: <Diamond size={12} />,
            onClick: () => useSlicerStore.getState().setActiveMaterialProfile(m.id),
          })) : undefined}
          large
          colorClass="icon-orange"
        />
      </RibbonSection>

      <RibbonSection title="SLICE">
        <ToolButton
          icon={<Layers size={ICON_LG} />}
          label={isSlicing ? `${sliceProgress.percent}%` : 'Slice'}
          onClick={() => useSlicerStore.getState().startSlice()}
          active={isSlicing}
          disabled={isSlicing}
          large
          colorClass="icon-blue"
        />
        {isSlicing && (
          <ToolButton
            icon={<X size={ICON_LG} />}
            label="Cancel"
            onClick={() => useSlicerStore.getState().cancelSlice()}
            large
            colorClass="icon-red"
          />
        )}
        <ToolButton
          icon={<Eye size={ICON_LG} />}
          label="Preview"
          active={previewMode === 'preview'}
          onClick={() => {
            const store = useSlicerStore.getState();
            store.setPreviewMode(store.previewMode === 'preview' ? 'model' : 'preview');
          }}
          large
          disabled={!sliceResult}
          colorClass="icon-green"
        />
      </RibbonSection>

      <RibbonSection title="EXPORT">
        <ToolButton
          icon={<Download size={ICON_LG} />}
          label="Save G-code"
          onClick={() => useSlicerStore.getState().downloadGCode()}
          disabled={!sliceResult}
          large
          colorClass="icon-blue"
        />
        <ToolButton
          icon={<Printer size={ICON_LG} />}
          label="Send to Printer"
          onClick={() => {
            setStatusMessage('Sending G-code to printer…');
            useSlicerStore.getState().sendToPrinter()
              .then(() => setStatusMessage('G-code sent to printer'))
              .catch((err: unknown) => {
                const msg = err instanceof Error ? err.message : String(err);
                setStatusMessage(`Send to printer failed: ${msg}`);
              });
          }}
          disabled={!sliceResult || !printerConnected}
          large
          colorClass="icon-green"
        />
      </RibbonSection>
    </>
  );
}

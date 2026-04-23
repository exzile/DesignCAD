import type { PrinterProfile } from '../../../../../types/slicer';
import { colors } from '../../../../../utils/theme';
import { fieldRow, inputStyle, labelStyle, lockedInputProps, LOCK_TITLE, MachineLockBadge, SectionBody, selectStyle, TabBar } from './shared';

export function PrinterProfileEditor({
  activeTab,
  setActiveTab,
  printer,
  updatePrinterProfile,
}: {
  activeTab: number;
  setActiveTab: (tab: number) => void;
  printer: PrinterProfile;
  updatePrinterProfile: (id: string, updates: Partial<PrinterProfile>) => void;
}) {
  const tabs = ['General', 'Limits', 'G-code'];
  const machineFields = new Set(printer.machineSourcedFields ?? []);
  const locked = (field: string) => machineFields.has(field);
  const label = (field: string, text: React.ReactNode) => (
    <div style={labelStyle}>{text}{locked(field) && <MachineLockBadge />}</div>
  );
  const checkLabel = (field: string, text: React.ReactNode) => (
    <span>{text}{locked(field) && <MachineLockBadge />}</span>
  );

  return (
    <>
      <TabBar tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
      <SectionBody>
        {activeTab === 0 && (
          <>
            <div style={fieldRow}>
              <div style={labelStyle}>Name</div>
              <input style={inputStyle} value={printer.name} onChange={(e) => updatePrinterProfile(printer.id, { name: e.target.value })} />
            </div>
            <div style={fieldRow}>
              {label('buildVolume', 'Build Volume X (mm)')}
              <input type="number" style={inputStyle} value={printer.buildVolume.x} {...lockedInputProps(locked('buildVolume'))}
                onChange={(e) => updatePrinterProfile(printer.id, { buildVolume: { ...printer.buildVolume, x: parseFloat(e.target.value) || 0 } })} />
            </div>
            <div style={fieldRow}>
              {label('buildVolume', 'Build Volume Y (mm)')}
              <input type="number" style={inputStyle} value={printer.buildVolume.y} {...lockedInputProps(locked('buildVolume'))}
                onChange={(e) => updatePrinterProfile(printer.id, { buildVolume: { ...printer.buildVolume, y: parseFloat(e.target.value) || 0 } })} />
            </div>
            <div style={fieldRow}>
              {label('buildVolume', 'Build Volume Z (mm)')}
              <input type="number" style={inputStyle} value={printer.buildVolume.z} {...lockedInputProps(locked('buildVolume'))}
                onChange={(e) => updatePrinterProfile(printer.id, { buildVolume: { ...printer.buildVolume, z: parseFloat(e.target.value) || 0 } })} />
            </div>
            <div style={fieldRow}>
              {label('nozzleDiameter', 'Nozzle Diameter (mm)')}
              <input type="number" style={inputStyle} value={printer.nozzleDiameter} step={0.1} {...lockedInputProps(locked('nozzleDiameter'))}
                onChange={(e) => updatePrinterProfile(printer.id, { nozzleDiameter: parseFloat(e.target.value) || 0.4 })} />
            </div>
            <div style={fieldRow}>
              {label('nozzleCount', 'Nozzle Count')}
              <input type="number" style={inputStyle} value={printer.nozzleCount} min={1} {...lockedInputProps(locked('nozzleCount'))}
                onChange={(e) => updatePrinterProfile(printer.id, { nozzleCount: parseInt(e.target.value) || 1 })} />
            </div>
            <div style={fieldRow}>
              {label('filamentDiameter', 'Filament Diameter (mm)')}
              <select
                style={{ ...selectStyle, ...(locked('filamentDiameter') ? { opacity: 0.55, cursor: 'not-allowed' } : {}) }}
                value={printer.filamentDiameter}
                disabled={locked('filamentDiameter')}
                title={locked('filamentDiameter') ? LOCK_TITLE : undefined}
                onChange={(e) => { if (!locked('filamentDiameter')) updatePrinterProfile(printer.id, { filamentDiameter: parseFloat(e.target.value) }); }}
              >
                <option value={1.75}>1.75</option>
                <option value={2.85}>2.85</option>
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.text, fontSize: 12, marginBottom: 8, cursor: locked('hasHeatedBed') ? 'not-allowed' : 'pointer', opacity: locked('hasHeatedBed') ? 0.55 : 1 }} title={locked('hasHeatedBed') ? LOCK_TITLE : undefined}>
              <input type="checkbox" checked={printer.hasHeatedBed} disabled={locked('hasHeatedBed')}
                onChange={(e) => { if (!locked('hasHeatedBed')) updatePrinterProfile(printer.id, { hasHeatedBed: e.target.checked }); }}
                style={{ accentColor: colors.accent }} />
              {checkLabel('hasHeatedBed', 'Heated Bed')}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.text, fontSize: 12, marginBottom: 8, cursor: locked('hasHeatedChamber') ? 'not-allowed' : 'pointer', opacity: locked('hasHeatedChamber') ? 0.55 : 1 }} title={locked('hasHeatedChamber') ? LOCK_TITLE : undefined}>
              <input type="checkbox" checked={printer.hasHeatedChamber} disabled={locked('hasHeatedChamber')}
                onChange={(e) => { if (!locked('hasHeatedChamber')) updatePrinterProfile(printer.id, { hasHeatedChamber: e.target.checked }); }}
                style={{ accentColor: colors.accent }} />
              {checkLabel('hasHeatedChamber', 'Heated Chamber')}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.text, fontSize: 12, marginBottom: 8, cursor: locked('originCenter') ? 'not-allowed' : 'pointer', opacity: locked('originCenter') ? 0.55 : 1 }} title={locked('originCenter') ? LOCK_TITLE : undefined}>
              <input type="checkbox" checked={printer.originCenter} disabled={locked('originCenter')}
                onChange={(e) => { if (!locked('originCenter')) updatePrinterProfile(printer.id, { originCenter: e.target.checked }); }}
                style={{ accentColor: colors.accent }} />
              {checkLabel('originCenter', 'Origin Center')}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.text, fontSize: 12, marginBottom: 8, cursor: locked('firmwareRetraction') ? 'not-allowed' : 'pointer', opacity: locked('firmwareRetraction') ? 0.55 : 1 }} title={locked('firmwareRetraction') ? LOCK_TITLE : undefined}>
              <input type="checkbox" checked={printer.firmwareRetraction ?? false} disabled={locked('firmwareRetraction')}
                onChange={(e) => { if (!locked('firmwareRetraction')) updatePrinterProfile(printer.id, { firmwareRetraction: e.target.checked }); }}
                style={{ accentColor: colors.accent }} />
              {checkLabel('firmwareRetraction', 'Firmware Retraction (G10/G11)')}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.text, fontSize: 12, marginBottom: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={printer.waitForBuildPlate ?? true} onChange={(e) => updatePrinterProfile(printer.id, { waitForBuildPlate: e.target.checked })} style={{ accentColor: colors.accent }} />
              Wait for Build Plate (M190 blocking)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.text, fontSize: 12, marginBottom: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={printer.waitForNozzle ?? true} onChange={(e) => updatePrinterProfile(printer.id, { waitForNozzle: e.target.checked })} style={{ accentColor: colors.accent }} />
              Wait for Nozzle (M109 blocking)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.text, fontSize: 12, marginBottom: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={printer.scaleFanSpeedTo01 ?? false} onChange={(e) => updatePrinterProfile(printer.id, { scaleFanSpeedTo01: e.target.checked })} style={{ accentColor: colors.accent }} />
              Scale Fan Speed to 0-1 (Klipper)
            </label>
            <div style={fieldRow}>
              {label('gcodeFlavorType', 'G-code Flavor')}
              <select
                style={{ ...selectStyle, ...(locked('gcodeFlavorType') ? { opacity: 0.55, cursor: 'not-allowed' } : {}) }}
                value={printer.gcodeFlavorType}
                disabled={locked('gcodeFlavorType')}
                title={locked('gcodeFlavorType') ? LOCK_TITLE : undefined}
                onChange={(e) => { if (!locked('gcodeFlavorType')) updatePrinterProfile(printer.id, { gcodeFlavorType: e.target.value as PrinterProfile['gcodeFlavorType'] }); }}
              >
                <option value="reprap">RepRap</option>
                <option value="marlin">Marlin</option>
                <option value="klipper">Klipper</option>
                <option value="duet">Duet</option>
              </select>
            </div>
          </>
        )}
        {activeTab === 1 && (
          <>
            <div style={fieldRow}>
              {label('maxNozzleTemp', <>Max Nozzle Temp (&deg;C)</>)}
              <input type="number" style={inputStyle} value={printer.maxNozzleTemp} {...lockedInputProps(locked('maxNozzleTemp'))}
                onChange={(e) => updatePrinterProfile(printer.id, { maxNozzleTemp: parseInt(e.target.value) || 260 })} />
            </div>
            <div style={fieldRow}>
              {label('maxBedTemp', <>Max Bed Temp (&deg;C)</>)}
              <input type="number" style={inputStyle} value={printer.maxBedTemp} {...lockedInputProps(locked('maxBedTemp'))}
                onChange={(e) => updatePrinterProfile(printer.id, { maxBedTemp: parseInt(e.target.value) || 110 })} />
            </div>
            <div style={fieldRow}>
              <div style={labelStyle}>Max Speed (mm/s)</div>
              <input type="number" style={inputStyle} value={printer.maxSpeed} onChange={(e) => updatePrinterProfile(printer.id, { maxSpeed: parseInt(e.target.value) || 200 })} />
            </div>
            <div style={fieldRow}>
              <div style={labelStyle}>Max Acceleration (mm/s&sup2;)</div>
              <input type="number" style={inputStyle} value={printer.maxAcceleration} onChange={(e) => updatePrinterProfile(printer.id, { maxAcceleration: parseInt(e.target.value) || 2000 })} />
            </div>
            <div style={{ borderTop: `1px solid ${colors.panelBorder}`, margin: '8px 0' }} />
            <div style={{ color: colors.textDim, fontSize: 11, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Per-Axis Limits (M203 / M201)</div>
            {(['X', 'Y', 'Z', 'E'] as const).map((axis) => (
              <div key={`speed-${axis}`} style={fieldRow}>
                {label(`maxSpeed${axis}`, `Max Speed ${axis} (mm/s)`)}
                <input type="number" style={inputStyle} value={printer[`maxSpeed${axis}` as keyof typeof printer] as number ?? ''} placeholder="firmware default"
                  {...lockedInputProps(locked(`maxSpeed${axis}`))}
                  onChange={(e) => updatePrinterProfile(printer.id, { [`maxSpeed${axis}`]: e.target.value === '' ? undefined : parseInt(e.target.value) } as Partial<PrinterProfile>)} />
              </div>
            ))}
            {(['X', 'Y', 'Z', 'E'] as const).map((axis) => (
              <div key={`accel-${axis}`} style={fieldRow}>
                {label(`maxAccel${axis}`, `Max Accel ${axis} (mm/s²)`)}
                <input type="number" style={inputStyle} value={printer[`maxAccel${axis}` as keyof typeof printer] as number ?? ''} placeholder="firmware default"
                  {...lockedInputProps(locked(`maxAccel${axis}`))}
                  onChange={(e) => updatePrinterProfile(printer.id, { [`maxAccel${axis}`]: e.target.value === '' ? undefined : parseInt(e.target.value) } as Partial<PrinterProfile>)} />
              </div>
            ))}
            <div style={fieldRow}>
              {label('defaultAcceleration', 'Default Acceleration (mm/s²)')}
              <input type="number" style={inputStyle} value={printer.defaultAcceleration ?? ''} placeholder="firmware default"
                {...lockedInputProps(locked('defaultAcceleration'))}
                onChange={(e) => updatePrinterProfile(printer.id, { defaultAcceleration: e.target.value === '' ? undefined : parseInt(e.target.value) })} />
            </div>
            <div style={fieldRow}>
              {label('defaultJerk', 'Default Jerk (mm/s)')}
              <input type="number" style={inputStyle} value={printer.defaultJerk ?? ''} placeholder="firmware default"
                {...lockedInputProps(locked('defaultJerk'))}
                onChange={(e) => updatePrinterProfile(printer.id, { defaultJerk: e.target.value === '' ? undefined : parseFloat(e.target.value) })} />
            </div>
            <div style={{ borderTop: `1px solid ${colors.panelBorder}`, margin: '8px 0' }} />
            <div style={fieldRow}>
              <div style={labelStyle}>Print Time Estimation Factor</div>
              <input type="number" style={inputStyle} value={printer.printTimeEstimationFactor ?? 1.0} step={0.05} min={0.1} max={5}
                onChange={(e) => updatePrinterProfile(printer.id, { printTimeEstimationFactor: parseFloat(e.target.value) || 1.0 })} />
            </div>
          </>
        )}
        {activeTab === 2 && (
          <>
            <div style={fieldRow}>
              <div style={labelStyle}>Start G-code</div>
              <textarea style={{ ...inputStyle, height: 180, fontFamily: 'monospace', fontSize: 11, resize: 'vertical' }} value={printer.startGCode}
                onChange={(e) => updatePrinterProfile(printer.id, { startGCode: e.target.value })} />
            </div>
            <div style={fieldRow}>
              <div style={labelStyle}>End G-code</div>
              <textarea style={{ ...inputStyle, height: 180, fontFamily: 'monospace', fontSize: 11, resize: 'vertical' }} value={printer.endGCode}
                onChange={(e) => updatePrinterProfile(printer.id, { endGCode: e.target.value })} />
            </div>
          </>
        )}
      </SectionBody>
    </>
  );
}

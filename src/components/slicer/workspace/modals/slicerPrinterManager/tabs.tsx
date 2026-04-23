import type { PrinterProfile } from '../../../../../types/slicer';
import { col, row, Lbl, Lbl2, NumIn, SelIn, Chk, GCode, ColHead } from './shared';

export function PrinterTab({ p, upd }: { p: PrinterProfile; upd: (u: Partial<PrinterProfile>) => void }) {
  const ms = new Set(p.machineSourcedFields ?? []);
  const locked = (field: string) => ms.has(field);
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 32 }}>
        <div style={col}>
          <ColHead>Printer Settings</ColHead>
          <div style={row}><Lbl2 locked={locked('buildVolume')}>X (Width)</Lbl2><NumIn value={p.buildVolume.x} onChange={(v) => upd({ buildVolume: { ...p.buildVolume, x: v } })} suffix="mm" min={1} locked={locked('buildVolume')} /></div>
          <div style={row}><Lbl2 locked={locked('buildVolume')}>Y (Depth)</Lbl2><NumIn value={p.buildVolume.y} onChange={(v) => upd({ buildVolume: { ...p.buildVolume, y: v } })} suffix="mm" min={1} locked={locked('buildVolume')} /></div>
          <div style={row}><Lbl2 locked={locked('buildVolume')}>Z (Height)</Lbl2><NumIn value={p.buildVolume.z} onChange={(v) => upd({ buildVolume: { ...p.buildVolume, z: v } })} suffix="mm" min={1} locked={locked('buildVolume')} /></div>
          <div style={row}>
            <Lbl2 locked={locked('buildPlateShape')}>Build plate shape</Lbl2>
            <SelIn
              value={p.buildPlateShape ?? 'rectangular'}
              onChange={(v) => upd({ buildPlateShape: v })}
              options={[{ value: 'rectangular', label: 'Rectangular' }, { value: 'elliptic', label: 'Elliptic' }]}
              width={150}
              locked={locked('buildPlateShape')}
            />
          </div>
          <Chk checked={p.originCenter} onChange={(v) => upd({ originCenter: v })} label="Origin at center" locked={locked('originCenter')} />
          <Chk checked={p.hasHeatedBed} onChange={(v) => upd({ hasHeatedBed: v })} label="Heated bed" locked={locked('hasHeatedBed')} />
          <Chk checked={p.hasHeatedChamber} onChange={(v) => upd({ hasHeatedChamber: v })} label="Heated build volume" locked={locked('hasHeatedChamber')} />
          <div style={{ ...row, marginTop: 4 }}>
            <Lbl2 locked={locked('gcodeFlavorType')}>G-code flavor</Lbl2>
            <SelIn
              value={p.gcodeFlavorType}
              onChange={(v) => upd({ gcodeFlavorType: v })}
              options={[
                { value: 'marlin', label: 'Marlin' },
                { value: 'reprap', label: 'RepRap (Sprinter / Repetier)' },
                { value: 'klipper', label: 'Klipper' },
                { value: 'duet', label: 'Duet (RepRap Firmware)' },
              ]}
              width={200}
              locked={locked('gcodeFlavorType')}
            />
          </div>
          <div style={row}>
            <Lbl>Print Time Estimation Factor</Lbl>
            <NumIn value={Math.round((p.printTimeEstimationFactor ?? 1.0) * 100)} onChange={(v) => upd({ printTimeEstimationFactor: v / 100 })} suffix="%" min={10} max={500} />
          </div>
        </div>

        <div style={col}>
          <ColHead>Printhead Settings</ColHead>
          <div style={row}><Lbl>X min</Lbl><NumIn value={p.printheadMinX ?? -20} onChange={(v) => upd({ printheadMinX: v })} suffix="mm" /></div>
          <div style={row}><Lbl>Y min ('-' towards back)</Lbl><NumIn value={p.printheadMinY ?? -10} onChange={(v) => upd({ printheadMinY: v })} suffix="mm" /></div>
          <div style={row}><Lbl>X max</Lbl><NumIn value={p.printheadMaxX ?? 10} onChange={(v) => upd({ printheadMaxX: v })} suffix="mm" /></div>
          <div style={row}><Lbl>Y max ('+' towards front)</Lbl><NumIn value={p.printheadMaxY ?? 10} onChange={(v) => upd({ printheadMaxY: v })} suffix="mm" /></div>
          <div style={row}><Lbl>Gantry Height</Lbl><NumIn value={p.gantryHeight ?? p.buildVolume.z} onChange={(v) => upd({ gantryHeight: v })} suffix="mm" min={0} /></div>
          <div style={row}>
            <Lbl2 locked={locked('nozzleCount')}>Number of Extruders</Lbl2>
            <SelIn
              value={String(p.nozzleCount) as '1'|'2'|'3'|'4'}
              onChange={(v) => upd({ nozzleCount: parseInt(v) })}
              options={(['1', '2', '3', '4'] as const).map((n) => ({ value: n, label: n }))}
              width={80}
              locked={locked('nozzleCount')}
            />
          </div>
          <Chk checked={p.applyExtruderOffsets ?? true} onChange={(v) => upd({ applyExtruderOffsets: v })} label="Apply Extruder offsets to GCode" />
          <Chk checked={p.startGCodeMustBeFirst ?? false} onChange={(v) => upd({ startGCodeMustBeFirst: v })} label="Start GCode must be first" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 200 }}>
        <GCode label="Start G-code" value={p.startGCode} onChange={(v) => upd({ startGCode: v })} />
        <GCode label="End G-code" value={p.endGCode} onChange={(v) => upd({ endGCode: v })} />
      </div>
    </div>
  );
}

export function ExtruderTab({ p, upd }: { p: PrinterProfile; upd: (u: Partial<PrinterProfile>) => void }) {
  const ms = new Set(p.machineSourcedFields ?? []);
  const locked = (field: string) => ms.has(field);
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 32 }}>
        <div style={col}>
          <ColHead>Nozzle Settings</ColHead>
          <div style={row}><Lbl2 locked={locked('nozzleDiameter')}>Nozzle size</Lbl2><NumIn value={p.nozzleDiameter} onChange={(v) => upd({ nozzleDiameter: v })} step={0.1} min={0.1} max={2} suffix="mm" locked={locked('nozzleDiameter')} /></div>
          <div style={row}>
            <Lbl2 locked={locked('filamentDiameter')}>Compatible material diameter</Lbl2>
            <SelIn
              value={p.filamentDiameter === 2.85 ? '2.85' : '1.75'}
              onChange={(v) => upd({ filamentDiameter: parseFloat(v) })}
              options={[{ value: '1.75', label: '1.75 mm' }, { value: '2.85', label: '2.85 mm' }]}
              width={110}
              locked={locked('filamentDiameter')}
            />
          </div>
          <div style={row}><Lbl2 locked={locked('extruderOffsetX')}>Nozzle offset X</Lbl2><NumIn value={p.extruderOffsetX ?? 0} onChange={(v) => upd({ extruderOffsetX: v })} suffix="mm" locked={locked('extruderOffsetX')} /></div>
          <div style={row}><Lbl2 locked={locked('extruderOffsetY')}>Nozzle offset Y</Lbl2><NumIn value={p.extruderOffsetY ?? 0} onChange={(v) => upd({ extruderOffsetY: v })} suffix="mm" locked={locked('extruderOffsetY')} /></div>
          <div style={row}><Lbl2 locked={locked('coolingFanNumber')}>Cooling Fan Number</Lbl2><NumIn value={p.coolingFanNumber ?? 0} onChange={(v) => upd({ coolingFanNumber: Math.max(0, Math.round(v)) })} min={0} max={8} width={60} locked={locked('coolingFanNumber')} /></div>
        </div>

        <div style={col}>
          <ColHead>&nbsp;</ColHead>
          <div style={row}><Lbl>Extruder Change duration</Lbl><NumIn value={p.extruderChangeDuration ?? 0} onChange={(v) => upd({ extruderChangeDuration: v })} step={0.1} min={0} suffix="s" /></div>
          <div style={row}><Lbl>Extruder Start G-code duration</Lbl><NumIn value={p.extruderStartGCodeDuration ?? 0} onChange={(v) => upd({ extruderStartGCodeDuration: v })} step={0.1} min={0} suffix="s" /></div>
          <div style={row}><Lbl>Extruder End G-code duration</Lbl><NumIn value={p.extruderEndGCodeDuration ?? 0} onChange={(v) => upd({ extruderEndGCodeDuration: v })} step={0.1} min={0} suffix="s" /></div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flex: 1 }}>
        <div style={{ ...col, gap: 12 }}>
          <GCode label="Extruder Prestart G-code" value={p.extruderPrestartGCode ?? ''} onChange={(v) => upd({ extruderPrestartGCode: v })} />
          <GCode label="Extruder Start G-code" value={p.extruderStartGCode ?? ''} onChange={(v) => upd({ extruderStartGCode: v })} />
        </div>
        <div style={{ ...col, gap: 12 }}>
          <GCode label="Extruder End G-code" value={p.extruderEndGCode ?? ''} onChange={(v) => upd({ extruderEndGCode: v })} />
        </div>
      </div>
    </div>
  );
}

import { Cpu } from 'lucide-react';
import { clamp, parseIntOr, parseNumberOr } from '../helpers/numberParsing';
import './SettingsFieldControls.css';

// Machine-sourced fields come from the printer's config.g (RRF) or equivalent.
// We still show the machine badge (Cpu icon) so the user recognises the source,
// and disable the input so edits only happen on the board + a resync.
const LOCK_TOOLTIP = 'Value synced from the printer. Edit on the board (config.g) and use "Sync from Duet" in the Printer Manager.';

function MachineLock() {
  return (
    <span className="slicer-settings-field__machine-lock" title={LOCK_TOOLTIP}>
      <Cpu size={10} />
    </span>
  );
}

export function Num({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  unit,
  machineSourced,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  machineSourced?: boolean;
}) {
  return (
    <div className={`slicer-settings-field${machineSourced ? ' slicer-settings-field--locked' : ''}`} title={machineSourced ? LOCK_TOOLTIP : undefined}>
      <div className="slicer-settings-field__label">{label}{machineSourced && <MachineLock />}</div>
      <div className="slicer-settings-field__input-wrap">
        <input
          type="number"
          className="slicer-settings-field__input"
          value={value}
          step={step}
          min={min}
          max={max}
          disabled={machineSourced}
          readOnly={machineSourced}
          onChange={(e) => { if (machineSourced) return; onChange(clamp(parseNumberOr(e.target.value, min), min, max)); }}
        />
        <span className="slicer-settings-field__unit">{unit ?? ''}</span>
      </div>
    </div>
  );
}

export function Check({ label, value, onChange, machineSourced }: { label: string; value: boolean; onChange: (v: boolean) => void; machineSourced?: boolean }) {
  return (
    <label className={`slicer-settings-field__check${machineSourced ? ' slicer-settings-field__check--locked' : ''}`} title={machineSourced ? LOCK_TOOLTIP : undefined}>
      <input className="slicer-settings-field__check-input" type="checkbox" checked={value} disabled={machineSourced} onChange={(e) => { if (machineSourced) return; onChange(e.target.checked); }} />
      {label}{machineSourced && <MachineLock />}
    </label>
  );
}

export function Sel<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="slicer-settings-field">
      <div className="slicer-settings-field__label">{label}</div>
      <select className="slicer-settings-field__select" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function Density({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="slicer-settings-field">
      <div className="slicer-settings-field__label">Density</div>
      <div className="slicer-settings-field__density-row">
        <input
          className="slicer-settings-field__range"
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(clamp(parseIntOr(e.target.value, 0), 0, 100))}
        />
        <input
          type="number"
          className="slicer-settings-field__input slicer-settings-field__input--density"
          value={value}
          min={0}
          max={100}
          onChange={(e) => onChange(clamp(parseIntOr(e.target.value, 0), 0, 100))}
        />
        <span className="slicer-settings-field__unit">%</span>
      </div>
    </div>
  );
}

export function SectionDivider({ label }: { label: string }) {
  return <div className="slicer-settings-field__divider">{label}</div>;
}

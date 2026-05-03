import { useState } from 'react';
import { Droplet, Edit3, Plus, Star, Trash2 } from 'lucide-react';
import type { DuetPrefs, FilamentMaterial, FilamentProfile } from '../../../utils/duetPrefs';
import { SettingRow } from './common';

const MATERIAL_OPTIONS: FilamentMaterial[] = ['PLA', 'PETG', 'ABS', 'TPU', 'PC', 'Nylon', 'ASA', 'Other'];

const MATERIAL_DEFAULTS: Record<FilamentMaterial, { nozzle: number; bed: number; chamber: number; fan: number; retract: number }> = {
  PLA:    { nozzle: 210, bed: 60,  chamber: 0,  fan: 100, retract: 0.8 },
  PETG:   { nozzle: 235, bed: 75,  chamber: 0,  fan: 50,  retract: 1.2 },
  ABS:    { nozzle: 245, bed: 100, chamber: 45, fan: 20,  retract: 1.0 },
  TPU:    { nozzle: 225, bed: 50,  chamber: 0,  fan: 60,  retract: 0.4 },
  PC:     { nozzle: 280, bed: 110, chamber: 60, fan: 0,   retract: 1.0 },
  Nylon:  { nozzle: 260, bed: 90,  chamber: 50, fan: 0,   retract: 1.0 },
  ASA:    { nozzle: 250, bed: 105, chamber: 45, fan: 30,  retract: 1.0 },
  Other:  { nozzle: 200, bed: 60,  chamber: 0,  fan: 50,  retract: 1.0 },
};

function genId(): string {
  return `fil-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function blankProfile(): FilamentProfile {
  const d = MATERIAL_DEFAULTS.PLA;
  return {
    id: genId(),
    name: 'New Filament',
    material: 'PLA',
    color: '#00aa88',
    nozzleTemp: d.nozzle,
    bedTemp: d.bed,
    chamberTemp: d.chamber,
    fanSpeedPercent: d.fan,
    retractionMm: d.retract,
    retractionSpeedMmPerSec: 35,
    flowPercent: 100,
    notes: '',
  };
}

export function FilamentsSection({
  patchPrefs,
  prefs,
}: {
  patchPrefs: (patch: Partial<DuetPrefs>) => void;
  prefs: DuetPrefs;
}) {
  const profiles = prefs.filamentProfiles ?? [];
  const defaultId = prefs.defaultFilamentProfileId ?? '';
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = profiles.find((p) => p.id === editingId) ?? null;

  const writeProfiles = (next: FilamentProfile[], nextDefault?: string) => {
    patchPrefs({
      filamentProfiles: next,
      defaultFilamentProfileId: nextDefault ?? defaultId,
    });
  };

  const addProfile = () => {
    const fresh = blankProfile();
    writeProfiles([...profiles, fresh], profiles.length === 0 ? fresh.id : defaultId);
    setEditingId(fresh.id);
  };

  const deleteProfile = (id: string) => {
    const next = profiles.filter((p) => p.id !== id);
    const nextDefault = id === defaultId ? (next[0]?.id ?? '') : defaultId;
    writeProfiles(next, nextDefault);
    if (editingId === id) setEditingId(null);
  };

  const updateProfile = (id: string, patch: Partial<FilamentProfile>) => {
    writeProfiles(profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const applyMaterialDefaults = (id: string, material: FilamentMaterial) => {
    const d = MATERIAL_DEFAULTS[material];
    updateProfile(id, {
      material,
      nozzleTemp: d.nozzle,
      bedTemp: d.bed,
      chamberTemp: d.chamber,
      fanSpeedPercent: d.fan,
      retractionMm: d.retract,
    });
  };

  return (
    <>
      <div className="duet-settings__page-title">Filaments</div>

      <div className="duet-settings__banner duet-settings__banner--info">
        <Droplet size={16} /> Filament profiles store the temperature, fan, and retraction
        defaults you reach for most often. The starred profile loads by default
        when changing filament.
      </div>

      {profiles.length === 0 && (
        <div className="duet-settings__empty">No filament profiles yet. Add one to get started.</div>
      )}

      <div className="duet-settings__filament-grid">
        {profiles.map((p) => {
          const isDefault = p.id === defaultId;
          return (
            <div key={p.id} className={`duet-settings__filament-card${isDefault ? ' is-default' : ''}`}>
              <div
                className="duet-settings__filament-swatch"
                style={{ background: p.color }}
                aria-hidden="true"
              />
              <div className="duet-settings__filament-body">
                <div className="duet-settings__filament-head">
                  <span className="duet-settings__filament-name">{p.name}</span>
                  <span className="duet-settings__filament-material">{p.material}</span>
                </div>
                <div className="duet-settings__filament-stats">
                  <span>Nozzle <strong>{p.nozzleTemp}°</strong></span>
                  <span>Bed <strong>{p.bedTemp}°</strong></span>
                  {p.chamberTemp > 0 && <span>Chamber <strong>{p.chamberTemp}°</strong></span>}
                  <span>Fan <strong>{p.fanSpeedPercent}%</strong></span>
                </div>
              </div>
              <div className="duet-settings__filament-actions">
                <button
                  className={`duet-settings__icon-btn${isDefault ? ' is-active' : ''}`}
                  onClick={() => writeProfiles(profiles, p.id)}
                  title={isDefault ? 'Default profile' : 'Set as default'}
                  aria-label={isDefault ? 'Default profile' : 'Set as default'}
                >
                  <Star size={14} fill={isDefault ? 'currentColor' : 'none'} />
                </button>
                <button
                  className="duet-settings__icon-btn"
                  onClick={() => setEditingId(p.id === editingId ? null : p.id)}
                  title="Edit"
                  aria-label="Edit profile"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  className="duet-settings__icon-btn duet-settings__icon-btn--danger"
                  onClick={() => deleteProfile(p.id)}
                  title="Delete"
                  aria-label="Delete profile"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="duet-settings__btn-row">
        <button className="duet-settings__btn duet-settings__btn--primary" onClick={addProfile}>
          <Plus size={14} /> Add Filament Profile
        </button>
      </div>

      {editing && (
        <div className="duet-settings__section">
          <div className="duet-settings__section-title">Edit · {editing.name}</div>

          <SettingRow
            label="Name"
            control={
              <input
                className="duet-settings__input"
                type="text"
                value={editing.name}
                onChange={(e) => updateProfile(editing.id, { name: e.target.value })}
              />
            }
          />

          <SettingRow
            label="Material"
            hint="Picking a material seeds typical temperature, fan, and retraction defaults."
            control={
              <select
                className="duet-settings__select"
                value={editing.material}
                onChange={(e) => applyMaterialDefaults(editing.id, e.target.value as FilamentMaterial)}
              >
                {MATERIAL_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            }
          />

          <SettingRow
            label="Color"
            hint="Used as a swatch on the dashboard so you can tell loaded filaments apart."
            control={
              <input
                type="color"
                className="duet-settings__color-input"
                value={editing.color}
                onChange={(e) => updateProfile(editing.id, { color: e.target.value })}
                aria-label="Filament color"
              />
            }
          />

          <SettingRow
            label="Nozzle Temperature (°C)"
            control={
              <input
                className="duet-settings__input" type="number" min={150} max={500} step={5}
                value={editing.nozzleTemp}
                onChange={(e) => updateProfile(editing.id, { nozzleTemp: Number(e.target.value) })}
              />
            }
          />
          <SettingRow
            label="Bed Temperature (°C)"
            control={
              <input
                className="duet-settings__input" type="number" min={0} max={200} step={5}
                value={editing.bedTemp}
                onChange={(e) => updateProfile(editing.id, { bedTemp: Number(e.target.value) })}
              />
            }
          />
          <SettingRow
            label="Chamber Temperature (°C)"
            hint="Leave at 0 if your printer has no chamber heater."
            control={
              <input
                className="duet-settings__input" type="number" min={0} max={120} step={5}
                value={editing.chamberTemp}
                onChange={(e) => updateProfile(editing.id, { chamberTemp: Number(e.target.value) })}
              />
            }
          />
          <SettingRow
            label="Fan Speed (%)"
            control={
              <input
                className="duet-settings__input" type="number" min={0} max={100} step={5}
                value={editing.fanSpeedPercent}
                onChange={(e) => updateProfile(editing.id, { fanSpeedPercent: Number(e.target.value) })}
              />
            }
          />
          <SettingRow
            label="Retraction (mm)"
            control={
              <input
                className="duet-settings__input" type="number" min={0} max={10} step={0.1}
                value={editing.retractionMm}
                onChange={(e) => updateProfile(editing.id, { retractionMm: Number(e.target.value) })}
              />
            }
          />
          <SettingRow
            label="Retraction Speed (mm/s)"
            control={
              <input
                className="duet-settings__input" type="number" min={1} max={120} step={1}
                value={editing.retractionSpeedMmPerSec}
                onChange={(e) => updateProfile(editing.id, { retractionSpeedMmPerSec: Number(e.target.value) })}
              />
            }
          />
          <SettingRow
            label="Flow (%)"
            hint="Multiplier applied to extruder moves. 100% is nominal."
            control={
              <input
                className="duet-settings__input" type="number" min={50} max={150} step={1}
                value={editing.flowPercent}
                onChange={(e) => updateProfile(editing.id, { flowPercent: Number(e.target.value) })}
              />
            }
          />
          <SettingRow
            label="Notes"
            control={
              <textarea
                className="duet-settings__input"
                rows={3}
                value={editing.notes}
                onChange={(e) => updateProfile(editing.id, { notes: e.target.value })}
                placeholder="Anything you want to remember about this spool — drying time, brand, etc."
              />
            }
          />
        </div>
      )}
    </>
  );
}

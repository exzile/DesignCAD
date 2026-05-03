import { ShieldAlert } from 'lucide-react';
import type { DuetPrefs, SafetyLimits } from '../../../utils/duetPrefs';
import { SettingRow, ToggleRow } from './common';

export function SafetyLimitsSection({
  patchPrefs,
  prefs,
}: {
  patchPrefs: (patch: Partial<DuetPrefs>) => void;
  prefs: DuetPrefs;
}) {
  const limits = prefs.safetyLimits;

  const patchLimits = (patch: Partial<SafetyLimits>) => {
    patchPrefs({ safetyLimits: { ...limits, ...patch } });
  };

  return (
    <div className="duet-settings__section">
      <div className="duet-settings__section-title">
        <ShieldAlert size={14} style={{ marginRight: 4 }} /> Safety Limits
      </div>

      <SettingRow
        label="Max Nozzle Temperature"
        hint="Setpoints above this value are blocked. Most hotends top out at 280-300°C."
        control={
          <input
            className="duet-settings__input"
            type="number"
            min={150} max={500} step={5}
            value={limits.maxNozzleTemp}
            onChange={(e) => patchLimits({ maxNozzleTemp: Number(e.target.value) })}
          />
        }
      />

      <SettingRow
        label="Max Bed Temperature"
        hint="Setpoints above this value are blocked. Aluminium beds with PEI usually cap at 110-120°C."
        control={
          <input
            className="duet-settings__input"
            type="number"
            min={0} max={200} step={5}
            value={limits.maxBedTemp}
            onChange={(e) => patchLimits({ maxBedTemp: Number(e.target.value) })}
          />
        }
      />

      <SettingRow
        label="Max Chamber Temperature"
        hint="Only used if the printer reports a chamber heater. Typical safe ceiling is 60-65°C."
        control={
          <input
            className="duet-settings__input"
            type="number"
            min={0} max={120} step={5}
            value={limits.maxChamberTemp}
            onChange={(e) => patchLimits({ maxChamberTemp: Number(e.target.value) })}
          />
        }
      />

      <ToggleRow
        id="safety-warn-high"
        checked={limits.warnOnHighTemp}
        onChange={(v) => patchLimits({ warnOnHighTemp: v })}
        label="Warn before high-temperature setpoints"
        hint="Show a confirm dialog when sending a hotend setpoint above the threshold below."
      />

      {limits.warnOnHighTemp && (
        <SettingRow
          label="High-temp Warn Threshold"
          hint="Setpoints at or above this trigger the high-temp confirm prompt."
          control={
            <input
              className="duet-settings__input"
              type="number"
              min={150} max={500} step={5}
              value={limits.highTempWarnThreshold}
              onChange={(e) => patchLimits({ highTempWarnThreshold: Number(e.target.value) })}
            />
          }
        />
      )}

      <ToggleRow
        id="safety-runaway"
        checked={limits.thermalRunawayPrompt}
        onChange={(v) => patchLimits({ thermalRunawayPrompt: v })}
        label="Surface thermal-runaway alerts"
        hint="Pop a high-priority toast when the firmware reports thermal runaway / heater fault."
      />

      <ToggleRow
        id="safety-confirm-estop"
        checked={limits.confirmEmergencyStop}
        onChange={(v) => patchLimits({ confirmEmergencyStop: v })}
        label="Confirm emergency stop"
        hint="Require a confirmation dialog before sending M112 / E-stop. Useful to avoid accidental clicks."
      />
    </div>
  );
}

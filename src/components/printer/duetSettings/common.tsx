import React from 'react';

export function SettingRow({
  label,
  hint,
  control,
}: {
  label: string;
  hint?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="duet-settings__form-group">
      <label className="duet-settings__label">{label}</label>
      {control}
      {hint && <span className="duet-settings__hint">{hint}</span>}
    </div>
  );
}

export function ToggleRow({
  id,
  checked,
  onChange,
  label,
  hint,
}: {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="duet-settings__form-group">
      <div className="duet-settings__checkbox-row">
        <input
          type="checkbox"
          id={id}
          className="duet-settings__checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <label htmlFor={id} className="duet-settings__checkbox-label">
          {label}
        </label>
      </div>
      {hint && <span className="duet-settings__hint duet-settings__hint--indented">{hint}</span>}
    </div>
  );
}

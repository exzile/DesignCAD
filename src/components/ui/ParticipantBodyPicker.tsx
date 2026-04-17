/**
 * ParticipantBodyPicker — shared component for CORR-14 / EX-9.
 *
 * Renders a multi-select checklist of all visible bodies in the component store.
 * When no IDs are selected the feature applies to all bodies (default Fusion behaviour).
 * Pass selectedIds = [] to mean "all", or a non-empty array to restrict.
 */
import { useComponentStore } from '../../store/componentStore';

interface Props {
  /** Currently selected body IDs. Empty = apply to all bodies. */
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Optional label above the picker */
  label?: string;
}

export function ParticipantBodyPicker({ selectedIds, onChange, label = 'Participant Bodies' }: Props) {
  const bodies = useComponentStore((s) => s.bodies);
  const bodyList = Object.values(bodies).filter((b) => b.visible);

  if (bodyList.length === 0) return null;

  const allSelected = selectedIds.length === 0;

  const toggle = (id: string) => {
    if (allSelected) {
      // Currently "all" — deselect this one (explicitly exclude it)
      onChange(bodyList.map((b) => b.id).filter((bid) => bid !== id));
    } else if (selectedIds.includes(id)) {
      const next = selectedIds.filter((bid) => bid !== id);
      // If nothing left selected, revert to "all"
      onChange(next.length === 0 ? [] : next);
    } else {
      const next = [...selectedIds, id];
      // If all are checked, revert to "all" (empty = default)
      onChange(next.length === bodyList.length ? [] : next);
    }
  };

  const isChecked = (id: string) => allSelected || selectedIds.includes(id);

  return (
    <div className="form-group" style={{ marginTop: 8 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {label}
        {allSelected && (
          <span style={{ fontSize: 10, color: '#888', fontWeight: 'normal' }}>(all)</span>
        )}
      </label>
      <div style={{ maxHeight: 110, overflowY: 'auto', border: '1px solid #333366', borderRadius: 4, padding: '4px 6px', marginTop: 4 }}>
        {bodyList.map((body) => (
          <label
            key={body.id}
            className="checkbox-label"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', cursor: 'pointer', fontSize: 12 }}
          >
            <input
              type="checkbox"
              checked={isChecked(body.id)}
              onChange={() => toggle(body.id)}
            />
            {body.name}
          </label>
        ))}
      </div>
    </div>
  );
}

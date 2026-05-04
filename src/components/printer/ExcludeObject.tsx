/**
 * ExcludeObject — universal wrapper.
 * Klipper  → KlipperExcludeObject (EXCLUDE_OBJECT via Moonraker).
 * Duet     → DuetExcludeObject (M486 via RRF 3.5+).
 * Other    → NonKlipperExcludeObject (workaround UI).
 */
import { usePrinterStore } from '../../store/printerStore';
import KlipperExcludeObject from './KlipperExcludeObject';
import DuetExcludeObject from './DuetExcludeObject';
import NonKlipperExcludeObject from './NonKlipperExcludeObject';

export default function ExcludeObject() {
  const boardType = usePrinterStore((s) => s.config.boardType);
  if (boardType === 'klipper') return <KlipperExcludeObject />;
  if (boardType === 'duet') return <DuetExcludeObject />;
  return <NonKlipperExcludeObject />;
}

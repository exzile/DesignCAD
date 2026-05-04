/**
 * ExcludeObject — universal wrapper.
 * Klipper  → delegates to KlipperExcludeObject (mid-print EXCLUDE_OBJECT command).
 * All other → workaround UI: explains the limitation and links to the Prepare workspace.
 */
import { usePrinterStore } from '../../store/printerStore';
import KlipperExcludeObject from './KlipperExcludeObject';
import NonKlipperExcludeObject from './NonKlipperExcludeObject';

export default function ExcludeObject() {
  const boardType = usePrinterStore((s) => s.config.boardType);
  return boardType === 'klipper' ? <KlipperExcludeObject /> : <NonKlipperExcludeObject />;
}

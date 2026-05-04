/**
 * Unified bed-levelling tab.
 * Delegates to the correct implementation based on the connected printer's firmware:
 *   Klipper  → KlipperBedMesh  (Moonraker bed_mesh objects API)
 *   Marlin   → MarlinBedLevel  (G29 calibration controls; no remote mesh read)
 *   Duet / all other → DuetHeightMap (heightmap.csv via Duet file API)
 */
import { usePrinterStore } from '../../store/printerStore';
import DuetHeightMap from './DuetHeightMap';
import KlipperBedMesh from './KlipperBedMesh';
import MarlinBedLevel from './MarlinBedLevel';

export default function BedMap() {
  const boardType = usePrinterStore((s) => s.config.boardType);
  if (boardType === 'klipper') return <KlipperBedMesh />;
  if (boardType === 'marlin') return <MarlinBedLevel />;
  return <DuetHeightMap />;
}

/**
 * Timelapse — universal wrapper.
 * Klipper  → delegates to KlipperTimelapse (Moonraker timelapse plugin).
 * All other → in-app camera-capture timelapse using MediaRecorder / canvas.
 */
import { usePrinterStore } from '../../store/printerStore';
import KlipperTimelapse from './KlipperTimelapse';
import BrowserTimelapse from './BrowserTimelapse';

export default function Timelapse() {
  const boardType = usePrinterStore((s) => s.config.boardType);
  return boardType === 'klipper' ? <KlipperTimelapse /> : <BrowserTimelapse />;
}

/**
 * PowerDevices — universal wrapper.
 * Klipper  → delegates to KlipperPowerDevices (Moonraker power API).
 * All other → HttpPowerDevices (Tasmota / Shelly / generic HTTP toggle).
 */
import { usePrinterStore } from '../../store/printerStore';
import KlipperPowerDevices from './KlipperPowerDevices';
import HttpPowerDevices from './HttpPowerDevices';

export default function PowerDevices() {
  const boardType = usePrinterStore((s) => s.config.boardType);
  return boardType === 'klipper' ? <KlipperPowerDevices /> : <HttpPowerDevices />;
}

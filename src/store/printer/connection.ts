import { DuetService } from '../../services/DuetService';
import type { DuetConfig } from '../../types/duet';

export async function testDuetConnection(
  config: DuetConfig,
): Promise<{ success: boolean; firmwareVersion?: string; error?: string }> {
  const isUsb = config.transport === 'usb';
  if (!isUsb && !config.hostname) {
    return { success: false, error: 'No hostname configured' };
  }

  const service = new DuetService(config);
  try {
    const result = await service.testConnection();
    await service.disconnect().catch(() => {});
    return result;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

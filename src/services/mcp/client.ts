export type DesignCadMcpStatus = {
  running: boolean;
  endpoint: string;
  pairingLine: string;
  port: number;
};

export type DesignCadMcpAuditEntry = {
  args?: unknown;
  callId: string;
  message?: string;
  status: 'queued' | 'ok' | 'error' | 'timeout' | 'rate-limited';
  timestamp: string;
  tool: string;
};

export type DesignCadMcpControlAction = 'status' | 'start' | 'heartbeat' | 'stop' | 'rotate';

async function requestMcpControl(action: DesignCadMcpControlAction): Promise<DesignCadMcpStatus> {
  const response = await fetch(`/mcp-control/${action}`, {
    method: action === 'status' ? 'GET' : 'POST',
    cache: 'no-store',
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(message || response.statusText);
  }
  return await response.json() as DesignCadMcpStatus;
}

export const designCadMcpClient = {
  status: () => requestMcpControl('status'),
  start: () => requestMcpControl('start'),
  heartbeat: () => requestMcpControl('heartbeat'),
  stop: () => requestMcpControl('stop'),
  rotateToken: () => requestMcpControl('rotate'),
  audit: async () => {
    const response = await fetch('/mcp-control/audit', { cache: 'no-store' });
    if (!response.ok) throw new Error(await response.text().catch(() => response.statusText));
    return await response.json() as { entries: DesignCadMcpAuditEntry[] };
  },
  clearAudit: async () => {
    const response = await fetch('/mcp-control/clear-audit', { method: 'POST', cache: 'no-store' });
    if (!response.ok) throw new Error(await response.text().catch(() => response.statusText));
    return await response.json() as { ok: true };
  },
};

export function stopDesignCadMcpOnUnload(): void {
  navigator.sendBeacon?.('/mcp-control/stop');
}

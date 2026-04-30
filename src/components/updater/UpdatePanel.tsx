import { useCallback, useEffect, useMemo, useState } from 'react';
import { DownloadCloud, RefreshCw, X } from 'lucide-react';
import './UpdatePanel.css';

type UpdateChannel = 'branch' | 'release';

interface UpdateStatus {
  ok: boolean;
  repo?: string;
  branch?: string;
  installed?: {
    channel?: string;
    sha?: string;
    releaseTag?: string;
    installedAt?: string;
  };
  branchUpdate?: {
    sha: string;
    shortSha: string;
    message: string;
    date: string;
    available: boolean;
  };
  releaseUpdate?: {
    tag: string;
    name: string;
    publishedAt: string;
    available: boolean;
    hasInstallableAsset: boolean;
  } | null;
  error?: string;
}

interface ApplyResult {
  ok: boolean;
  message?: string;
  error?: string;
  installed?: UpdateStatus['installed'];
}

const tokenStorageKey = 'designcad.updaterToken';

function shortSha(sha?: string) {
  return sha ? sha.slice(0, 7) : 'unknown';
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export default function UpdatePanel() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [message, setMessage] = useState('Checking for updates...');
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem(tokenStorageKey) ?? '');

  const availableChannel = useMemo<UpdateChannel | null>(() => {
    if (status?.releaseUpdate?.available && status.releaseUpdate.hasInstallableAsset) return 'release';
    if (status?.branchUpdate?.available) return 'branch';
    return null;
  }, [status]);

  const loadStatus = useCallback(async () => {
    setBusy(true);
    try {
      const result = await readJson<UpdateStatus>(await fetch('/api/update/status'));
      setStatus(result);
      setMessage(result.ok ? 'Update status refreshed.' : result.error ?? 'Updater is unavailable.');
    } catch (err) {
      setMessage(`Updater is unavailable: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (token) localStorage.setItem(tokenStorageKey, token);
    else localStorage.removeItem(tokenStorageKey);
  }, [token]);

  const applyUpdate = async (channel: UpdateChannel) => {
    setBusy(true);
    setMessage(channel === 'release' ? 'Installing latest release...' : 'Installing latest master...');
    try {
      const response = await fetch('/api/update/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'X-DesignCAD-Updater-Key': token } : {}),
        },
        body: JSON.stringify({ channel }),
      });
      const result = await readJson<ApplyResult>(response);
      if (!response.ok || !result.ok) {
        setMessage(result.error ?? `Install failed with HTTP ${response.status}`);
        return;
      }
      setMessage(result.message ?? 'Update installed. Reloading...');
      await loadStatus();
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setMessage(`Install failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="update-panel">
      <button
        className={`update-panel-toggle${availableChannel ? ' update-available' : ''}`}
        onClick={() => setOpen((value) => !value)}
        title="Site updates"
      >
        <DownloadCloud size={15} />
        <span>{availableChannel ? 'Update available' : 'Updates'}</span>
      </button>

      {open && (
        <div className="update-panel-card">
          <div className="update-panel-header">
            <div className="update-panel-title">
              <DownloadCloud size={16} />
              <span>Site Updates</span>
            </div>
            <button className="update-panel-close" onClick={() => setOpen(false)} aria-label="Close updates">
              <X size={14} />
            </button>
          </div>

          <div className="update-panel-row">
            <span className="update-panel-label">Installed</span>
            <span className="update-panel-value strong">
              {status?.installed?.releaseTag ?? shortSha(status?.installed?.sha)}
            </span>
          </div>
          <div className="update-panel-row">
            <span className="update-panel-label">Master</span>
            <span className="update-panel-value">
              {status?.branchUpdate
                ? `${status.branchUpdate.shortSha} ${status.branchUpdate.available ? 'available' : 'current'}`
                : 'unknown'}
            </span>
          </div>
          <div className="update-panel-row">
            <span className="update-panel-label">Release</span>
            <span className="update-panel-value">
              {status?.releaseUpdate
                ? `${status.releaseUpdate.tag}${status.releaseUpdate.available ? ' available' : ' current'}`
                : 'none found'}
            </span>
          </div>

          <label className="update-panel-token">
            <span className="update-panel-label">Updater key</span>
            <input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste key from the Pi"
              type="password"
            />
          </label>

          <div className="update-panel-actions">
            <button onClick={loadStatus} disabled={busy}>
              <RefreshCw size={14} />
              <span>Check</span>
            </button>
            <button
              className="primary"
              onClick={() => applyUpdate(availableChannel ?? 'branch')}
              disabled={busy || !availableChannel}
            >
              <DownloadCloud size={14} />
              <span>Install</span>
            </button>
          </div>

          <div className="update-panel-message">{message}</div>
        </div>
      )}
    </div>
  );
}

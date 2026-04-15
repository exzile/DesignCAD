import { useState } from 'react';
import { X, Wifi, Loader2 } from 'lucide-react';
import { usePrinterStore } from '../../store/printerStore';

export default function PrinterSettings() {
  const showSettings = usePrinterStore((s) => s.showSettings);
  const setShowSettings = usePrinterStore((s) => s.setShowSettings);
  const connected = usePrinterStore((s) => s.connected);
  const config = usePrinterStore((s) => s.config);
  const setConfig = usePrinterStore((s) => s.setConfig);
  const connectPrinter = usePrinterStore((s) => s.connect);
  const disconnectPrinter = usePrinterStore((s) => s.disconnect);
  const error = usePrinterStore((s) => s.error);

  const [url, setUrl] = useState(config?.hostname || 'http://duet.local');
  const [password, setPassword] = useState(config?.password || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);

  if (!showSettings) return null;

  const handleConnect = async () => {
    if (!url || !password) return;
    setTesting(true);
    setTestResult(null);

    try {
      setConfig({
        hostname: url.replace(/\/$/, ''),
        password,
        mode: 'standalone',
      });
      await connectPrinter();
      setTestResult('success');
    } catch {
      setTestResult('fail');
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectPrinter();
    setTestResult(null);
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog">
        <div className="dialog-header">
          <h3>Duet Printer Connection</h3>
          <button className="dialog-close" onClick={() => setShowSettings(false)}>
            <X size={16} />
          </button>
        </div>

        <div className="dialog-body">
          <div className="connection-status-banner">
            {connected ? (
              <div className="banner success">
                <Wifi size={16} /> Connected to printer
              </div>
            ) : (
              <div className="banner info">
                Connect to your Duet controller
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Duet Host URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://duet.local or http://192.168.1.100"
              disabled={connected}
            />
            <span className="form-hint">
              The base address of your Duet controller (e.g. http://duet.local)
            </span>
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Duet password"
              disabled={connected}
            />
            <span className="form-hint">
              Password configured in RepRapFirmware for HTTP access
            </span>
          </div>

          {testResult === 'success' && (
            <div className="banner success">Connection successful</div>
          )}
          {testResult === 'fail' && (
            <div className="banner error">
              Connection failed. Check the URL and password.
            </div>
          )}
          {error && (
            <div className="banner error">{error}</div>
          )}

          <div className="help-section">
            <h4>Setup Guide</h4>
            <ol>
              <li>Ensure your Duet board is connected to your network</li>
              <li>Open the Duet web interface in a browser</li>
              <li>Confirm HTTP access is enabled and password is set</li>
              <li>Enter the host URL and password above</li>
            </ol>
            <p className="help-note">
              Both your computer and printer must be on the same network.
              If using a hostname like "duet.local", make sure mDNS is working
              on your network, or use the IP address directly.
            </p>
          </div>
        </div>

        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={() => setShowSettings(false)}>
            Close
          </button>
          {connected ? (
            <button className="btn btn-danger" onClick={handleDisconnect}>
              Disconnect
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleConnect}
              disabled={!url || !password || testing}
            >
              {testing ? (
                <><Loader2 size={14} className="spin" /> Connecting...</>
              ) : (
                <><Wifi size={14} style={{ marginRight: 6 }} /> Connect</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

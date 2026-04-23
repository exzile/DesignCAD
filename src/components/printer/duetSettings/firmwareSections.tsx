import React from 'react';
import {
  AlertCircle,
  ArrowUpCircle,
  Calendar,
  CheckCircle,
  Download,
  ExternalLink,
  Info,
  Loader2,
  Monitor,
  Package,
  RefreshCw,
  Sparkles,
  UploadCloud,
  X,
  Zap,
} from 'lucide-react';
import type { DuetBoard } from '../../../types/duet';
import type {
  FirmwareMatch,
  GitHubAsset,
  GitHubRelease,
  PanelDueConfig,
} from './helpers';
import { formatBytes, panelDueVariantLabel } from './helpers';
import type { AutoUpdateState, PanelDueFlashed, PanelDueUpdateState } from '../../../types/panel-due.types';
export type { AutoUpdateState, PanelDueFlashed, PanelDueUpdateState } from '../../../types/panel-due.types';

export function FirmwareSection({
  autoUpdate,
  board,
  canAutoUpdate,
  connected,
  currentVer,
  dwcTag,
  firmwareFile,
  firmwareInputRef,
  firmwareStatus,
  firmwareUpdatePending,
  fwMatch,
  handleAutoUpdate,
  handleCheckForUpdate,
  handleFirmwareInstall,
  handleFirmwareSelect,
  handleFirmwareUpload,
  handleUpdateDwcOnly,
  latestTag,
  publishedDate,
  release,
  setAutoUpdate,
  setShowReleaseNotes,
  showReleaseNotes,
  updateCheckError,
  updateLoading,
  updateStatus,
  uploadProgress,
  uploading,
  iapFile,
  iapInputRef,
  iapStatus,
  handleIapSelect,
  handleIapUpload,
}: {
  autoUpdate: AutoUpdateState;
  board?: DuetBoard;
  canAutoUpdate: boolean;
  connected: boolean;
  currentVer: string;
  dwcTag: string;
  firmwareFile: File | null;
  firmwareInputRef: React.RefObject<HTMLInputElement | null>;
  firmwareStatus: { type: 'success' | 'error'; message: string } | null;
  firmwareUpdatePending: boolean;
  fwMatch: FirmwareMatch;
  handleAutoUpdate: (fwAsset: GitHubAsset, dwcAsset?: GitHubAsset) => void;
  handleCheckForUpdate: () => void;
  handleFirmwareInstall: () => void;
  handleFirmwareSelect: (files: FileList | null) => void;
  handleFirmwareUpload: () => void;
  handleUpdateDwcOnly: (dwcAsset: GitHubAsset) => void;
  latestTag: string;
  publishedDate: string;
  release?: GitHubRelease;
  setAutoUpdate: React.Dispatch<React.SetStateAction<AutoUpdateState>>;
  setShowReleaseNotes: React.Dispatch<React.SetStateAction<boolean>>;
  showReleaseNotes: boolean;
  updateCheckError?: string;
  updateLoading: boolean;
  updateStatus: 'up-to-date' | 'update-available' | 'ahead' | 'unknown';
  uploadProgress: number;
  uploading: boolean;
  iapFile: File | null;
  iapInputRef: React.RefObject<HTMLInputElement | null>;
  iapStatus: { type: 'success' | 'error'; message: string } | null;
  handleIapSelect: (files: FileList | null) => void;
  handleIapUpload: () => void;
}) {
  return (
    <>
      <div className="duet-settings__page-title">Firmware</div>

      {!connected && (
        <div className="duet-settings__banner duet-settings__banner--info">
          <Info size={16} /> Connect to a Duet board to upload firmware.
        </div>
      )}

      <div className="ds-fw-hero">
        <div className="ds-fw-hero-head">
          <div className="ds-fw-hero-icon"><Zap size={22} /></div>
          <div className="ds-fw-hero-title">
            <div className="ds-fw-hero-label">Current Firmware</div>
            <div className="ds-fw-hero-version">
              {board ? (
                <>
                  {board.firmwareName} <strong>{board.firmwareVersion}</strong>
                </>
              ) : (
                <span className="duet-settings__dim-text">Not connected</span>
              )}
            </div>
            {board?.firmwareDate && (
              <div className="ds-fw-hero-date">
                <Calendar size={10} /> Built {board.firmwareDate}
              </div>
            )}
          </div>
          <button
            className={`ds-check-btn${updateLoading ? ' is-loading' : ''}`}
            onClick={handleCheckForUpdate}
            disabled={updateLoading}
            title="Check for updates on GitHub"
          >
            <RefreshCw size={13} className={updateLoading ? 'spin' : undefined} />
            {updateLoading ? 'Checking...' : 'Check for updates'}
          </button>
        </div>

        {updateCheckError && (
          <div className="ds-fw-update-card ds-fw-update-card--error">
            <AlertCircle size={16} />
            <div>
              <div className="ds-fw-update-title">Update check failed</div>
              <div className="ds-fw-update-detail">{updateCheckError}</div>
            </div>
          </div>
        )}

        {release && !updateCheckError && (
          <div className={`ds-fw-update-card ds-fw-update-card--${updateStatus}`}>
            <div className="ds-fw-update-head">
              <div className="ds-fw-update-icon">
                {updateStatus === 'update-available' ? <ArrowUpCircle size={18} /> : updateStatus === 'ahead' ? <Info size={18} /> : <Sparkles size={18} />}
              </div>
              <div className="ds-fw-update-info">
                <div className="ds-fw-update-title">
                  {updateStatus === 'update-available' && `Update available: v${latestTag}`}
                  {updateStatus === 'up-to-date' && 'You are running the latest firmware'}
                  {updateStatus === 'ahead' && `You're ahead of GitHub (latest: v${latestTag})`}
                  {updateStatus === 'unknown' && `Latest release: v${latestTag}`}
                </div>
                <div className="ds-fw-update-detail">
                  {updateStatus === 'update-available' && currentVer ? (
                    <>
                      Installed: <span className="duet-settings__mono">v{currentVer}</span> → Latest: <span className="duet-settings__mono">v{latestTag}</span>
                    </>
                  ) : (
                    release.name || `v${latestTag}`
                  )}
                  {publishedDate && <span className="ds-fw-update-date"> · Published {publishedDate}</span>}
                </div>
              </div>
              <a href={release.html_url} target="_blank" rel="noopener noreferrer" className="ds-fw-external-btn" title="View release on GitHub">
                <ExternalLink size={12} /> GitHub
              </a>
            </div>

            {fwMatch.candidates.length > 0 && (
              <div className="ds-fw-assets">
                <div className="ds-fw-assets-label">
                  {fwMatch.matchLevel === 'exact' && (
                    <>
                      <CheckCircle size={10} /> Exact match for <span className="duet-settings__mono">{board?.firmwareFileName}</span>
                    </>
                  )}
                  {fwMatch.matchLevel === 'family' && (
                    <>
                      <CheckCircle size={10} /> Matched to {fwMatch.familyName ?? board?.shortName}
                    </>
                  )}
                  {fwMatch.matchLevel === 'guess' && (
                    <>
                      <Info size={10} /> Best guess for {board?.shortName ?? board?.name ?? 'this board'}
                    </>
                  )}
                  {fwMatch.matchLevel === 'none' && (
                    <>
                      <AlertCircle size={10} /> No asset matched - select manually
                    </>
                  )}
                </div>

                {updateStatus === 'update-available' && canAutoUpdate && fwMatch.firmware && (
                  <div className="ds-fw-auto-update-row">
                    <button
                      className="ds-fw-update-action-btn"
                      onClick={() => handleAutoUpdate(fwMatch.firmware!, fwMatch.dwc)}
                      disabled={!connected || autoUpdate.step === 'downloading' || autoUpdate.step === 'uploading' || autoUpdate.step === 'installing'}
                    >
                      {autoUpdate.step === 'downloading' ? (
                        <><Loader2 size={14} className="spin" /> Downloading {autoUpdate.progress}%</>
                      ) : autoUpdate.step === 'uploading' ? (
                        <><Loader2 size={14} className="spin" /> Uploading {uploadProgress}%</>
                      ) : autoUpdate.step === 'installing' ? (
                        <><Loader2 size={14} className="spin" /> Installing...</>
                      ) : (
                        <><ArrowUpCircle size={14} /> Update to v{latestTag}</>
                      )}
                    </button>
                    <div className="ds-fw-auto-update-hint">
                      Will install <span className="duet-settings__mono">{fwMatch.firmware.name}</span> ({formatBytes(fwMatch.firmware.size)})
                      {fwMatch.dwc && <> and update <span className="duet-settings__mono">{fwMatch.dwc.name}</span> ({formatBytes(fwMatch.dwc.size)})</>}
                      {' '}· The board will reboot during install.
                      {fwMatch.matchLevel === 'guess' && <> <strong>Heuristic match - verify this is the correct firmware before installing.</strong></>}
                    </div>
                  </div>
                )}

                {updateStatus !== 'update-available' && fwMatch.dwc && (
                  <div className="ds-fw-auto-update-row ds-fw-auto-update-row--dwc">
                    <button
                      className="ds-fw-update-action-btn ds-fw-update-action-btn--secondary"
                      onClick={() => handleUpdateDwcOnly(fwMatch.dwc!)}
                      disabled={!connected || autoUpdate.step === 'downloading' || autoUpdate.step === 'uploading' || autoUpdate.step === 'installing'}
                    >
                      {autoUpdate.step === 'downloading' ? (
                        <><Loader2 size={14} className="spin" /> Downloading {autoUpdate.progress}%</>
                      ) : autoUpdate.step === 'uploading' ? (
                        <><Loader2 size={14} className="spin" /> Uploading {uploadProgress}%</>
                      ) : (
                        <><RefreshCw size={14} /> Update DuetWebControl to v{dwcTag}</>
                      )}
                    </button>
                    <div className="ds-fw-auto-update-hint">
                      Fixes <em>"Incompatible software versions"</em> warnings when RRF is current but the DWC bundle on the board is stale.
                      Will upload <span className="duet-settings__mono">{fwMatch.dwc.name}</span> ({formatBytes(fwMatch.dwc.size)}) to <span className="duet-settings__mono">0:/www/</span> - no reboot required.
                    </div>
                  </div>
                )}

                {updateStatus === 'update-available' && !canAutoUpdate && (
                  <div className="ds-fw-auto-update-row ds-fw-auto-update-row--warn">
                    <div className="ds-fw-auto-update-hint">
                      <AlertCircle size={11} /> Could not identify firmware for <span className="duet-settings__mono">{board?.shortName ?? board?.name ?? 'this board'}</span>. Choose the right file from the list below and use the <strong>Upload</strong> section.
                    </div>
                  </div>
                )}

                {autoUpdate.step !== 'idle' && (
                  <div className={`ds-fw-auto-status ds-fw-auto-status--${autoUpdate.step}`}>
                    <div className="ds-fw-auto-status-head">
                      <div className="ds-fw-auto-status-msg">
                        {autoUpdate.step === 'downloading' && <><Download size={13} /> Downloading <span className="duet-settings__mono">{autoUpdate.assetName}</span></>}
                        {autoUpdate.step === 'uploading' && <><UploadCloud size={13} /> Uploading to board</>}
                        {autoUpdate.step === 'installing' && <><Zap size={13} /> Sending M997 - board is rebooting</>}
                        {autoUpdate.step === 'done' && <><Loader2 size={13} className="spin" /> Update sent - waiting for the board to come back online</>}
                        {autoUpdate.step === 'reconnected' && <><CheckCircle size={13} /> Update complete - board reconnected{board?.firmwareVersion ? ` on v${board.firmwareVersion}` : ''}</>}
                        {autoUpdate.step === 'error' && <><AlertCircle size={13} /> Update failed</>}
                      </div>
                      {(autoUpdate.step === 'reconnected' || autoUpdate.step === 'error') && (
                        <button
                          className="ds-fw-auto-status-dismiss"
                          onClick={() => {
                            setAutoUpdate({ step: 'idle', progress: 0 });
                            if (autoUpdate.step === 'reconnected') handleCheckForUpdate();
                          }}
                          title="Dismiss"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    {autoUpdate.step === 'downloading' && (
                      <div className="ds-fw-auto-progress-bar">
                        <div className="ds-fw-auto-progress-fill" style={{ width: `${autoUpdate.progress}%` }} />
                      </div>
                    )}
                    {autoUpdate.step === 'uploading' && (
                      <div className="ds-fw-auto-progress-bar">
                        <div className="ds-fw-auto-progress-fill" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    )}
                    {autoUpdate.step === 'error' && autoUpdate.error && <div className="ds-fw-auto-error">{autoUpdate.error}</div>}
                  </div>
                )}

                <div className="ds-fw-assets-list">
                  {fwMatch.candidates.slice(0, 6).map((asset) => {
                    const isPick = asset === fwMatch.firmware;
                    const isIap = asset === fwMatch.iapSbc || asset === fwMatch.iapSd;
                    return (
                      <a key={asset.name} className={`ds-fw-asset${isPick ? ' is-pick' : ''}${isIap ? ' is-iap' : ''}`} href={asset.browser_download_url} target="_blank" rel="noopener noreferrer" title={`Download ${asset.name}`}>
                        <Package size={12} />
                        <span className="ds-fw-asset-name">{asset.name}</span>
                        {isPick && <span className="ds-fw-asset-tag ds-fw-asset-tag--pick">firmware</span>}
                        {asset === fwMatch.iapSbc && <span className="ds-fw-asset-tag">IAP (SBC)</span>}
                        {asset === fwMatch.iapSd && <span className="ds-fw-asset-tag">IAP (SD)</span>}
                        <span className="ds-fw-asset-size">{formatBytes(asset.size)}</span>
                        <Download size={11} />
                      </a>
                    );
                  })}
                </div>
                <div className="ds-fw-asset-hint">
                  {updateStatus === 'update-available' && canAutoUpdate ? (
                    <>Or download manually and use <strong>Upload</strong> below.</>
                  ) : (
                    <>Download the matching file, then use <strong>Upload</strong> below to send it to the board.</>
                  )}
                </div>
              </div>
            )}

            {release.body && (
              <div className="ds-fw-notes-wrap">
                <button className="ds-fw-notes-toggle" onClick={() => setShowReleaseNotes((value) => !value)}>
                  {showReleaseNotes ? 'Hide' : 'Show'} release notes
                </button>
                {showReleaseNotes && <pre className="ds-fw-notes">{release.body}</pre>}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="duet-settings__section">
        <div className="duet-settings__section-title ds-section-title-row">
          <UploadCloud size={14} /> Upload Firmware
        </div>
        <p className="duet-settings__about-text duet-settings__about-text--mb">
          Select a RepRapFirmware <code className="duet-settings__code-accent">.bin</code> or <code className="duet-settings__code-accent">.uf2</code> file. It will be uploaded to <code className="duet-settings__code-accent">0:/firmware/</code> on the board.
        </p>

        <input ref={firmwareInputRef} type="file" accept=".bin,.uf2" className="duet-settings__file-input-hidden" onChange={(event) => handleFirmwareSelect(event.target.files)} />

        <div className="duet-settings__btn-row">
          <button className={`duet-settings__btn duet-settings__btn--secondary${!connected || uploading ? ' duet-settings__btn--disabled' : ''}`} onClick={() => firmwareInputRef.current?.click()} disabled={!connected || uploading}>
            <UploadCloud size={14} /> Choose File
          </button>
          <button className={`duet-settings__btn duet-settings__btn--primary${!firmwareFile || uploading || !connected ? ' duet-settings__btn--disabled' : ''}`} onClick={handleFirmwareUpload} disabled={!firmwareFile || uploading || !connected}>
            {uploading ? <><Loader2 size={14} className="spin" /> Uploading {uploadProgress}%</> : 'Upload'}
          </button>
          <button className={`duet-settings__btn duet-settings__btn--danger${!connected ? ' duet-settings__btn--disabled' : ''}`} onClick={handleFirmwareInstall} disabled={!connected}>
            <Zap size={14} /> Install (M997)
          </button>
        </div>

        {firmwareFile && !uploading && (
          <div className="ds-fw-file-chip">
            <Package size={12} />
            <span className="duet-settings__mono">{firmwareFile.name}</span>
            <span className="ds-fw-file-chip-size">{formatBytes(firmwareFile.size)}</span>
          </div>
        )}

        {uploading && (
          <div className="duet-settings__progress-wrapper">
            <div className="duet-settings__progress-track">
              <div className="duet-settings__progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        {firmwareStatus && (
          <div className={`duet-settings__banner duet-settings__banner--mt ${firmwareStatus.type === 'success' ? 'duet-settings__banner--success' : 'duet-settings__banner--error'}`}>
            {firmwareStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{firmwareStatus.message}</span>
          </div>
        )}

        {firmwareUpdatePending && (
          <div className="duet-settings__banner duet-settings__banner--mt duet-settings__banner--warning">
            <Loader2 size={16} className="spin" />
            <span>Board is rebooting - waiting for reconnect...</span>
          </div>
        )}
      </div>

      <div className="duet-settings__section">
        <div className="duet-settings__section-title ds-section-title-row">
          <Package size={14} /> IAP File
          <span className="ds-section-tag">standalone boards</span>
        </div>
        <p className="duet-settings__about-text duet-settings__about-text--mb">
          Select an IAP <code className="duet-settings__code-accent">.bin</code> file (e.g. <code className="duet-settings__code-accent">IAP4E.bin</code> or <code className="duet-settings__code-accent">Duet3_SBC.bin</code>). It will be uploaded to <code className="duet-settings__code-accent">0:/firmware/</code> on the board.
        </p>
        <p className="duet-settings__hint">Required for standalone (non-SBC) boards before firmware install.</p>

        <input ref={iapInputRef} type="file" accept=".bin" className="duet-settings__file-input-hidden" onChange={(event) => handleIapSelect(event.target.files)} />

        <div className="duet-settings__btn-row">
          <button className={`duet-settings__btn duet-settings__btn--secondary${!connected || uploading ? ' duet-settings__btn--disabled' : ''}`} onClick={() => iapInputRef.current?.click()} disabled={!connected || uploading}>
            <UploadCloud size={14} /> Choose IAP File
          </button>
          <button className={`duet-settings__btn duet-settings__btn--primary${!iapFile || uploading || !connected ? ' duet-settings__btn--disabled' : ''}`} onClick={handleIapUpload} disabled={!iapFile || uploading || !connected}>
            {uploading ? <><Loader2 size={14} className="spin" /> Uploading {uploadProgress}%</> : 'Upload IAP'}
          </button>
        </div>

        {iapFile && !uploading && (
          <div className="ds-fw-file-chip">
            <Package size={12} />
            <span className="duet-settings__mono">{iapFile.name}</span>
            <span className="ds-fw-file-chip-size">{formatBytes(iapFile.size)}</span>
          </div>
        )}

        {iapStatus && (
          <div className={`duet-settings__banner duet-settings__banner--mt ${iapStatus.type === 'success' ? 'duet-settings__banner--success' : 'duet-settings__banner--error'}`}>
            {iapStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{iapStatus.message}</span>
          </div>
        )}
      </div>
    </>
  );
}

export function PanelDueSection({
  bins,
  busy,
  connected,
  handleCheckPanelDueUpdate,
  handlePanelDueInstall,
  latestTag,
  loadPanelDueInfo,
  panelDueAsset,
  panelDueCheckError,
  panelDueCheckLoading,
  panelDueFlashed,
  panelDueInfo,
  panelDueLogRef,
  panelDueUpdate,
  publishedDate,
  release,
  setPanelDueAsset,
  setPanelDueUpdate,
  setShowPanelDueNotes,
  showPanelDueNotes,
}: {
  bins: GitHubAsset[];
  busy: boolean;
  connected: boolean;
  handleCheckPanelDueUpdate: () => void;
  handlePanelDueInstall: (asset: GitHubAsset) => void;
  latestTag: string;
  loadPanelDueInfo: () => void;
  panelDueAsset: GitHubAsset | null;
  panelDueCheckError?: string;
  panelDueCheckLoading: boolean;
  panelDueFlashed: { loaded: boolean; data?: PanelDueFlashed };
  panelDueInfo: { loading: boolean; loaded: boolean; configs: PanelDueConfig[]; error?: string };
  panelDueLogRef: React.MutableRefObject<HTMLPreElement | null>;
  panelDueUpdate: PanelDueUpdateState;
  publishedDate: string;
  release?: GitHubRelease;
  setPanelDueAsset: React.Dispatch<React.SetStateAction<GitHubAsset | null>>;
  setPanelDueUpdate: React.Dispatch<React.SetStateAction<PanelDueUpdateState>>;
  setShowPanelDueNotes: React.Dispatch<React.SetStateAction<boolean>>;
  showPanelDueNotes: boolean;
}) {
  const primaryCfg = panelDueInfo.configs.find((config) => config.checksum === 2 || config.checksum === 3) ?? panelDueInfo.configs[0];
  const checksumLabel =
    primaryCfg?.checksum === 2 ? 'CRC (PanelDue)' :
    primaryCfg?.checksum === 3 ? 'CRC + checksum' :
    primaryCfg?.checksum === 1 ? 'Checksum only' :
    primaryCfg?.checksum === 0 ? 'None' : undefined;
  const step = panelDueUpdate.step;

  return (
    <>
      <div className="duet-settings__page-title">PanelDue</div>

      {!connected && (
        <div className="duet-settings__banner duet-settings__banner--info">
          <Info size={16} /> Connect to a Duet board to detect and update a PanelDue.
        </div>
      )}

      <div className="ds-fw-hero">
        <div className="ds-fw-hero-head">
          <div className="ds-fw-hero-icon"><Monitor size={22} /></div>
          <div className="ds-fw-hero-title">
            <div className="ds-fw-hero-label">Detected PanelDue</div>
            <div className="ds-fw-hero-version">
              {!connected ? (
                <span className="duet-settings__dim-text">Not connected</span>
              ) : panelDueInfo.loading ? (
                <span className="duet-settings__dim-text"><Loader2 size={12} className="spin" /> Reading config.g...</span>
              ) : primaryCfg ? (
                <>
                  UART <strong>{primaryCfg.channel ?? '?'}</strong>
                  {primaryCfg.baud ? <> @ <strong>{primaryCfg.baud.toLocaleString()}</strong> bps</> : null}
                </>
              ) : panelDueInfo.loaded ? (
                <span className="duet-settings__dim-text">No M575 in config.g</span>
              ) : (
                <span className="duet-settings__dim-text">—</span>
              )}
            </div>
            {primaryCfg && checksumLabel && (
              <div className="ds-fw-hero-date">
                <Info size={10} /> {checksumLabel}
              </div>
            )}
            {panelDueFlashed.data && (
              <div className="ds-fw-hero-date" title={`Flashed ${panelDueFlashed.data.assetName}`}>
                <Zap size={10} /> Last flashed
                {panelDueFlashed.data.tag ? <> v<strong>{panelDueFlashed.data.tag}</strong></> : null}
                {panelDueFlashed.data.variant ? <> ({panelDueFlashed.data.variant})</> : null}
                {panelDueFlashed.data.flashedAt ? <> on {new Date(panelDueFlashed.data.flashedAt).toLocaleDateString()}</> : null}
              </div>
            )}
            {connected && (
              <button className="ds-fw-hero-rescan" onClick={loadPanelDueInfo} disabled={panelDueInfo.loading} title="Re-read 0:/sys/config.g">
                {panelDueInfo.loading ? <Loader2 size={11} className="spin" /> : <RefreshCw size={11} />}
                {panelDueInfo.loading ? 'Re-scanning...' : 'Re-scan config.g'}
              </button>
            )}
          </div>
          <button
            className={`ds-check-btn${panelDueCheckLoading ? ' is-loading' : ''}`}
            onClick={handleCheckPanelDueUpdate}
            disabled={!connected || panelDueCheckLoading}
            title="Check GitHub for the latest PanelDue firmware"
          >
            <RefreshCw size={13} className={panelDueCheckLoading ? 'spin' : undefined} />
            {panelDueCheckLoading ? 'Checking...' : 'Check for updates'}
          </button>
        </div>

        {panelDueInfo.error && (
          <div className="ds-fw-update-card ds-fw-update-card--error">
            <AlertCircle size={16} />
            <div>
              <div className="ds-fw-update-title">Could not read config.g</div>
              <div className="ds-fw-update-detail">{panelDueInfo.error}</div>
            </div>
          </div>
        )}

        {panelDueCheckError && (
          <div className="ds-fw-update-card ds-fw-update-card--error">
            <AlertCircle size={16} />
            <div>
              <div className="ds-fw-update-title">Update check failed</div>
              <div className="ds-fw-update-detail">{panelDueCheckError}</div>
            </div>
          </div>
        )}

        {release && !panelDueCheckError && (
          <div className="ds-fw-update-card ds-fw-update-card--unknown">
            <div className="ds-fw-update-head">
              <div className="ds-fw-update-icon"><Sparkles size={18} /></div>
              <div className="ds-fw-update-info">
                <div className="ds-fw-update-title">Latest release: v{latestTag}</div>
                <div className="ds-fw-update-detail">
                  {release.name || `v${latestTag}`}
                  {publishedDate && <span className="ds-fw-update-date"> · Published {publishedDate}</span>}
                </div>
              </div>
              <a href={release.html_url} target="_blank" rel="noopener noreferrer" className="ds-fw-external-btn" title="View release on GitHub">
                <ExternalLink size={12} /> GitHub
              </a>
            </div>

            {bins.length === 0 ? (
              <div className="ds-fw-auto-update-row ds-fw-auto-update-row--warn">
                <div className="ds-fw-auto-update-hint">
                  <AlertCircle size={11} /> This release doesn't include a PanelDue <code>.bin</code> - visit the release page directly.
                </div>
              </div>
            ) : (
              <div className="ds-fw-assets">
                <div className="ds-fw-assets-label">
                  <Info size={10} /> Pick the variant that matches your PanelDue's screen size
                </div>

                <div className="ds-fw-auto-update-row">
                  <button className="ds-fw-update-action-btn" onClick={() => panelDueAsset && handlePanelDueInstall(panelDueAsset)} disabled={!connected || !panelDueAsset || busy}>
                    {step === 'downloading' ? (
                      <><Loader2 size={14} className="spin" /> Downloading {panelDueUpdate.progress}%</>
                    ) : step === 'uploading' ? (
                      <><Loader2 size={14} className="spin" /> Uploading {panelDueUpdate.progress}%</>
                    ) : step === 'installing' ? (
                      <><Loader2 size={14} className="spin" /> Flashing PanelDue...</>
                    ) : (
                      <><ArrowUpCircle size={14} /> Flash PanelDue{latestTag ? ` v${latestTag}` : ''}</>
                    )}
                  </button>
                  <div className="ds-fw-auto-update-hint">
                    Will upload{panelDueAsset ? <> <span className="duet-settings__mono">{panelDueAsset.name}</span> ({formatBytes(panelDueAsset.size)})</> : ' the selected variant'}
                    {' '}as <span className="duet-settings__mono">0:/firmware/PanelDueFirmware.bin</span> and run <span className="duet-settings__mono">M997 S4</span> · The Duet stays running; flashing takes ~30-60s and the PanelDue restarts on its own.
                  </div>
                </div>

                {step !== 'idle' && (
                  <div className={`ds-fw-auto-status ds-fw-auto-status--${step === 'done' ? 'reconnected' : step}`}>
                    <div className="ds-fw-auto-status-head">
                      <div className="ds-fw-auto-status-msg">
                        {step === 'downloading' && <><Download size={13} /> Downloading <span className="duet-settings__mono">{panelDueUpdate.assetName}</span></>}
                        {step === 'uploading' && <><UploadCloud size={13} /> Uploading to board</>}
                        {step === 'installing' && <><Zap size={13} /> Flashing PanelDue - waiting for the board to confirm</>}
                        {step === 'done' && !panelDueUpdate.timedOut && <><CheckCircle size={13} /> PanelDue firmware flashed successfully</>}
                        {step === 'done' && panelDueUpdate.timedOut && <><AlertCircle size={13} /> Flash finished without a confirmation - check the display</>}
                        {step === 'error' && <><AlertCircle size={13} /> Update failed</>}
                      </div>
                      {(step === 'done' || step === 'error') && (
                        <button className="ds-fw-auto-status-dismiss" onClick={() => setPanelDueUpdate({ step: 'idle', progress: 0 })} title="Dismiss">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    {step === 'downloading' && (
                      <div className="ds-fw-auto-progress-bar">
                        <div className="ds-fw-auto-progress-fill" style={{ width: `${panelDueUpdate.progress}%` }} />
                      </div>
                    )}
                    {step === 'uploading' && (
                      <div className="ds-fw-auto-progress-bar">
                        <div className="ds-fw-auto-progress-fill" style={{ width: `${panelDueUpdate.progress}%` }} />
                      </div>
                    )}
                    {step === 'error' && panelDueUpdate.error && <div className="ds-fw-auto-error">{panelDueUpdate.error}</div>}
                    {(step === 'installing' || step === 'done' || step === 'error') && panelDueUpdate.messages && panelDueUpdate.messages.length > 0 && (
                      <pre
                        ref={(node) => {
                          panelDueLogRef.current = node;
                          if (node) node.scrollTop = node.scrollHeight;
                        }}
                        className="ds-pd-reply-log"
                      >
                        {panelDueUpdate.messages.join('\n')}
                      </pre>
                    )}
                  </div>
                )}

                <div className="ds-pd-table" role="table" aria-label="PanelDue firmware variants">
                  <div className="ds-pd-table-head" role="row">
                    <span role="columnheader">Variant</span>
                    <span role="columnheader">File</span>
                    <span role="columnheader" className="ds-pd-col-size">Size</span>
                  </div>
                  {bins.map((asset) => {
                    const isPick = asset === panelDueAsset;
                    return (
                      <button key={asset.name} type="button" role="row" className={`ds-pd-row${isPick ? ' is-pick' : ''}`} onClick={() => setPanelDueAsset(asset)} disabled={busy} title={asset.name}>
                        <span role="cell" className="ds-pd-cell-variant">
                          {isPick ? <CheckCircle size={11} className="ds-pd-row-check" /> : <span className="ds-pd-row-bullet" aria-hidden />}
                          <span className="ds-pd-variant-label">{panelDueVariantLabel(asset.name)}</span>
                        </span>
                        <span role="cell" className="ds-pd-cell-name">{asset.name}</span>
                        <span role="cell" className="ds-pd-cell-size">{formatBytes(asset.size)}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="ds-fw-asset-hint">
                  Click a row to select it, then press <strong>Flash PanelDue</strong>.
                </div>
              </div>
            )}

            {release.body && (
              <div className="ds-fw-notes-wrap">
                <button className="ds-fw-notes-toggle" onClick={() => setShowPanelDueNotes((value) => !value)}>
                  {showPanelDueNotes ? 'Hide' : 'Show'} release notes
                </button>
                {showPanelDueNotes && <pre className="ds-fw-notes">{release.body}</pre>}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

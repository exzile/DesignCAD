import type { DuetBoard } from '../../../types/duet';
import type {
  GitHubAsset,
  GitHubRelease,
  PanelDueConfig,
  MatchLevel as FirmwareMatchLevel,
  FirmwareMatch as BaseFirmwareMatch,
} from '../../../types/firmware-update.types';
export type { GitHubAsset, GitHubRelease, PanelDueConfig } from '../../../types/firmware-update.types';

export type MatchLevel = FirmwareMatchLevel;
export interface FirmwareMatch extends BaseFirmwareMatch {
  expectedFilename?: string;
  familyName?: string;
}

const RRF_RELEASES_URL = 'https://api.github.com/repos/Duet3D/RepRapFirmware/releases/latest';
const DWC_RELEASES_URL = 'https://api.github.com/repos/Duet3D/DuetWebControl/releases/latest';
const PANELDUE_RELEASES_URL = 'https://api.github.com/repos/Duet3D/PanelDueFirmware/releases/latest';

export function proxiedGithubUrl(url: string): string {
  if (import.meta.env.DEV) {
    return `/github-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export async function fetchLatestFirmware(): Promise<GitHubRelease> {
  const response = await fetch(proxiedGithubUrl(RRF_RELEASES_URL), {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) {
    throw new Error(`GitHub API responded ${response.status}`);
  }
  return response.json();
}

export async function fetchLatestDwc(): Promise<GitHubRelease> {
  const response = await fetch(proxiedGithubUrl(DWC_RELEASES_URL), {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) {
    throw new Error(`DWC GitHub API responded ${response.status}`);
  }
  return response.json();
}

export async function fetchLatestPanelDue(): Promise<GitHubRelease> {
  const response = await fetch(proxiedGithubUrl(PANELDUE_RELEASES_URL), {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) {
    throw new Error(`PanelDue GitHub API responded ${response.status}`);
  }
  return response.json();
}

export function parseM575(configText: string): PanelDueConfig[] {
  const configs: PanelDueConfig[] = [];
  for (const rawLine of configText.split(/\r?\n/)) {
    const line = rawLine.replace(/[;(].*$/, '').trim();
    if (!/^m575\b/i.test(line)) continue;
    const channel = line.match(/\bP(\d+)/i);
    const baud = line.match(/\bB(\d+)/i);
    const checksum = line.match(/\bS(\d+)/i);
    configs.push({
      raw: rawLine.trim(),
      channel: channel ? Number(channel[1]) : undefined,
      baud: baud ? Number(baud[1]) : undefined,
      checksum: checksum ? Number(checksum[1]) : undefined,
    });
  }
  return configs;
}

export function panelDueBinAssets(assets: GitHubAsset[]): GitHubAsset[] {
  return assets.filter((asset) => /^PanelDueFirmware.*\.bin$/i.test(asset.name));
}

export function panelDueVariantLabel(name: string): string {
  const stripped = name.replace(/\.bin$/i, '').replace(/^PanelDueFirmware[_-]*/i, '');
  const withoutVersion = stripped.replace(/^v?\d+(?:[._-]\d+){0,3}[._-]?/i, '');
  return withoutVersion || stripped || 'firmware';
}

export function sortPanelDueAssets(assets: GitHubAsset[]): GitHubAsset[] {
  return [...assets].sort((left, right) => {
    const leftLabel = panelDueVariantLabel(left.name);
    const rightLabel = panelDueVariantLabel(right.name);
    const leftSize = parseFloat(leftLabel.match(/(\d+(?:\.\d+)?)/)?.[1] ?? 'NaN');
    const rightSize = parseFloat(rightLabel.match(/(\d+(?:\.\d+)?)/)?.[1] ?? 'NaN');
    const leftHasSize = !Number.isNaN(leftSize);
    const rightHasSize = !Number.isNaN(rightSize);
    if (leftHasSize && rightHasSize && leftSize !== rightSize) return leftSize - rightSize;
    if (leftHasSize !== rightHasSize) return leftHasSize ? -1 : 1;
    const leftIntegrated = /i\b/i.test(leftLabel) ? 1 : 0;
    const rightIntegrated = /i\b/i.test(rightLabel) ? 1 : 0;
    if (leftIntegrated !== rightIntegrated) return leftIntegrated - rightIntegrated;
    return leftLabel.localeCompare(rightLabel);
  });
}

export function compareVersions(left: string, right: string): number {
  const toNumbers = (value: string) =>
    value.replace(/^v/i, '').split(/[.+-]/).map((part) => parseInt(part, 10) || 0);
  const leftParts = toNumbers(left);
  const rightParts = toNumbers(right);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const leftValue = leftParts[index] ?? 0;
    const rightValue = rightParts[index] ?? 0;
    if (leftValue !== rightValue) {
      return leftValue < rightValue ? -1 : 1;
    }
  }
  return 0;
}

interface BoardFamily {
  name: string;
  test: RegExp;
  firmware: RegExp;
  iap?: RegExp;
}

const BOARD_FAMILIES: BoardFamily[] = [
  { name: 'Duet 3 Mini 5+ Ethernet', test: /mini\s*5\+?\s*ethernet/i, firmware: /^Duet3Firmware_Mini5plusEthernet\.(bin|uf2)$/i, iap: /^Duet3_(SBC|SD)iap.*Mini5plusEthernet\.bin$/i },
  { name: 'Duet 3 Mini 5+', test: /mini\s*5\+?(?!.*ethernet)/i, firmware: /^Duet3Firmware_Mini5plus\.(bin|uf2)$/i, iap: /^Duet3_(SBC|SD)iap.*Mini5plus\.bin$/i },
  { name: 'Duet 3 MB6HC', test: /mb\s*6\s*hc/i, firmware: /^Duet3Firmware_MB6HC\.bin$/i, iap: /^Duet3_(SBC|SD)iap32_MB6HC\.bin$/i },
  { name: 'Duet 3 MB6XD', test: /mb\s*6\s*xd/i, firmware: /^Duet3Firmware_MB6XD\.bin$/i, iap: /^Duet3_(SBC|SD)iap32_MB6XD\.bin$/i },
  { name: 'Duet 3 Toolboard 1LC', test: /tool\s*1\s*lc/i, firmware: /^Duet3Firmware_TOOL1LC\.bin$/i },
  { name: 'Duet 3 EXP3HC', test: /exp\s*3\s*hc/i, firmware: /^Duet3Firmware_EXP3HC\.bin$/i },
  { name: 'Duet 3 EXP1XD', test: /exp\s*1\s*xd/i, firmware: /^Duet3Firmware_EXP1XD\.bin$/i },
  { name: 'Duet 3 EXP1HCL', test: /exp\s*1\s*hcl/i, firmware: /^Duet3Firmware_EXP1HCL\.bin$/i },
  { name: 'Duet 2 Maestro', test: /maestro/i, firmware: /^DuetMaestroFirmware\.bin$/i, iap: /^DuetMaestroIAP\.bin$/i },
  { name: 'Duet 2 WiFi/Ethernet', test: /duet\s*2|combined|wifi|ethernet/i, firmware: /^Duet2CombinedFirmware\.bin$/i, iap: /^Duet2CombinedIAP\.bin$/i },
];

function identifyFamily(board: DuetBoard | undefined): BoardFamily | null {
  if (!board) return null;
  const haystack = [board.shortName, board.name, board.firmwareName].filter(Boolean).join(' ');
  if (!haystack) return null;
  for (const family of BOARD_FAMILIES) {
    if (family.test.test(haystack)) return family;
  }
  return null;
}

export function findDwcAsset(
  assets: GitHubAsset[],
  mode: 'standalone' | 'sbc',
): GitHubAsset | undefined {
  return assets.find((asset) =>
    mode === 'sbc'
      ? /^DuetWebControl-SBC.*\.zip$/i.test(asset.name)
      : /^DuetWebControl(?!-SBC).*\.zip$/i.test(asset.name),
  );
}

export function pickFirmwareAssets(
  assets: GitHubAsset[],
  board: DuetBoard | undefined,
  mode: 'standalone' | 'sbc',
): FirmwareMatch {
  const binaryAssets = assets.filter((asset) => /\.(bin|uf2)$/i.test(asset.name));
  const dwc = findDwcAsset(assets, mode);

  if (!board) {
    return { candidates: binaryAssets, dwc, matchLevel: 'none' };
  }

  const firmwareFileName = board.firmwareFileName?.trim();
  if (firmwareFileName) {
    const exact = binaryAssets.find((asset) => asset.name.toLowerCase() === firmwareFileName.toLowerCase());
    if (exact) {
      return {
        firmware: exact,
        candidates: binaryAssets,
        dwc,
        matchLevel: 'exact',
        expectedFilename: firmwareFileName,
      };
    }
  }

  const family = identifyFamily(board);
  if (family) {
    const firmware = binaryAssets.find((asset) => family.firmware.test(asset.name));
    const iapCandidates = binaryAssets.filter((asset) => family.iap?.test(asset.name));
    const iapSbc = iapCandidates.find((asset) => /sbc/i.test(asset.name));
    const iapSd = iapCandidates.find((asset) => /sd/i.test(asset.name));
    if (firmware) {
      return {
        firmware,
        iapSbc,
        iapSd,
        candidates: binaryAssets,
        dwc,
        matchLevel: 'family',
        familyName: family.name,
        expectedFilename: firmware.name,
      };
    }
  }

  const guess = binaryAssets.find((asset) => !/iap/i.test(asset.name));
  return {
    firmware: guess,
    candidates: binaryAssets,
    dwc,
    matchLevel: guess ? 'guess' : 'none',
    familyName: family?.name,
    expectedFilename: guess?.name,
  };
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

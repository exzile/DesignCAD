export interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

export interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  assets: GitHubAsset[];
}

export interface PanelDueConfig {
  raw: string;
  channel?: number;
  baud?: number;
  checksum?: number;
}

export type MatchLevel = 'exact' | 'family' | 'guess' | 'none';

export interface FirmwareMatch {
  firmware?: GitHubAsset;
  iapSbc?: GitHubAsset;
  iapSd?: GitHubAsset;
  dwc?: GitHubAsset;
  candidates: GitHubAsset[];
  matchLevel: MatchLevel;
}

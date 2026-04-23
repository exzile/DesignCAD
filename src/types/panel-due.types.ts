export interface AutoUpdateState {
  step: 'idle' | 'downloading' | 'uploading' | 'installing' | 'done' | 'reconnected' | 'error';
  progress: number;
  assetName?: string;
  error?: string;
}

export interface PanelDueFlashed {
  tag: string;
  assetName: string;
  variant: string;
  flashedAt: string;
}

export interface PanelDueUpdateState {
  step: 'idle' | 'downloading' | 'uploading' | 'installing' | 'done' | 'error';
  progress: number;
  assetName?: string;
  error?: string;
  messages?: string[];
  timedOut?: boolean;
}

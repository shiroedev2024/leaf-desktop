export interface LeafPreferences {
  client_id?: string;
  last_update_time?: number;
  traffic: number;
  used_traffic: number;
  expire_time?: string;
  enable_ipv6: boolean;
  prefer_ipv6: boolean;
  memory_logger: boolean;
  log_level: number;
  api_port: number;
  auto_reload: boolean;
  user_agent?: string;
  bypass_lan: boolean;
  bypass_lan_in_core?: boolean;
  fake_ip?: boolean;
  force_resolve_domain?: boolean;
  bypass_geoip_list?: string[];
  bypass_geosite_list?: string[];
  reject_geoip_list?: string[];
  reject_geosite_list?: string[];
}

export interface UpdateLeafPreferences {
  enable_ipv6: boolean;
  prefer_ipv6: boolean;
  memory_logger: boolean;
  log_level: number;
  api_port: number;
  auto_reload: boolean;
  user_agent: string;
  bypass_lan: boolean;
  bypass_lan_in_core: boolean;
  fake_ip: boolean;
  force_resolve_domain: boolean;
  bypass_geoip_list?: string[];
  bypass_geosite_list?: string[];
  reject_geoip_list?: string[];
  reject_geosite_list?: string[];
}

export enum CoreState {
  Stopped = 'Stopped',
  Started = 'Started',
  Loading = 'Loading',
  Error = 'Error',
}

export enum ConnectivityState {
  Recovered = 'Recovered',
  Lost = 'Lost',
}

export enum LeafState {
  Stopped = 'Stopped',
  Started = 'Started',
  Loading = 'Loading',
  Reloaded = 'Reloaded',
  Error = 'Error',
}

export enum SubscriptionState {
  Initial = 'Initial',
  Fetching = 'Fetching',
  Error = 'Error',
  Success = 'Success',
}

export enum OutboundState {
  Initial = 'Initial',
  Success = 'Success',
  Error = 'Error',
  Loading = 'Loading',
}

export enum DeepLinkState {
  Loading = 'Loading',
  Received = 'Received',
  Success = 'Success',
  FetchError = 'FetchError',
  UnknownError = 'UnknownError',
}

export enum UpdateState {
  Initial = 'Initial',
  Checking = 'Checking',
  Available = 'Available',
  NotAvailable = 'NotAvailable',
  Downloading = 'Downloading',
  Downloaded = 'Downloaded',
  Installing = 'Installing',
  Error = 'Error',
}

export enum UpdateType {
  Tauri = 'Tauri',
  Linux = 'Linux',
}

export interface UpdateInfo {
  available: boolean;
  version?: string;
  notes?: string;
  releaseDate?: string;
  url?: string;
  type: UpdateType;
}

export interface UpdateProgress {
  downloaded: number;
  total: number;
  percentage: number;
}

export type ConnectivityEvent = { type: 'recovered' } | { type: 'lost' };

export type CoreEvent =
  | { type: 'starting' }
  | { type: 'started' }
  | { type: 'stopped' }
  | { type: 'error'; data: { error: string } };

export type LeafEvent =
  | { type: 'starting' }
  | { type: 'started' }
  | { type: 'stopped' }
  | { type: 'reloaded' }
  | { type: 'error'; data: { error: string } };

export type SubscriptionEvent =
  | { type: 'updating' }
  | { type: 'success' }
  | { type: 'error'; data: { error: string } };

export interface LinuxSystemInfo {
  packageManagerType: string;
  arch: string;
}

export interface LinuxUpdateResponse {
  available: boolean;
  notes?: string;
  release_date?: string;
  url?: string;
  version?: string;
}

export interface FileWatchEvent {
  path: string;
  eventType: string;
}

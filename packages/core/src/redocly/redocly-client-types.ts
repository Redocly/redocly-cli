import type { Region } from '../config/types';

export interface RegionalToken {
  region: Region;
  token: string;
}

export interface RegionalTokenWithValidity extends RegionalToken {
  valid: boolean;
}

export type Analytics = {
  event: string;
  event_time: string;
  logged_in: boolean;
  command: string | number;
  arguments: Record<string, unknown>;
  node_version: string;
  version: string;
  exit_code: 0 | 1;
};
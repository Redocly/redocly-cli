import type { Region } from '../config/types.js';

export interface RegionalToken {
  region: Region;
  token: string;
}

export interface RegionalTokenWithValidity extends RegionalToken {
  valid: boolean;
}

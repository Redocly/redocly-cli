import { Region } from '../config/config';

export interface RegionalToken {
  region: Region;
  token: string;
}

export interface RegionalTokenWithValidity extends RegionalToken {
  valid: boolean;
}

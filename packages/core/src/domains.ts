import { Region } from './config/types';

export const DEFAULT_REGION = 'us';

let REDOCLY_DOMAIN = 'redocly.com';

export function getDomains() {
  const domains: { [region in Region]: string } = {
    us: 'redocly.com',
    eu: 'eu.redocly.com',
  };

  // FIXME: temporary fix for our lab environments
  const domain = REDOCLY_DOMAIN;
  if (domain?.endsWith('.redocly.host')) {
    domains[domain.split('.')[0] as Region] = domain;
  }
  if (domain === 'redoc.online') {
    domains[domain as Region] = domain;
  }
  return domains;
}

export function setRedoclyDomain(domain: string) {
  REDOCLY_DOMAIN = domain;
}

export function getRedoclyDomain(): string {
  return REDOCLY_DOMAIN;
}

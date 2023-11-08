import { env } from '../../env';

const DEFAULT_DOMAIN = 'https://app.beta.redocly.com';

export function getDomain(): string {
  if (env.REDOCLY_DOMAIN) {
    return env.REDOCLY_DOMAIN;
  }

  return DEFAULT_DOMAIN;
}

import { type Config } from '@redocly/openapi-core';

export const REUNITE_URLS = {
  us: 'https://app.cloud.redocly.com',
  eu: 'https://app.cloud.eu.redocly.com',
} as const;

export function getDomain(): string {
  return process.env.REDOCLY_DOMAIN || REUNITE_URLS.us;
}

export function getReuniteUrl(config: Config | undefined, residencyOption?: string): string {
  try {
    const residency = residencyOption || config?.resolvedConfig.residency;

    if (isLegacyResidency(residency)) {
      return REUNITE_URLS[residency];
    }

    if (residency) {
      return new URL(residency).origin;
    }

    if (config?.resolvedConfig.reunite?.projectUrl) {
      return new URL(config.resolvedConfig.reunite.projectUrl).origin;
    }

    return REUNITE_URLS.us;
  } catch {
    throw new Error('Invalid Reunite URL');
  }
}

function isLegacyResidency(value: unknown): value is keyof typeof REUNITE_URLS {
  return typeof value === 'string' && value in REUNITE_URLS;
}

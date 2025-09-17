import { type Config } from '@redocly/openapi-core';

export const REUNITE_URLS = {
  us: 'https://app.cloud.redocly.com',
  eu: 'https://app.cloud.eu.redocly.com',
} as const;

export function getDomain(): string {
  return process.env.REDOCLY_DOMAIN || REUNITE_URLS.us;
}

export const getReuniteUrl = withHttpsValidation(
  (config: Config | undefined, residencyOption?: string): string => {
    try {
      const residency = residencyOption || config?.resolvedConfig.residency;

      if (isLegacyResidency(residency)) {
        return REUNITE_URLS[residency];
      }

      if (residency) {
        return new URL(residency).origin;
      }

      if (config?.resolvedConfig.scorecard?.fromProjectUrl) {
        return new URL(config.resolvedConfig.scorecard.fromProjectUrl).origin;
      }

      return REUNITE_URLS.us;
    } catch {
      throw new InvalidReuniteUrlError();
    }
  }
);

export function isValidReuniteUrl(reuniteUrl: string): boolean {
  try {
    getReuniteUrl(undefined, reuniteUrl);
  } catch {
    return false;
  }

  return true;
}

function withHttpsValidation<Fn extends (...args: any[]) => string>(fn: Fn) {
  return (...args: Parameters<Fn>) => {
    const url = fn(...args);

    if (!url.startsWith('https://')) {
      throw new InvalidReuniteUrlError();
    }

    return url;
  };
}

export class InvalidReuniteUrlError extends Error {
  constructor() {
    super('Invalid Reunite URL');
  }
}

function isLegacyResidency(value: unknown): value is keyof typeof REUNITE_URLS {
  return typeof value === 'string' && value in REUNITE_URLS;
}

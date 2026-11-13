import { type Config } from '@redocly/openapi-core';

const LOCALHOST_URL_PATTERN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export const PLATFORM_URLS = {
  us: 'https://app.cloud.redocly.com',
  eu: 'https://app.cloud.eu.redocly.com',
} as const;

export function getDomain(): string {
  return process.env.REDOCLY_DOMAIN || PLATFORM_URLS.us;
}

export const getPlatformUrl = withHttpsValidation(
  (config: Config | undefined, residencyOption?: string): string => {
    try {
      const residency = residencyOption || config?.resolvedConfig.residency;

      if (isLegacyResidency(residency)) {
        return PLATFORM_URLS[residency];
      }

      if (residency) {
        return new URL(residency).origin;
      }

      if (config?.resolvedConfig.scorecard?.fromProjectUrl) {
        return new URL(config.resolvedConfig.scorecard.fromProjectUrl).origin;
      }

      return PLATFORM_URLS.us;
    } catch {
      throw new InvalidPlatformUrlError();
    }
  }
);

export function isValidPlatformUrl(platformUrl: string): boolean {
  try {
    getPlatformUrl(undefined, platformUrl);
  } catch {
    return false;
  }

  return true;
}

function withHttpsValidation<Fn extends (...args: any[]) => string>(fn: Fn) {
  return (...args: Parameters<Fn>) => {
    const url = fn(...args);

    if (!url.startsWith('https://') && !LOCALHOST_URL_PATTERN.test(url)) {
      throw new InvalidPlatformUrlError();
    }

    return url;
  };
}

export class InvalidPlatformUrlError extends Error {
  constructor() {
    super('Invalid Redocly platform URL');
  }
}

function isLegacyResidency(value: unknown): value is keyof typeof PLATFORM_URLS {
  return typeof value === 'string' && value in PLATFORM_URLS;
}

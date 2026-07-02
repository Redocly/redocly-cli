const ALLOWED_DOMAIN_SUFFIX = '.redocly.com';

export function isAllowedScorecardProjectUrl(urlString: string): boolean {
  try {
    const hostname = new URL(urlString).hostname.toLowerCase();
    return hostname.endsWith(ALLOWED_DOMAIN_SUFFIX);
  } catch {
    return false;
  }
}

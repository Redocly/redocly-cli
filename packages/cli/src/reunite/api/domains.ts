export const REUNITE_URLS = {
  us: 'https://app.cloud.redocly.com',
  eu: 'https://app.cloud.eu.redocly.com',
} as const;

export function getDomain(): string {
  return process.env.REDOCLY_DOMAIN || REUNITE_URLS.us;
}

export function getReuniteUrl(residency: string = 'us') {
  const reuniteUrl: string = REUNITE_URLS[residency as keyof typeof REUNITE_URLS] || residency;
  const url = new URL('/api', reuniteUrl).toString();
  return url;
}

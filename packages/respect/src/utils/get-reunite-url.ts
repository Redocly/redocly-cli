const reuniteUrls = {
  us: 'https://app.cloud.redocly.com',
  eu: 'https://app.cloud.eu.redocly.com',
} as const;

export function getReuniteUrl(residency?: string) {
  if (!residency) residency = 'us';

  let reuniteUrl: string = reuniteUrls[residency as keyof typeof reuniteUrls];

  if (!reuniteUrl) {
    reuniteUrl = residency;
  }

  const url = new URL('/api', reuniteUrl).toString();
  return url;
}

import { RedoclyOAuthClient } from '../utils/oauth';
import { env } from '../utils/env';
import { getReuniteUrl } from '../utils/get-reunite-url';

const client = new RedoclyOAuthClient('spot');

export async function requireLogin(residency: string) {
  const apiKey = env().REDOCLY_API_KEY;

  const reuniteUrl = getReuniteUrl(residency);
  const isAuthorized = await client.isAuthorized(reuniteUrl, apiKey);
  if (isAuthorized) {
    return;
  }

  if (apiKey) {
    throw new Error('Invalid API key');
  }

  await client.login(reuniteUrl);
}

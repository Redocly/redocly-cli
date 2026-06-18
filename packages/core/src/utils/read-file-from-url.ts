import picomatch from 'picomatch';

import type { HttpResolveConfig, ResolveHeader } from '../config/index.js';
import { env } from '../env.js';

const MAX_REDIRECTS = 20;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export async function readFileFromUrl(url: string, config: HttpResolveConfig) {
  const fetchFn = config.customFetch || fetch;
  let currentUrl = url;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const response = await fetchFn(currentUrl, {
      headers: getMatchingHeaders(currentUrl, config.headers),
      redirect: 'manual',
    });

    if (!REDIRECT_STATUSES.has(response.status)) {
      if (!response.ok) {
        throw new Error(`Failed to load ${currentUrl}: ${response.status} ${response.statusText}`);
      }
      return { body: await response.text(), mimeType: response.headers.get('content-type') };
    }

    const location = response.headers.get('location');
    if (!location) {
      throw new Error(
        `Failed to load ${currentUrl}: redirect response is missing a Location header`
      );
    }
    currentUrl = new URL(location, currentUrl).href;
  }

  throw new Error(`Failed to load ${url}: too many redirects`);
}

function getMatchingHeaders(url: string, headers: ResolveHeader[]) {
  const result: Record<string, string> = {};
  for (const header of headers) {
    if (match(url, header.matches)) {
      result[header.name] =
        header.envVariable !== undefined ? env[header.envVariable] || '' : header.value;
    }
  }
  return result;
}

function match(url: string, pattern: string) {
  if (!pattern.match(/^https?:\/\//)) {
    // if pattern doesn't specify protocol directly, do not match against it
    url = url.replace(/^https?:\/\//, '');
  }
  return picomatch.isMatch(url, pattern);
}

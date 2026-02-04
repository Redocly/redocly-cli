import picomatch from 'picomatch';

import { env } from '../env.js';

import type { HttpResolveConfig } from '../config';

export async function readFileFromUrl(url: string, config: HttpResolveConfig) {
  const headers: Record<string, string> = {};
  for (const header of config.headers) {
    if (match(url, header.matches)) {
      headers[header.name] =
        header.envVariable !== undefined ? env[header.envVariable] || '' : header.value;
    }
  }

  const req = await (config.customFetch || fetch)(url, {
    headers: headers,
  });

  if (!req.ok) {
    throw new Error(`Failed to load ${url}: ${req.status} ${req.statusText}`);
  }

  return { body: await req.text(), mimeType: req.headers.get('content-type') };
}

function match(url: string, pattern: string) {
  if (!pattern.match(/^https?:\/\//)) {
    // if pattern doesn't specify protocol directly, do not match against it
    url = url.replace(/^https?:\/\//, '');
  }
  return picomatch.isMatch(url, pattern);
}

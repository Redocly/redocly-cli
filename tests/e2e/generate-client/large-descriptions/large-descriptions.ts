import { generateClient } from '@redocly/client-generator';
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const LARGE_DESCRIPTION_TIMEOUT = 300_000;

export const rebillyDescription = join(
  __dirname,
  '../../../smoke/rebilly/rebilly-description.yaml'
);

/** Pinned commit of github/rest-api-description; bump deliberately. CI caches by this file. */
const GITHUB_DESCRIPTION_SHA = '5e28810649ba41b5483753ba74f976f83856a504';

const cacheDir = join(__dirname, '.cache');

/** Download `api.github.com.json` at the pinned SHA once; later runs hit the cache. */
export async function fetchGithubDescription(): Promise<string> {
  const cached = join(cacheDir, `api.github.com-${GITHUB_DESCRIPTION_SHA.slice(0, 12)}.json`);
  if (existsSync(cached)) {
    return cached;
  }
  const url = `https://raw.githubusercontent.com/github/rest-api-description/${GITHUB_DESCRIPTION_SHA}/descriptions/api.github.com/api.github.com.json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }
  mkdirSync(cacheDir, { recursive: true });
  // The language files can download at the same time, so write to a private name first.
  const partial = `${cached}.${process.pid}.partial`;
  writeFileSync(partial, Buffer.from(await response.arrayBuffer()));
  renameSync(partial, cached);
  return cached;
}

/** Copy the consumer folder (package.json, go.mod, tsconfig.cli.json) and generate into it. */
export async function generateWith(generators: string[], description: string): Promise<string> {
  const dir = copyConsumer(join(__dirname, 'consumer'));
  await generateClient({ api: description, output: join(dir, 'client.ts'), generators });
  return dir;
}

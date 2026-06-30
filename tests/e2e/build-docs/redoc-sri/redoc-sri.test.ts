/**
 * @vitest-environment jsdom
 */
import { createHash } from 'node:crypto';
import { readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams } from '../../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

test('build-docs embeds an integrity hash matching the redoc bundle on the CDN', async () => {
  rmSync(join(__dirname, 'redoc-static.html'), { force: true });

  // run build-docs to generate redoc-static.html, which should contain a <script> tag with an integrity attribute
  getCommandOutput(getParams(indexEntryPoint, ['build-docs', 'openapi.yaml']), {
    testPath: __dirname,
  });

  const html = readFileSync(join(__dirname, 'redoc-static.html'), 'utf8');

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const script = doc.querySelector('script[src$="redoc.standalone.js"]');
  expect(script, 'build-docs did not emit an integrity-protected redoc <script>').not.toBeNull();

  const src = script!.getAttribute('src')!;
  const integrity = script!.getAttribute('integrity')!;

  const response = await fetch(src);
  expect(response.ok, `Could not fetch ${src} (HTTP ${response.status})`).toBe(true);

  const bytes = Buffer.from(await response.arrayBuffer());
  const fetchedHash = `sha384-${createHash('sha384').update(bytes).digest('base64')}`;

  expect(
    fetchedHash,
    `The redoc bundle at ${src} hashes to ${fetchedHash}, but build-docs embedded ${integrity}. ` +
      `If you bumped redoc, recompute redocStandaloneSri in packages/cli/src/utils/package.ts.`
  ).toBe(integrity);
}, 100_000);

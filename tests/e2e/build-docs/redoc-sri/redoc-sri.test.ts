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

test('build-docs preloads the redoc bundle with an integrity hash matching the CDN', async () => {
  rmSync(join(__dirname, 'redoc-static.html'), { force: true });

  getCommandOutput(getParams(indexEntryPoint, ['build-docs', 'openapi.yaml']), {
    testPath: __dirname,
  });

  const html = readFileSync(join(__dirname, 'redoc-static.html'), 'utf8');

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const link = doc.querySelector('link[rel="modulepreload"][href$="redoc.standalone.js"]');
  expect(link, 'build-docs did not emit an integrity-protected redoc preload').not.toBeNull();

  const href = link!.getAttribute('href')!;
  const integrity = link!.getAttribute('integrity')!;
  expect(html, 'the page imports redoc from a URL other than the preloaded one').toContain(
    `import { hydrate } from "${href}"`
  );

  const response = await fetch(href);
  expect(response.ok, `Could not fetch ${href} (HTTP ${response.status})`).toBe(true);

  const bytes = Buffer.from(await response.arrayBuffer());
  const fetchedHash = `sha384-${createHash('sha384').update(bytes).digest('base64')}`;

  expect(
    fetchedHash,
    `The redoc bundle at ${href} hashes to ${fetchedHash}, but build-docs embedded ${integrity}. ` +
      `The CDN copy must stay byte-identical to the npm package.`
  ).toBe(integrity);
}, 100_000);

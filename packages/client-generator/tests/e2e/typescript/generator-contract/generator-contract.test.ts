// `tanstack-query` skips the operations it cannot wrap, reports them, and still emits a
// module that compiles together with the sdk.
import { generateClient } from '@redocly/client-generator';
import { logger } from '@redocly/openapi-core';
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expectStrictTscPasses, repoRoot } from '../../helpers/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const generators = ['typescript', 'tanstack-query'];

describe('tanstack-query skips operations it cannot wrap', () => {
  let dir = '';
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'generator-contract-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('skips SSE operations, reports them, and still emits the rest', async () => {
    const warn = vi.spyOn(logger, 'warn');
    await generateClient({
      api: join(__dirname, '../../fixtures/sse.yaml'),
      output: join(dir, 'client.ts'),
      generators,
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/tanstack-query skipped \d+ server-sent-events operation/)
    );
    const tanstack = readFileSync(join(dir, 'client.tanstack.ts'), 'utf-8');
    expect(tanstack).toContain('getHealthOptions');
    expect(tanstack).not.toContain('streamMessages');
  });

  it('skips an op whose <Op>Variables collides with a schema; the tree still compiles', async () => {
    // The `GetUserVariables` schema collides with the variables alias of the `getUser` operation.
    const warn = vi.spyOn(logger, 'warn');
    await generateClient({
      api: join(__dirname, 'openapi.yaml'),
      output: join(dir, 'client.ts'),
      generators,
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(
        /tanstack-query skipped \d+ operation\(s\) whose variables type name collides/
      )
    );
    const tanstack = readFileSync(join(dir, 'client.tanstack.ts'), 'utf-8');
    expect(tanstack).not.toContain('getUserOptions');
    expect(tanstack).toContain('listUsersOptions');

    // The module must not import the suppressed alias. The link to node_modules lets tsc
    // resolve `@tanstack/react-query`.
    symlinkSync(join(repoRoot, 'node_modules'), join(dir, 'node_modules'), 'dir');
    expectStrictTscPasses(dir);
  });
});

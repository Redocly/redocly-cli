import { generateClient } from '@redocly/client-generator';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, expectTscPasses } from '../../helpers/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('generate-client swr generator', () => {
  let dir = '';

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('emits a *.swr.ts module that strict-tsc-checks against real swr and composes with the sdk', async () => {
    dir = copyConsumer(join(__dirname, 'consumer'));
    const out = join(dir, 'client.ts');
    const swrOut = join(dir, 'client.swr.ts');

    await generateClient({
      api: join(__dirname, '../../fixtures', 'base.yaml'),
      output: out,
      generators: ['typescript', 'swr'],
    });

    // Both the sdk client and the standalone swr module are produced.
    expect(existsSync(out)).toBe(true);
    expect(existsSync(swrOut)).toBe(true);

    const source = readFileSync(swrOut, 'utf-8');
    expect(source).toContain('import useSWR from "swr"');
    expect(source).toContain('import useSWRMutation from "swr/mutation"');
    // A GET op (path param) → key factory + useSWR hook.
    expect(source).toContain('export const getPetByIdKey');
    expect(source).toContain('export function useGetPetById');
    expect(source).toContain('useSWR(');
    // A POST op → useSWRMutation hook.
    expect(source).toContain('export function useCreatePet');
    expect(source).toContain('useSWRMutation(');

    // strict-tsc (consumer/tsconfig.json) the emitted swr module against REAL swr,
    // plus the generated sdk client. The hooks are React hooks; type-checking the
    // module proves the emitted useSWR/useSWRMutation calls match swr's real API.
    expectTscPasses(['--noEmit', '-p', dir]);
  });
});

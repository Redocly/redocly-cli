import { createConfig, HandledError } from '@redocly/openapi-core';
import { join } from 'node:path';

import { handlerBuildCommand } from '../../commands/build-docs/index.js';
import { getPageHTML } from '../../commands/build-docs/utils.js';

vi.mock('../../commands/build-docs/utils.js', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getPageHTML: vi.fn(),
}));

describe('handlerBuildCommand', () => {
  const api = join(process.cwd(), 'tests/e2e/build-docs/simple-build-docs/pets.yaml');
  const run = async () =>
    handlerBuildCommand({
      argv: { api, o: 'redoc-static.html' } as any,
      config: await createConfig({}),
      version: 'test',
      collectSpecData: () => {},
      collectResults: { push: () => {} } as any,
    } as any);

  it('keeps the stack trace of an unexpected renderer error', async () => {
    const bug = new TypeError('u?.match is not a function');
    vi.mocked(getPageHTML).mockRejectedValueOnce(bug);

    await expect(run()).rejects.toBe(bug);
  });

  it('reports other prerender failures as handled errors', async () => {
    vi.mocked(getPageHTML).mockRejectedValueOnce(new Error('Invalid reference token: FundingCode'));

    await expect(run()).rejects.toThrow(HandledError);
  });
});

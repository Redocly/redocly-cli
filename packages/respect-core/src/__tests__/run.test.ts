import { BaseResolver, createConfig, logger } from '@redocly/openapi-core';

import * as flowRunner from '../modules/flow-runner/index.js';
import type * as loggerOutput from '../modules/logger-output/index.js';
import { run } from '../run.js';

vi.mock('../modules/flow-runner/index.js', () => ({
  runTestFile: vi.fn(),
}));

vi.mock('../modules/logger-output/index.js', async () => {
  const actual = await vi.importActual<typeof loggerOutput>('../modules/logger-output/index.js');
  return {
    ...actual,
    displayErrors: vi.fn(),
    displaySummary: vi.fn(),
  };
});

describe('run', () => {
  const defaultRunResult = {
    executedWorkflows: [],
    ctx: { noSecretsMasking: false, secretsSet: new Set() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(flowRunner.runTestFile).mockResolvedValue(defaultRunResult as any);
  });

  it('clears the externalRefResolver cache between file runs so mutated parsed docs do not leak into the next file', async () => {
    const config = await createConfig({});
    const externalRefResolver = new BaseResolver(config.resolve);

    externalRefResolver.cache.set('/seeded/before/run.yaml', Promise.resolve({} as any));

    const seenCacheSizes: number[] = [];
    vi.mocked(flowRunner.runTestFile).mockImplementation(async ({ options }) => {
      seenCacheSizes.push(options.externalRefResolver?.cache.size ?? -1);
      options.externalRefResolver?.cache.set(`/leaked/${options.file}`, Promise.resolve({} as any));
      return defaultRunResult as any;
    });

    await run({
      files: ['a.arazzo.yaml', 'b.arazzo.yaml', 'c.arazzo.yaml'],
      config,
      maxSteps: 2000,
      maxFetchTimeout: 40_000,
      requestFileLoader: { getFileBody: async () => new Blob() },
      logger,
      fetch,
      externalRefResolver,
    });

    expect(seenCacheSizes).toEqual([0, 0, 0]);
  });

  it('does not throw when externalRefResolver is not provided', async () => {
    const config = await createConfig({});

    await expect(
      run({
        files: ['a.arazzo.yaml'],
        config,
        maxSteps: 2000,
        maxFetchTimeout: 40_000,
        requestFileLoader: { getFileBody: async () => new Blob() },
        logger,
        fetch,
      })
    ).resolves.toBeDefined();
  });
});

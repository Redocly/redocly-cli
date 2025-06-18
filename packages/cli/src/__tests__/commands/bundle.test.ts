import {
  bundle,
  getTotals,
  logger,
  getGovernanceConfig,
  type Config,
  type NormalizedGovernanceConfig,
  type ResolvedApi,
} from '@redocly/openapi-core';
import { type ResolveConfig } from '@redocly/openapi-core/lib/config/types.js';
import { type BundleOptions, handleBundle } from '../../commands/bundle.js';
import {
  dumpBundle,
  getFallbackApisOrExit,
  getOutputFileName,
  handleError,
  loadConfigAndHandleErrors,
  saveBundle,
} from '../../utils/miscellaneous.js';
import { commandWrapper } from '../../wrapper.js';
import { configFixture } from '../fixtures/config.js';
import { type MockInstance } from 'vitest';
import { type Arguments } from 'yargs';

describe('bundle', () => {
  let processExitMock: MockInstance;
  let exitCb: any;
  beforeEach(async () => {
    processExitMock = vi.spyOn(process, 'exit').mockImplementation(vi.fn() as any);
    vi.spyOn(process, 'once').mockImplementation((_e, cb) => {
      exitCb = cb;
      return process.on(_e, cb);
    });

    vi.mock('@redocly/openapi-core');
    vi.mocked(bundle).mockImplementation(
      async (): Promise<any> => ({
        bundle: { parsed: null },
        problems: null,
      })
    );
    // Unmock getGovernanceConfig
    const { getGovernanceConfig: originalGetGovernanceConfig } = await vi.importActual<
      typeof import('@redocly/openapi-core')
    >('@redocly/openapi-core');
    vi.mocked(getGovernanceConfig).mockImplementation(originalGetGovernanceConfig);

    vi.mock('../../utils/miscellaneous.js');
    vi.mocked(loadConfigAndHandleErrors).mockResolvedValue(configFixture);
    vi.mocked(getFallbackApisOrExit).mockImplementation(
      async (entrypoints) => entrypoints?.map((path: string) => ({ path })) ?? []
    );
    vi.mocked(dumpBundle).mockImplementation(() => '');
    vi.mocked(getOutputFileName).mockImplementation(
      ((await vi.importActual('../../utils/miscellaneous.js')) as any).getOutputFileName
    );
  });

  it('bundles definitions', async () => {
    const apis = ['foo.yaml', 'bar.yaml'];

    await commandWrapper(handleBundle)({
      apis,
      ext: 'yaml',
    } as Arguments<BundleOptions>);

    expect(bundle).toBeCalledTimes(apis.length);
  });

  it('exits with code 0 when bundles definitions', async () => {
    const apis = ['foo.yaml', 'bar.yaml', 'foobar.yaml'];

    await commandWrapper(handleBundle)({
      apis,
      ext: 'yaml',
    } as Arguments<BundleOptions>);

    await exitCb?.();
    expect(processExitMock).toHaveBeenCalledWith(0);
  });

  it('exits with code 0 when bundles definitions w/o errors', async () => {
    const apis = ['foo.yaml', 'bar.yaml', 'foobar.yaml'];

    await commandWrapper(handleBundle)({
      apis,
      ext: 'yaml',
    } as Arguments<BundleOptions>);

    await exitCb?.();
    expect(processExitMock).toHaveBeenCalledWith(0);
  });

  it('exits with code 1 when bundles definitions w/errors', async () => {
    const apis = ['foo.yaml'];

    vi.mocked(getTotals).mockReturnValue({
      errors: 1,
      warnings: 0,
      ignored: 0,
    });

    await commandWrapper(handleBundle)({
      apis,
      ext: 'yaml',
    } as Arguments<BundleOptions>);

    await exitCb?.();
    expect(processExitMock).toHaveBeenCalledWith(1);
  });

  it('handleError is called when bundles an invalid definition', async () => {
    const apis = ['invalid.json'];

    vi.mocked(bundle).mockImplementationOnce(() => {
      throw new Error('Invalid definition');
    });

    await commandWrapper(handleBundle)({
      apis,
      ext: 'json',
    } as Arguments<BundleOptions>);

    expect(handleError).toHaveBeenCalledTimes(1);
    expect(handleError).toHaveBeenCalledWith(new Error('Invalid definition'), 'invalid.json');
  });

  it("handleError isn't called when bundles a valid definition", async () => {
    const apis = ['foo.yaml'];

    vi.mocked(getTotals).mockReturnValue({
      errors: 0,
      warnings: 0,
      ignored: 0,
    });

    await commandWrapper(handleBundle)({
      apis,
      ext: 'yaml',
    } as Arguments<BundleOptions>);

    expect(handleError).toHaveBeenCalledTimes(0);
  });

  describe('per api output', () => {
    it('should store bundled API descriptions in the output files described in the apis section of config IF no positional apis provided AND output is specified for both apis', async () => {
      const apis = {
        foo: {
          root: 'foo.yaml',
          output: 'output/foo.yaml',
        } as ResolvedApi,
        bar: {
          root: 'bar.yaml',
          output: 'output/bar.json',
        } as ResolvedApi,
      };
      const config: Config = {
        resolvedConfig: { apis: apis },
        _governance: {
          apis: {
            foo: {
              skipPreprocessors: vi.fn(),
              skipDecorators: vi.fn(),
            } as Partial<NormalizedGovernanceConfig> as NormalizedGovernanceConfig,
            bar: {
              skipPreprocessors: vi.fn(),
              skipDecorators: vi.fn(),
            } as Partial<NormalizedGovernanceConfig> as NormalizedGovernanceConfig,
          },
          root: {
            skipPreprocessors: vi.fn(),
            skipDecorators: vi.fn(),
          } as Partial<NormalizedGovernanceConfig> as NormalizedGovernanceConfig,
        },
        resolve: {} as ResolveConfig,
      };

      vi.mocked(getFallbackApisOrExit).mockResolvedValueOnce(
        Object.entries(apis).map(([alias, { root, ...api }]) => ({ ...api, path: root, alias }))
      );
      vi.mocked(getTotals).mockReturnValue({
        errors: 0,
        warnings: 0,
        ignored: 0,
      });

      await handleBundle({
        argv: { apis: [] }, // positional
        version: 'test',
        config,
      });

      expect(saveBundle).toBeCalledTimes(2);
      expect(saveBundle).toHaveBeenNthCalledWith(1, 'output/foo.yaml', expect.any(String));
      expect(saveBundle).toHaveBeenNthCalledWith(2, 'output/bar.json', expect.any(String));
    });

    it('should store bundled API descriptions in the output files described in the apis section of config AND print the bundled api without the output specified to the terminal IF no positional apis provided AND output is specified for one api', async () => {
      const apis = {
        foo: {
          root: 'foo.yaml',
          output: 'output/foo.yaml',
        } as ResolvedApi,
        bar: {
          root: 'bar.yaml',
        } as ResolvedApi,
      };
      const config: Config = {
        resolvedConfig: { apis },
        _governance: {
          apis: {
            foo: {
              skipPreprocessors: vi.fn(),
              skipDecorators: vi.fn(),
            } as Partial<NormalizedGovernanceConfig> as NormalizedGovernanceConfig,
            bar: {
              skipPreprocessors: vi.fn(),
              skipDecorators: vi.fn(),
            } as Partial<NormalizedGovernanceConfig> as NormalizedGovernanceConfig,
          },
          root: {
            skipPreprocessors: vi.fn(),
            skipDecorators: vi.fn(),
          } as Partial<NormalizedGovernanceConfig> as NormalizedGovernanceConfig,
        },
        resolve: {} as ResolveConfig,
      };

      vi.mocked(getFallbackApisOrExit).mockResolvedValueOnce(
        Object.entries(apis).map(([alias, { root, ...api }]) => ({ ...api, path: root, alias }))
      );
      vi.mocked(getTotals).mockReturnValue({
        errors: 0,
        warnings: 0,
        ignored: 0,
      });

      await handleBundle({
        argv: { apis: [] }, // positional
        version: 'test',
        config,
      });

      expect(saveBundle).toBeCalledTimes(1);
      expect(saveBundle).toHaveBeenCalledWith('output/foo.yaml', expect.any(String));
      expect(logger.output).toHaveBeenCalledTimes(1);
    });

    it('should NOT store bundled API descriptions in the output files described in the apis section of config IF there is a positional api provided', async () => {
      const apis = {
        foo: {
          root: 'foo.yaml',
          output: 'output/foo.yaml',
        } as ResolvedApi,
      };
      const config: Config = {
        resolvedConfig: { apis },
        _governance: {
          apis: {
            foo: {
              skipPreprocessors: vi.fn(),
              skipDecorators: vi.fn(),
            } as Partial<NormalizedGovernanceConfig> as NormalizedGovernanceConfig,
          },
          root: {
            skipPreprocessors: vi.fn(),
            skipDecorators: vi.fn(),
          } as Partial<NormalizedGovernanceConfig> as NormalizedGovernanceConfig,
        },
        resolve: {} as ResolveConfig,
      };

      vi.mocked(getFallbackApisOrExit).mockResolvedValueOnce([{ path: 'openapi.yaml' }]);
      vi.mocked(getTotals).mockReturnValue({
        errors: 0,
        warnings: 0,
        ignored: 0,
      });

      await handleBundle({
        argv: { apis: ['openapi.yaml'] }, // positional
        version: 'test',
        config,
      });

      expect(saveBundle).toBeCalledTimes(0);
      expect(logger.output).toHaveBeenCalledTimes(1);
    });

    it('should store bundled API descriptions in the directory specified in argv IF multiple positional apis provided AND --output specified', async () => {
      const apis = {
        foo: {
          root: 'foo.yaml',
          output: 'output/foo.yaml',
        } as ResolvedApi,
        bar: {
          root: 'bar.yaml',
          output: 'output/bar.json',
        } as ResolvedApi,
      };
      const config: Config = {
        resolvedConfig: { apis },
        _governance: {
          apis: {
            foo: {
              skipPreprocessors: vi.fn(),
              skipDecorators: vi.fn(),
            } as Partial<NormalizedGovernanceConfig> as NormalizedGovernanceConfig,
            bar: {
              skipPreprocessors: vi.fn(),
              skipDecorators: vi.fn(),
            } as Partial<NormalizedGovernanceConfig> as NormalizedGovernanceConfig,
          },
          root: {
            skipPreprocessors: vi.fn(),
            skipDecorators: vi.fn(),
          } as Partial<NormalizedGovernanceConfig> as NormalizedGovernanceConfig,
        },
        resolve: {} as ResolveConfig,
      };

      vi.mocked(getFallbackApisOrExit).mockResolvedValueOnce(
        Object.entries(apis).map(([alias, { root, ...api }]) => ({ ...api, path: root, alias }))
      );
      vi.mocked(getTotals).mockReturnValue({
        errors: 0,
        warnings: 0,
        ignored: 0,
      });

      await handleBundle({
        argv: { apis: ['foo.yaml', 'bar.yaml'], output: 'dist' }, // cli options
        version: 'test',
        config,
      });

      expect(saveBundle).toBeCalledTimes(2);
      expect(saveBundle).toHaveBeenNthCalledWith(1, 'dist/foo.yaml', expect.any(String));
      expect(saveBundle).toHaveBeenNthCalledWith(2, 'dist/bar.yaml', expect.any(String));
    });
  });
});

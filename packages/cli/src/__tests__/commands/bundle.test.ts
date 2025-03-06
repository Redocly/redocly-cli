import { bundle, getTotals, getMergedConfig, Config } from '@redocly/openapi-core';

import { BundleOptions, handleBundle } from '../../commands/bundle';
import {
  getFallbackApisOrExit,
  getOutputFileName,
  handleError,
  saveBundle,
} from '../../utils/miscellaneous';
import { commandWrapper } from '../../wrapper';
import type { Arguments } from 'yargs';
import type { SpyInstance, Mock } from 'vitest';

vi.mock('@redocly/openapi-core');
vi.mock('../../utils/miscellaneous');

// @ts-ignore
getOutputFileName = vi.importActual('../../utils/miscellaneous').getOutputFileName;

(getMergedConfig as Mock).mockImplementation((config) => config);

describe('bundle', () => {
  let processExitMock: SpyInstance;
  let exitCb: any;
  let stderrWriteMock: any;
  let stdoutWriteMock: any;
  beforeEach(() => {
    processExitMock = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never) as any; // FIXME: !
    vi.spyOn(process, 'once').mockImplementation((_e, cb) => {
      exitCb = cb;
      return process.on(_e, cb);
    });
    stderrWriteMock = vi.spyOn(process.stderr, 'write').mockImplementation(vi.fn());
    stdoutWriteMock = vi.spyOn(process.stdout, 'write').mockImplementation(vi.fn());
  });

  afterEach(() => {
    (bundle as Mock).mockClear();
    (getTotals as Mock).mockReset();
    stderrWriteMock.mockRestore();
    stdoutWriteMock.mockRestore();
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

    (getTotals as Mock).mockReturnValue({
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

    (bundle as Mock).mockImplementationOnce(() => {
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

    (getTotals as Mock).mockReturnValue({
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
        },
        bar: {
          root: 'bar.yaml',
          output: 'output/bar.json',
        },
      };
      const config = {
        apis,
        styleguide: {
          skipPreprocessors: vi.fn(),
          skipDecorators: vi.fn(),
        },
      } as unknown as Config;
      // @ts-ignore
      getFallbackApisOrExit = jest
        .fn()
        .mockResolvedValueOnce(
          Object.entries(apis).map(([alias, { root, ...api }]) => ({ ...api, path: root, alias }))
        );
      (getTotals as Mock).mockReturnValue({
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
        },
        bar: {
          root: 'bar.yaml',
        },
      };
      const config = {
        apis,
        styleguide: {
          skipPreprocessors: vi.fn(),
          skipDecorators: vi.fn(),
        },
      } as unknown as Config;
      // @ts-ignore
      getFallbackApisOrExit = jest
        .fn()
        .mockResolvedValueOnce(
          Object.entries(apis).map(([alias, { root, ...api }]) => ({ ...api, path: root, alias }))
        );
      (getTotals as Mock).mockReturnValue({
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
      expect(process.stdout.write).toHaveBeenCalledTimes(1);
    });

    it('should NOT store bundled API descriptions in the output files described in the apis section of config IF there is a positional api provided', async () => {
      const apis = {
        foo: {
          root: 'foo.yaml',
          output: 'output/foo.yaml',
        },
      };
      const config = {
        apis,
        styleguide: {
          skipPreprocessors: vi.fn(),
          skipDecorators: vi.fn(),
        },
      } as unknown as Config;
      // @ts-ignore
      getFallbackApisOrExit = vi.fn().mockResolvedValueOnce([{ path: 'openapi.yaml' }]);
      (getTotals as Mock).mockReturnValue({
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
      expect(process.stdout.write).toHaveBeenCalledTimes(1);
    });

    it('should store bundled API descriptions in the directory specified in argv IF multiple positional apis provided AND --output specified', async () => {
      const apis = {
        foo: {
          root: 'foo.yaml',
          output: 'output/foo.yaml',
        },
        bar: {
          root: 'bar.yaml',
          output: 'output/bar.json',
        },
      };
      const config = {
        apis,
        styleguide: {
          skipPreprocessors: vi.fn(),
          skipDecorators: vi.fn(),
        },
      } as unknown as Config;
      // @ts-ignore
      getFallbackApisOrExit = jest
        .fn()
        .mockResolvedValueOnce(
          Object.entries(apis).map(([alias, { root, ...api }]) => ({ ...api, path: root, alias }))
        );
      (getTotals as Mock).mockReturnValue({
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

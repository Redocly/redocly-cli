import { lint, bundle, getTotals, getMergedConfig } from '@redocly/openapi-core';

import { handleBundle } from '../../commands/bundle';
import SpyInstance = jest.SpyInstance;

jest.mock('@redocly/openapi-core');
jest.mock('../../utils');

(getMergedConfig as jest.Mock).mockImplementation(config => config)

describe('bundle', () => {
  let processExitMock: SpyInstance;
  let exitCb: any;

  beforeEach(() => {
    processExitMock = jest.spyOn(process, 'exit').mockImplementation();
    jest.spyOn(process, 'once').mockImplementation((_e, cb) => {
      exitCb = cb;
      return process.on(_e, cb);
    });
    jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    (lint as jest.Mock).mockClear();
    (bundle as jest.Mock).mockClear();
    (getTotals as jest.Mock).mockClear();
  });

  it('bundles definitions w/o linting', async () => {
    const entrypoints = ['foo.yaml', 'bar.yaml'];

    await handleBundle(
      {
        entrypoints,
        ext: 'yaml',
        format: 'codeframe',
      },
      '1.0.0',
    );

    expect(lint).toBeCalledTimes(0);
    expect(bundle).toBeCalledTimes(entrypoints.length);
  });

  it('exits with code 0 when bundles definitions', async () => {
    const entrypoints = ['foo.yaml', 'bar.yaml', 'foobar.yaml'];

    await handleBundle(
      {
        entrypoints,
        ext: 'yaml',
        format: 'codeframe',
      },
      '1.0.0',
    );

    exitCb?.();
    expect(processExitMock).toHaveBeenCalledWith(0);
  });

  it('bundles definitions w/ linting', async () => {
    const entrypoints = ['foo.yaml', 'bar.yaml', 'foobar.yaml'];

    await handleBundle(
      {
        entrypoints,
        ext: 'yaml',
        format: 'codeframe',
        lint: true,
      },
      '1.0.0',
    );

    expect(lint).toBeCalledTimes(entrypoints.length);
    expect(bundle).toBeCalledTimes(entrypoints.length);
  });

  it('exits with code 0 when bundles definitions w/linting w/o errors', async () => {
    const entrypoints = ['foo.yaml', 'bar.yaml', 'foobar.yaml'];

    await handleBundle(
      {
        entrypoints,
        ext: 'yaml',
        format: 'codeframe',
        lint: true,
      },
      '1.0.0',
    );

    exitCb?.();
    expect(processExitMock).toHaveBeenCalledWith(0);
  });

  it('exits with code 1 when bundles definitions w/linting w/errors', async () => {
    const entrypoints = ['foo.yaml'];

    (getTotals as jest.Mock).mockReturnValue({
      errors: 1,
      warnings: 0,
      ignored: 0
    });

    await handleBundle(
      {
        entrypoints,
        ext: 'yaml',
        format: 'codeframe',
        lint: true,
      },
      '1.0.0',
    );

    expect(lint).toBeCalledTimes(entrypoints.length);
    exitCb?.();
    expect(processExitMock).toHaveBeenCalledWith(1);
  });

});

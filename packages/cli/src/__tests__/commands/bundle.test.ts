import { lint, bundle, getTotals, getMergedConfig } from '@redocly/openapi-core';

import { BundleOptions, handleBundle } from '../../commands/bundle';
import { handleError } from '../../utils';
import { commandWrapper } from '../../wrapper';
import SpyInstance = jest.SpyInstance;
import { Arguments } from 'yargs';

jest.mock('@redocly/openapi-core');
jest.mock('../../utils');

(getMergedConfig as jest.Mock).mockImplementation((config) => config);

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
    (getTotals as jest.Mock).mockReset();
  });

  it('bundles definitions w/o linting', async () => {
    const apis = ['foo.yaml', 'bar.yaml'];

    await commandWrapper(handleBundle)({
      apis,
      ext: 'yaml',
      format: 'codeframe',
    } as Arguments<BundleOptions>);

    expect(lint).toBeCalledTimes(0);
    expect(bundle).toBeCalledTimes(apis.length);
  });

  it('exits with code 0 when bundles definitions', async () => {
    const apis = ['foo.yaml', 'bar.yaml', 'foobar.yaml'];

    await commandWrapper(handleBundle)({
      apis,
      ext: 'yaml',
      format: 'codeframe',
    } as Arguments<BundleOptions>);

    await exitCb?.();
    expect(processExitMock).toHaveBeenCalledWith(0);
  });

  it('bundles definitions w/ linting', async () => {
    const apis = ['foo.yaml', 'bar.yaml', 'foobar.yaml'];

    (getTotals as jest.Mock).mockReturnValue({
      errors: 0,
      warnings: 0,
      ignored: 0,
    });

    await commandWrapper(handleBundle)({
      apis,
      ext: 'yaml',
      format: 'codeframe',
      lint: true,
    } as Arguments<BundleOptions>);

    expect(lint).toBeCalledTimes(apis.length);
    expect(bundle).toBeCalledTimes(apis.length);
  });

  it('exits with code 0 when bundles definitions w/linting w/o errors', async () => {
    const apis = ['foo.yaml', 'bar.yaml', 'foobar.yaml'];

    await commandWrapper(handleBundle)({
      apis,
      ext: 'yaml',
      format: 'codeframe',
      lint: true,
    } as Arguments<BundleOptions>);

    await exitCb?.();
    expect(processExitMock).toHaveBeenCalledWith(0);
  });

  it('exits with code 1 when bundles definitions w/linting w/errors', async () => {
    const apis = ['foo.yaml'];

    (getTotals as jest.Mock).mockReturnValue({
      errors: 1,
      warnings: 0,
      ignored: 0,
    });

    await commandWrapper(handleBundle)({
      apis,
      ext: 'yaml',
      format: 'codeframe',
      lint: true,
    } as Arguments<BundleOptions>);

    expect(lint).toBeCalledTimes(apis.length);
    await exitCb?.();
    expect(processExitMock).toHaveBeenCalledWith(1);
  });

  it('handleError is called when bundles an invalid definition', async () => {
    const apis = ['invalid.json'];

    (bundle as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Invalid definition');
    });

    await commandWrapper(handleBundle)({
      apis,
      ext: 'json',
      format: 'codeframe',
      lint: false,
    } as Arguments<BundleOptions>);

    expect(handleError).toHaveBeenCalledTimes(1);
    expect(handleError).toHaveBeenCalledWith(new Error('Invalid definition'), 'invalid.json');
  });

  it("handleError isn't called when bundles a valid definition", async () => {
    const apis = ['foo.yaml'];

    (getTotals as jest.Mock).mockReturnValue({
      errors: 0,
      warnings: 0,
      ignored: 0,
    });

    await commandWrapper(handleBundle)({
      apis,
      ext: 'yaml',
      format: 'codeframe',
      lint: false,
    } as Arguments<BundleOptions>);

    expect(handleError).toHaveBeenCalledTimes(0);
  });
});

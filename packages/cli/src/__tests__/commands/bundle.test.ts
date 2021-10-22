import { lint, bundle } from '@redocly/openapi-core';

import { handleBundle } from '../../commands/bundle';
import SpyInstance = jest.SpyInstance;

jest.mock('@redocly/openapi-core');
jest.mock('../../utils');

describe('bundle', () => {
  let processExitMock: SpyInstance;

  beforeAll(() => {
    processExitMock = jest.spyOn(process, 'exit').mockImplementation();
    jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    (lint as jest.Mock).mockClear();
    (bundle as jest.Mock).mockClear();
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

    expect(processExitMock).toHaveBeenCalledWith(0);
  });

  it.skip('exits with code 1 when bundles definitions w/linting w/errors', async () => {
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

    expect(processExitMock).toHaveBeenCalledWith(1);
  });

});

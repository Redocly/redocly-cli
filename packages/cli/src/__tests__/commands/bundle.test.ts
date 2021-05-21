import { lint, bundle } from '@redocly/openapi-core';

import { handleBundle } from '../../commands/bundle';

jest.mock('@redocly/openapi-core');
jest.mock('../../utils');

describe('bundle', () => {
  beforeAll(() => {
    jest.spyOn(process, 'exit').mockImplementation();
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
});

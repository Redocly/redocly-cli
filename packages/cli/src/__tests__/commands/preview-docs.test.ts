import { loadConfig } from '@redocly/openapi-core';
import { previewDocs } from '../../commands/preview-docs';
import { Region } from '@redocly/openapi-core/lib/config/config';

jest.mock('../../utils');
jest.mock('@redocly/openapi-core');
jest.mock('../../commands/preview-docs/preview-server/preview-server');

describe('preview-docs', () => {
  it('uses a passed region to load a config', async () => {
    const passedRegion = 'some-region';

    (loadConfig as jest.Mock).mockClear();

    // otherwise setImmediate() causes UnhandledPromiseRejection on any test run
    jest.useFakeTimers();

    await previewDocs({
      region: (passedRegion as Region),
      entrypoint: 'foo.yaml',
      port: 8080,
    });

    expect(loadConfig).toHaveBeenCalledWith(expect.objectContaining({ region: passedRegion }));
  })
});

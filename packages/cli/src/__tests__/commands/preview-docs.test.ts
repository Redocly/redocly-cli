import { loadConfig } from '@redocly/openapi-core';
import { previewDocs } from '../../commands/preview-docs';
import startPreviewServer from '../../commands/preview-docs/preview-server/preview-server';

jest.mock('../../utils');
jest.mock('@redocly/openapi-core');
jest.mock('../../commands/preview-docs/preview-server/preview-server');

describe('preview-docs', () => {
  it('uses a passed region to load a config', async () => {
    const region = 'us';

    (loadConfig as jest.Mock).mockClear();

    // otherwise setImmediate() causes UnhandledPromiseRejection on any test run
    jest.useFakeTimers();

    await previewDocs({
      region,
      entrypoint: 'foo.yaml',
      port: 8080,
    });

    expect(loadConfig).toHaveBeenCalledWith(expect.objectContaining({ region }));
    expect(startPreviewServer).toHaveBeenCalled();
  })
});

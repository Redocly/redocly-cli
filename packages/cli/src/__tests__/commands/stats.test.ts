import { handleStats } from '../../commands/stats';
import { loadConfig } from '@redocly/openapi-core';
import { Region } from '@redocly/openapi-core/lib/config/config';

jest.mock('../../utils');
jest.mock('@redocly/openapi-core');

describe('stats', () => {
  it('uses a passed region to load a config', async () => {
    const passedRegion = 'some-region';

    (loadConfig as jest.Mock).mockClear();

    await handleStats({
      region: (passedRegion as Region),
      entrypoint: 'spec.yaml',
      format: 'stylish',
    });

    expect(loadConfig).toHaveBeenCalledWith(expect.objectContaining({ region: passedRegion }));
  });
});

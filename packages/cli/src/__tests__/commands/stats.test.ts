import { handleStats } from '../../commands/stats';
import { loadConfig } from '@redocly/openapi-core';

jest.mock('../../utils');
jest.mock('@redocly/openapi-core');

describe('stats', () => {
  it('uses a passed region to load a config', async () => {
    const region = 'us';

    (loadConfig as jest.Mock).mockClear();

    await handleStats({
      region,
      entrypoint: 'spec.yaml',
      format: 'stylish',
    });

    expect(loadConfig).toHaveBeenCalledWith(expect.objectContaining({ region }));
  });
});

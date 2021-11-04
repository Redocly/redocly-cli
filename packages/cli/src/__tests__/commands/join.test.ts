import { handleJoin } from '../../commands/join';
import { loadConfig } from '@redocly/openapi-core';

jest.mock('../../utils');
jest.mock('@redocly/openapi-core');

describe('join', () => {
  it('uses a passed region to load a config', async () => {
    const entrypoints = ['foo.yaml', 'bar.yaml'];
    const region = 'us';

    (loadConfig as jest.Mock).mockClear();

    await handleJoin({
      entrypoints,
      region,
    }, '');

    expect(loadConfig).toHaveBeenCalledWith(expect.objectContaining({ region }));
  })
});

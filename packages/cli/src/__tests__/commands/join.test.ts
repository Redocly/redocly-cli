import { handleJoin } from '../../commands/join';
import { loadConfig } from '@redocly/openapi-core';
import { Region } from '@redocly/openapi-core/lib/config/config';

jest.mock('../../utils');
jest.mock('@redocly/openapi-core');

describe('join', () => {
  it('uses a passed region to load a config', async () => {
    const entrypoints = ['foo.yaml', 'bar.yaml'];
    const passedRegion = 'some-region';

    (loadConfig as jest.Mock).mockClear();

    await handleJoin({
      entrypoints,
      region: (passedRegion as Region),
    }, '');

    expect(loadConfig).toHaveBeenCalledWith(expect.objectContaining({ region: passedRegion }));
  })
});

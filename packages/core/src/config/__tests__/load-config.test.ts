import { loadConfig } from '../load';
import { Config, resolveRedoclyDomain } from '../config';
import { RedoclyClient } from '../../redocly';

jest.mock('../config');
jest.mock('../../redocly');

describe('load config using a region', () => {
  it('should use the passed region to init redocly client and create a config', async () => {
    const region = 'us';
    const resolvedDomain = 'some-domain';

    (resolveRedoclyDomain as jest.Mock).mockReturnValue(resolvedDomain);

    await loadConfig({ region });

    expect(resolveRedoclyDomain).toBeCalledWith(region);
    expect(RedoclyClient).toBeCalledWith(resolvedDomain);
    expect(Config).toBeCalledWith(
      expect.objectContaining({ region }),
      undefined
    );
  });
});

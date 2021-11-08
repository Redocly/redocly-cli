import { loadConfig, RedoclyClient } from '@redocly/openapi-core';
import { handleLogin } from '../../commands/login';
import { promptUser } from '../../utils';
import { Region } from '@redocly/openapi-core/lib/config/config';

jest.mock('../../utils');
jest.mock('@redocly/openapi-core');

describe('login', () => {
  const redoclyDomain = 'some-domain';

  beforeEach(() => {
    (loadConfig as jest.Mock).mockClear().mockImplementationOnce(() => ({ redoclyDomain }));
  });

  it('uses a passed region to load a config', async () => {
    const passedRegion = 'some-region';

    await handleLogin({ region: (passedRegion as Region) });

    expect(loadConfig).toHaveBeenCalledWith(expect.objectContaining({ region: passedRegion }));
  });

  it('shows a profile link with domain taken from config', async () => {
    (promptUser as jest.Mock).mockClear();

    await handleLogin({});

    expect(promptUser).toHaveBeenCalledWith(
      expect.stringContaining(redoclyDomain),
      expect.anything(),
    );
  });

  it('log user in to domain taken from config', async () => {
    (RedoclyClient as jest.Mock).mockClear();

    await handleLogin({});

    expect(RedoclyClient).toHaveBeenCalledWith(redoclyDomain);
  });
});

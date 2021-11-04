import { loadConfig, RedoclyClient } from '@redocly/openapi-core';
import { handleLogin } from '../../commands/login';
import { promptUser } from '../../utils';

jest.mock('../../utils');
jest.mock('@redocly/openapi-core');

describe('login', () => {
  it('uses a passed region to load a config', async () => {
    const region = 'us';
    const redoclyDomain = 'some-domain';

    (loadConfig as jest.Mock).mockClear().mockImplementationOnce(() => ({ redoclyDomain }));

    await handleLogin({ region });

    expect(loadConfig).toHaveBeenCalledWith(expect.objectContaining({ region }));
  });

  it('shows a profile link with domain taken from config', async () => {
    const redoclyDomain = 'some-domain';

    (loadConfig as jest.Mock).mockClear().mockImplementationOnce(() => ({ redoclyDomain }));
    (promptUser as jest.Mock).mockClear();

    await handleLogin({});

    expect(promptUser).toHaveBeenCalledWith(
      expect.stringContaining(redoclyDomain),
      expect.anything(),
    );
  });

  it('log user it to domain taken from config', async () => {
    const redoclyDomain = 'some-domain';

    (loadConfig as jest.Mock).mockClear().mockImplementationOnce(() => ({ redoclyDomain }));
    (RedoclyClient as jest.Mock).mockClear();

    await handleLogin({});

    expect(RedoclyClient).toHaveBeenCalledWith(redoclyDomain);
  });
});

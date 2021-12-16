import { RedoclyClient } from '../src/redocly';

describe('login', () => {
  it('should call login with setAccessTokens function', async () => {
    const client = new RedoclyClient();
    Object.defineProperty(client, 'registryApi', {
      value: {
        setAccessTokens: jest.fn(),
        authStatus: jest.fn(() => true)
      },
      writable: true,
      configurable: true
    });
    await client.login('token');
    expect(client.registryApi.setAccessTokens).toHaveBeenCalled();
  });
});

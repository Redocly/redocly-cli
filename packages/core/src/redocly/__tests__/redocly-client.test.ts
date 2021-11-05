import { RedoclyClient } from '@redocly/openapi-core/src/redocly/index';
import { query } from '../query';

jest.mock('../query');

describe('RedoclyClient', () => {
  const redoclyDomain = 'some-redoly-domain';
  let redoclyClient: RedoclyClient;

  beforeEach(() => {
    (query as jest.Mock).mockClear();
    redoclyClient = new RedoclyClient(redoclyDomain);
  });

  it('login using a passed Redocly domain', async () => {
    await redoclyClient.login('accessToken');

    expect(query).toHaveBeenCalledWith(
      expect.anything(),
      redoclyDomain,
      expect.anything(),
      expect.anything(),
    );
  });

  it('receives auth header using a passed Redocly domain', async () => {
    await redoclyClient.getAuthorizationHeader();

    expect(query).toHaveBeenCalledWith(
      expect.anything(),
      redoclyDomain,
      expect.anything(),
      expect.anything(),
    );
  });
});

import { query } from '../query';
import fetch from 'node-fetch';

jest.mock('node-fetch');

describe('RedoclyClient', () => {
  const redoclyDomain = 'some-redoly-domain';

  beforeEach(() => {
    (fetch as unknown as jest.Mock).mockClear();
  })

  it('uses a passed redocly domain for graphql endpoint resolving', async () => {
    const graphQlEndpoint = `https://api.${redoclyDomain}/graphql`
    
    await query(
      'query',
      redoclyDomain
    );

    expect(fetch).toHaveBeenCalledWith(
      graphQlEndpoint,
      expect.anything(),
    );
  });

});

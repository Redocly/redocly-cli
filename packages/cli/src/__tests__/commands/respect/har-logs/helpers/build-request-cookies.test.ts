import { buildRequestCookies } from '../../../../../commands/respect/har-logs/helpers/build-request-cookies.js';

describe('buildRequestCookies', () => {
  it('should build cookies from an array', () => {
    const cookies = buildRequestCookies({ cookie: ['sessionId=1234567890'] });
    expect(cookies).toEqual([{ name: 'sessionId', value: '1234567890' }]);
  });

  it('should build cookies from an object', () => {
    const cookies = buildRequestCookies({ cookie: 'sessionId=1234567890' });
    expect(cookies).toEqual([{ name: 'sessionId', value: '1234567890' }]);
  });
});

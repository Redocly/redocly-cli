import { getInputUrl } from '../../../../../commands/respect/har-logs/helpers/get-input-url.js';

describe('getInputUrl', () => {
  it('should return a URL object', () => {
    const url = getInputUrl('https://example.com');
    expect(url).toBeInstanceOf(URL);
  });

  it('should return a URL object from an object', () => {
    const url = getInputUrl({ url: 'https://example.com' });
    expect(url).toBeInstanceOf(URL);
  });
});

import { combineUrl } from '../url.js';

describe('combineUrl', () => {
  it('should combine host and path', () => {
    expect(combineUrl('https://example.com', '/path')).toBe('https://example.com/path');
  });

  it('should combine host and path without double slashes', () => {
    expect(combineUrl('https://example.com/', '/path')).toBe('https://example.com/path');
  });

  it('should combine host and path without double slashes', () => {
    expect(combineUrl('https://example.com', 'path')).toBe('https://example.com/path');
  });

  it('should combine host and path without double slashes', () => {
    expect(combineUrl('https://example.com/', 'path')).toBe('https://example.com/path');
  });
});

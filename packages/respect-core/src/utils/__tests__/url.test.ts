import { combineUrl } from '../url.js';

describe('combineUrl', () => {
  it('should combine host and path', () => {
    expect(combineUrl('https://example.com', '/path')).toBe('https://example.com/path');
  });

  it('should combine host and path without double slashes', () => {
    expect(combineUrl('https://example.com/', '/path')).toBe('https://example.com/path');
  });

  it('should add a slash when neither host nor path has one', () => {
    expect(combineUrl('https://example.com', 'path')).toBe('https://example.com/path');
  });

  it('should keep one slash when only the host ends with a slash', () => {
    expect(combineUrl('https://example.com/', 'path')).toBe('https://example.com/path');
  });
});

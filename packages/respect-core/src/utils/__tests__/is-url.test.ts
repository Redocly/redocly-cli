import { isURL } from '../is-url';

describe('isURL', () => {
  it('should return true for valid urls', () => {
    expect(isURL('http://example.com')).toBe(true);
    expect(isURL('https://example.com')).toBe(true);
    expect(isURL('http://example.com/path')).toBe(true);
    expect(isURL('https://example.com/path')).toBe(true);
    expect(isURL('http://example.com/path?query=1')).toBe(true);
    expect(isURL('https://example.com/path?query=1')).toBe(true);
  });

  it('should return false for invalid urls', () => {
    expect(isURL('example.com')).toBe(false);
    expect(isURL('example.com/path')).toBe(false);
    expect(isURL('example.com/path?query=1')).toBe(false);
  });
});

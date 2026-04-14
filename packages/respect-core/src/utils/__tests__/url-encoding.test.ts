import { encodeURIValue, buildQueryString } from '../url-encoding.js';

describe('encodeURIValue', () => {
  it('should encode reserved chars when x-allowReserved is false (default)', () => {
    expect(encodeURIValue("a!b'c(d)e*f/g")).toBe('a%21b%27c%28d%29e%2Af%2Fg');
  });

  it('should leave RFC 3986 reserved chars unencoded when x-allowReserved is true', () => {
    const reserved = ":/?#[]@!$&'()*+,;=";
    expect(encodeURIValue(reserved, true)).toBe(reserved);
  });

  it("should leave chars that encodeURIComponent does not encode (!'()*) unencoded when x-allowReserved true", () => {
    const encoded = "a!b'c(d)e*f";
    expect(encodeURIValue(encoded, true)).toBe(encoded);
  });

  it('should encode non-reserved chars even when x-allowReserved is true', () => {
    expect(encodeURIValue('a b', true)).toBe('a%20b');
  });
});

describe('buildQueryString', () => {
  it('should encode reserved chars depending on x-allowReserved', () => {
    const raw = 'https://example.com/path/to;x,y(z)a*b.c[1]@v';
    const query = buildQueryString([
      { name: 'raw', value: raw, allowReserved: true },
      { name: 'encoded', value: raw },
    ]);
    expect(query).toContain(`raw=${raw}`);
    expect(query).toContain(`encoded=${encodeURIValue(raw, false)}`);
  });
});

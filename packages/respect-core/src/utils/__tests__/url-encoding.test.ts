import { encodeURIValue, buildQueryString, encodeQuerystring } from '../url-encoding.js';

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

describe('encodeQuerystring', () => {
  it('should keep a form-urlencoded query string as it is', () => {
    const querystring = 'foo=a+%2B+b&bar=true';
    expect(encodeQuerystring(querystring)).toBe(querystring);
    expect(encodeQuerystring(querystring, 'application/x-www-form-urlencoded')).toBe(querystring);
    expect(encodeQuerystring(querystring, 'Application/X-WWW-Form-Urlencoded; charset=utf-8')).toBe(
      querystring
    );
  });

  it('should encode # in a ready query string, so it does not start the URL fragment', () => {
    expect(encodeQuerystring('search=a#b&limit=1')).toBe('search=a%23b&limit=1');
  });

  it('should percent-encode a query string of any other media type as a whole', () => {
    expect(encodeQuerystring('{"numbers":[1,2],"flag":null}', 'application/json')).toBe(
      '%7B%22numbers%22%3A%5B1%2C2%5D%2C%22flag%22%3Anull%7D'
    );
    expect(encodeQuerystring('$.a.b[1:1]', 'application/jsonpath')).toBe('%24.a.b%5B1%3A1%5D');
  });
});

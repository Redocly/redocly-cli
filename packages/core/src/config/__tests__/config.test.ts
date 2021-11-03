import { resolveRedoclyDomain } from '../config';

describe('resolveRedoclyDomain', () => {
  it('should resolve a domain for the eu region by default', async () => {
    const domain = resolveRedoclyDomain();
    expect(domain).toBe('eu.redocly.com');
  });

  it('should prefer a domain from env var over default', async () => {
    process.env.REDOCLY_DOMAIN = 'example.com';
    const domain = resolveRedoclyDomain();

    expect(domain).toBe('example.com');
    process.env.REDOCLY_DOMAIN = '';
  });

  it('should resolve a domain for passed region', async () => {
    const domain = resolveRedoclyDomain('us');
    expect(domain).toBe('redoc.ly');

    const domain2 = resolveRedoclyDomain('eu');
    expect(domain2).toBe('eu.redocly.com');
  });

  it('should prefer a domain for passed region over one from env var', async () => {
    process.env.REDOCLY_DOMAIN = 'example.com';
    const domain = resolveRedoclyDomain('us');
    expect(domain).toBe('redoc.ly');
  });
});

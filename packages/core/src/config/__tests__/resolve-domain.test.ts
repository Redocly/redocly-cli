import * as path from 'path';
import { loadConfig } from '../load';

describe('loadConfig', () => {
  const configPath = path.join(__dirname, 'fixtures/region-config.yaml');

  it('should resolve a domain for the eu region by default', async () => {
    const config = await loadConfig();

    expect(config.redoclyDomain).toBe('eu.redocly.com')
  });

  it('should resolve a domain for the region from provided config', async () => {
    const config = await loadConfig({ configPath });

    expect(config.redoclyDomain).toBe('redoc.ly')
  });

  it('should resolve a domain for the passed region', async () => {
    const config = await loadConfig({ region: 'us' });
    expect(config.redoclyDomain).toBe('redoc.ly')

    const config2 = await loadConfig({ region: 'eu' });
    expect(config2.redoclyDomain).toBe('eu.redocly.com')
  });

  it('should prefer a passed region over the one from config', async () => {
    const config = await loadConfig({
      configPath,
      region: 'eu',
    });

    expect(config.redoclyDomain).toBe('eu.redocly.com')
  });
});

import { type Config, createConfig } from '@redocly/openapi-core';
import { getDomain } from '../domains.js';
import { getReuniteUrl } from '../domains.js';

describe('getDomain()', () => {
  afterEach(() => {
    delete process.env.REDOCLY_DOMAIN;
  });

  it('should return the domain from environment variable', () => {
    process.env.REDOCLY_DOMAIN = 'test-domain';

    expect(getDomain()).toBe('test-domain');
  });

  it('should return the default domain if no domain provided', () => {
    process.env.REDOCLY_DOMAIN = '';

    expect(getDomain()).toBe('https://app.cloud.redocly.com');
  });
});

describe('getReuniteUrl()', () => {
  let testConfig: Config;
  beforeAll(async () => {
    testConfig = await createConfig();
  });

  it('should return US API URL when US region specified', () => {
    expect(getReuniteUrl(testConfig, 'us')).toBe('https://app.cloud.redocly.com');
  });

  it('should return EU API URL when EU region specified', () => {
    expect(getReuniteUrl(testConfig, 'eu')).toBe('https://app.cloud.eu.redocly.com');
  });

  it('should return custom domain API URL when custom domain specified', () => {
    const customDomain = 'https://custom.domain.com';
    expect(getReuniteUrl(testConfig, customDomain)).toBe('https://custom.domain.com');
  });

  it('should return US API URL when no region specified', () => {
    expect(getReuniteUrl(testConfig)).toBe('https://app.cloud.redocly.com');
  });

  it('should use residency from config when no second parameter provided', async () => {
    const config = await createConfig({ residency: 'eu' });
    expect(getReuniteUrl(config)).toBe('https://app.cloud.eu.redocly.com');
  });

  it('should use fromProjectUrl from config when no residency provided', async () => {
    const config = await createConfig({
      scorecard: { fromProjectUrl: 'https://app.cloud.eu.redocly.com/org/test/project/test' },
    });
    expect(getReuniteUrl(config)).toBe('https://app.cloud.eu.redocly.com');
  });

  it('should prioritize second parameter over config residency and fromProjectUrl', async () => {
    const config = await createConfig({
      residency: 'us',
      scorecard: { fromProjectUrl: 'https://app.cloud.eu.redocly.com/org/test/project/test' },
    });
    expect(getReuniteUrl(config, 'eu')).toBe('https://app.cloud.eu.redocly.com');
  });

  it('should prioritize residency over fromProjectUrl when both are provided', async () => {
    const config = await createConfig({
      residency: 'us',
      scorecard: { fromProjectUrl: 'https://app.cloud.eu.redocly.com/org/test/project/test' },
    });
    expect(getReuniteUrl(config)).toBe('https://app.cloud.redocly.com');
  });

  it('should handle custom domain from second parameter', async () => {
    const config = await createConfig({ residency: 'us' });
    expect(getReuniteUrl(config, 'https://custom.redocly.com')).toBe('https://custom.redocly.com');
  });

  it('should handle fromProjectUrl with custom domain and port', async () => {
    const config = await createConfig({
      scorecard: { fromProjectUrl: 'https://custom.redocly.com:8080/org/test/project/test' },
    });
    expect(getReuniteUrl(config)).toBe('https://custom.redocly.com:8080');
  });

  it('should throw error for invalid residency or malformed URL', async () => {
    const config = await createConfig({ residency: 'invalid-region' });
    expect(() => getReuniteUrl(config)).toThrow('Invalid Reunite URL');
    expect(() => getReuniteUrl(testConfig, 'not-a-valid-url')).toThrow('Invalid Reunite URL');
  });

  it('should throw error for invalid fromProjectUrl', async () => {
    const config = await createConfig({
      scorecard: { fromProjectUrl: 'not-a-valid-url' },
    });
    expect(() => getReuniteUrl(config)).toThrow('Invalid Reunite URL');
  });
});

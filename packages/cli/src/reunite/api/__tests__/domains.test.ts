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

  it('should use residency from config', async () => {
    testConfig.resolvedConfig.residency = 'us';
    const config = await createConfig({ residency: 'eu' });
    expect(getReuniteUrl(config)).toBe('https://app.cloud.eu.redocly.com');
  });

  it('should use reunite project URL from config', async () => {
    const config = await createConfig({
      reunite: { projectUrl: 'https://app.cloud.eu.redocly.com/org/test_org/project/test_project' },
    });
    expect(getReuniteUrl(config)).toBe('https://app.cloud.eu.redocly.com');
  });

  it('should throw an error when invalid region specified', () => {
    expect(() => getReuniteUrl(testConfig, 'invalid')).toThrow('Invalid Reunite URL');
  });
});

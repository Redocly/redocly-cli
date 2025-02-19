import { getReuniteUrl } from '../get-reunite-url';

describe('getReuniteUrl', () => {
  it('should return US Reunite url when no residency provided', () => {
    expect(getReuniteUrl()).toBe('https://app.cloud.redocly.com/api');
  });

  it('should return EU Reunite url when residency is set to eu', () => {
    expect(getReuniteUrl('eu')).toBe('https://app.cloud.eu.redocly.com/api');
  });

  it('should return residency url when url provided', () => {
    expect(getReuniteUrl('http://someenvironment.redocly.com')).toBe(
      'http://someenvironment.redocly.com/api'
    );
  });
});

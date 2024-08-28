import { createConfigTypes } from '../redocly-yaml';

describe('createConfigTypes', () => {
  test('should create types for config root and include expected properties', () => {
    const result = createConfigTypes({
      properties: {
        apis: {
          additionalProperties: {
            properties: {
              foo: {
                type: 'string',
              },
              bar: {
                type: 'string',
              },
            },
          },
        },
      },
    });

    expect(result).toHaveProperty('ConfigRoot');
    expect(result.ConfigRoot).toHaveProperty('properties');

    const apisPropertiesName = result.ConfigRoot.properties?.apis;
    expect(apisPropertiesName).toBeDefined();
    const additionalPropertiesName = result[apisPropertiesName as any].additionalProperties;
    expect(additionalPropertiesName).toBeDefined();
    const apisProperties = result[additionalPropertiesName].properties;
    expect(apisProperties).toBeDefined();
    const propNames = Object.keys(apisProperties);
    expect(propNames).toContain('root');
    expect(propNames).toContain('output');
    expect(propNames).toContain('foo');
    expect(propNames).toContain('bar');
  });
});

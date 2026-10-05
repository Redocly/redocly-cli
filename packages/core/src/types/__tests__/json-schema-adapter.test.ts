import { getNodeTypesFromJSONSchema } from '../json-schema-adapter.js';

describe('getNodeTypesFromJSONSchema', () => {
  it('types the entries of an object with a single pattern like additionalProperties', () => {
    const { ctx: types } = getNodeTypesFromJSONSchema('Catalogs', {
      type: 'object',
      additionalProperties: false,
      patternProperties: {
        '.*': {
          type: 'object',
          properties: { directory: { type: 'string', format: 'uri-reference' } },
        },
      },
    });

    expect(types['Catalogs'].additionalProperties).toBe('Catalogs_additionalProperties');
    expect(types['Catalogs_additionalProperties'].properties).toEqual({
      directory: { type: 'string', format: 'uri-reference' },
    });
  });
});

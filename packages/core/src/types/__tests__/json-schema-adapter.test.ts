import { getNodeTypesFromJSONSchema } from '../json-schema-adapter.js';

describe('getNodeTypesFromJSONSchema', () => {
  it('picks the oneOf branch of an object with a formatted string without logging a format warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { ctx: types } = getNodeTypesFromJSONSchema('Root', {
      type: 'object',
      properties: {
        markdoc: {
          oneOf: [
            { type: 'boolean' },
            {
              type: 'object',
              properties: { tagsFile: { type: 'string', format: 'uri-reference' } },
            },
          ],
        },
      },
    });

    const resolveMarkdoc = types['Root'].properties.markdoc as (
      value: unknown,
      key: string
    ) => unknown;

    expect(resolveMarkdoc({ tagsFile: './tags.js' }, 'markdoc')).toBe('Root.markdoc_1');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('turns a named list of strings into a node whose items are scalar nodes', () => {
    const { ctx: types } = getNodeTypesFromJSONSchema('Root', {
      type: 'object',
      properties: {
        overlays: {
          type: 'array',
          nodeTypeName: 'Overlays',
          items: { type: 'string', format: 'uri-reference' },
        } as never,
      },
    });

    expect(types['Root'].properties.overlays).toBe('Overlays');
    expect(types['Overlays'].items).toBe('Overlays_items');
    expect(types['Overlays_items']).toEqual({
      properties: {},
      scalar: { type: 'string', format: 'uri-reference' },
    });
  });

  it('turns a scalar with a nodeTypeName into a scalar node', () => {
    const { ctx: types } = getNodeTypesFromJSONSchema('Root', {
      type: 'object',
      properties: {
        template: { type: 'string', format: 'uri-reference', nodeTypeName: 'Template' } as never,
      },
    });

    expect(types['Root'].properties.template).toBe('Template');
    expect(types['Template']).toEqual({
      properties: {},
      scalar: { type: 'string', format: 'uri-reference' },
    });
  });
});

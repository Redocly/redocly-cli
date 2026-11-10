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

  it('records each deprecated property on the type of its parent object', () => {
    const schema = {
      type: 'object',
      properties: {
        newOption: { type: 'object', properties: { enabled: { type: 'boolean' } } },
        oldOption: {
          type: 'object',
          properties: { enabled: { type: 'boolean' } },
          deprecated: true,
          replacement: 'newOption',
        },
        oldFlag: { type: 'boolean', deprecated: true, replacement: '/settings/flag' },
        oldLogin: {
          oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
          deprecated: true,
        },
      },
    } as const;

    const { ctx } = getNodeTypesFromJSONSchema('root', schema);

    expect(ctx.root.deprecatedProperties).toEqual({
      oldOption: { replacement: 'newOption' },
      oldFlag: { replacement: '/settings/flag' },
      oldLogin: { replacement: undefined },
    });
    expect(ctx['root.newOption'].deprecatedProperties).toBeUndefined();
  });
});

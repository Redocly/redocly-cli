import { normalizeTypes } from '../index.js';

describe('normalizeTypes', () => {
  it('lists the properties whose value or list items are a uri-reference', () => {
    const { Api } = normalizeTypes({
      Api: {
        properties: {
          root: { type: 'string', format: 'uri-reference' },
          overlays: { type: 'array', items: { type: 'string', format: 'uri-reference' } },
          output: { type: 'string', format: 'uri' },
          title: { type: 'string' },
          rules: 'Rules',
          theme: () => 'Rules',
        },
      },
      Rules: { properties: {} },
    });

    expect(Api.uriReferenceProperties).toEqual(['root', 'overlays']);
  });
});

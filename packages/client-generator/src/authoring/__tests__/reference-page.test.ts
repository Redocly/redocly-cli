import { apiModel, operation, param } from '../../__tests__/fixtures.js';
import { renderReferencePage } from '../reference-page.js';

const LANGUAGE = {
  name: 'python',
  label: 'Python',
  fence: 'python',
  requires: 'Requires Python >= 3.9 and httpx.',
};

describe('renderReferencePage', () => {
  it('renders the whole page: front matter, auth table, tag groups, and per-operation facts', () => {
    const model = apiModel({
      services: [
        {
          name: 'Orders',
          operations: [
            operation({
              name: 'listOrders',
              specName: 'listOrders',
              method: 'get',
              path: '/orders',
              summary: 'List | orders.',
              tags: ['Orders'],
              queryParams: [
                {
                  name: 'cursor',
                  in: 'query',
                  required: false,
                  schema: { kind: 'scalar', scalar: 'string' },
                  description: 'Page\ncursor.',
                },
                param('limit', 'query', true, { kind: 'scalar', scalar: 'integer' }),
              ],
              successResponses: [
                {
                  status: 200,
                  contentType: 'application/json',
                  schema: { kind: 'ref', name: 'OrderPage' },
                },
              ],
            }),
            operation({
              name: 'createOrder',
              method: 'post',
              path: '/orders',
              tags: ['Orders'],
              requestBody: {
                contentType: 'application/json',
                required: true,
                schema: {
                  kind: 'union',
                  members: [
                    { kind: 'ref', name: 'Order' },
                    { kind: 'enum', values: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], scalar: 'string' },
                  ],
                },
              },
            }),
            operation({
              name: 'streamEvents',
              method: 'get',
              path: '/events',
              tags: ['Orders'],
              successResponses: [
                { status: 200, contentType: 'text/event-stream', schema: { kind: 'unknown' } },
              ],
            }),
            operation({
              name: 'downloadReport',
              method: 'get',
              path: '/report',
              tags: [],
              successResponses: [
                {
                  status: 200,
                  contentType: 'application/octet-stream',
                  schema: { kind: 'unknown' },
                },
              ],
            }),
          ],
        },
      ],
      securitySchemes: [
        { key: 'BearerAuth', kind: 'bearer' },
        { key: 'KeyAuth', kind: 'apiKeyHeader', headerName: 'X-Key' },
      ],
    });

    const page = renderReferencePage(model, {
      title: 'Cafe Python reference',
      frontmatter: true,
      language: LANGUAGE,
      sample: (op) =>
        op.name === 'listOrders' ? { lang: 'python', source: 'client.list_orders()\n' } : undefined,
      paginated: new Set(['listOrders']),
    });

    expect(page).toContain('---\ntitle: Cafe Python reference\n---');
    expect(page).toContain('Requires Python >= 3.9 and httpx.');
    // Auth table covers both scheme spellings.
    expect(page).toContain('| `BearerAuth` | bearer | `Authorization: Bearer <token>` |');
    expect(page).toContain('| `KeyAuth` | apiKeyHeader | the `X-Key` header |');
    // Tagged group, then the untagged fallback section.
    expect(page).toContain('## Orders');
    expect(page).toContain('## Operations');
    // The sample rides in the language fence; a sample-less operation gets no fence.
    expect(page).toContain('```python\nclient.list_orders()\n```');
    // Summaries and descriptions are table-cell-safe: pipes escaped, newlines collapsed.
    expect(page).toContain('List \\| orders.');
    expect(page).toContain('| `cursor` | query | string | no | Page cursor. |');
    expect(page).toContain('| `limit` | query | integer | yes |  |');
    // Type labels: refs by name, unions joined, long enums truncated.
    expect(page).toContain('Returns `application/json`, of type OrderPage.');
    expect(page).toContain('of type Order or enum: a, b, c, d, e, f, and 1 more.');
    // The three declaration-level facts.
    expect(page).toContain(
      'This operation is paginated, so the SDK gives it page and item iterators.'
    );
    expect(page).toContain(
      'This operation streams server-sent events, so the SDK iterates the events.'
    );
    expect(page).toContain('This operation returns binary content.');
    // A bodyless, responseless operation would say "Returns no content." — createOrder has a
    // body line instead.
    expect(page).toContain('Body: `application/json`, required, of type Order or enum:');
  });

  it('falls back to config-resolved pagination and the no-schemes line without a resolved set', () => {
    const model = apiModel({
      services: [
        {
          name: 'Default',
          operations: [
            operation({
              name: 'listItems',
              specName: 'listItems',
              method: 'get',
              path: '/items',
              queryParams: [param('offset', 'query', false, { kind: 'scalar', scalar: 'integer' })],
              successResponses: [
                {
                  status: 200,
                  contentType: 'application/json',
                  schema: { kind: 'array', items: { kind: 'scalar', scalar: 'string' } },
                },
              ],
            }),
          ],
        },
      ],
    });
    const page = renderReferencePage(model, {
      title: 'Items reference',
      frontmatter: false,
      language: LANGUAGE,
      sample: () => undefined,
      pagination: { style: 'offset', offsetParam: 'offset', items: '' },
    });
    expect(page.startsWith('# Items reference')).toBe(true);
    expect(page).toContain('The description declares no security schemes.');
    expect(page).toContain('This operation is paginated');
    expect(page).toContain('array of string');
  });
});

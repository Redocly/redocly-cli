import {
  modelWith,
  namedSchema,
  operation,
  param,
  response,
} from '../../emitters/__tests__/fixtures.js';
import { cliDocsGenerator } from '../cli-docs/index.js';

const CAFE = modelWith(
  [
    operation({
      name: 'listOrders',
      method: 'get',
      path: '/orders',
      tags: ['Coffee Orders'],
      summary: 'List orders\nacross every shop',
      queryParams: [
        param('status', 'query', false, {
          kind: 'enum',
          scalar: 'string',
          values: ['open', 'closed'],
        }),
        param('maxTotal', 'query', false, { kind: 'scalar', scalar: 'number' }),
      ],
      successResponses: [response({ schema: { kind: 'ref', name: 'Order' } })],
    }),
    operation({
      name: 'createOrder',
      method: 'post',
      path: '/orders',
      tags: ['Coffee Orders'],
      summary: 'Create an order | with a pipe',
      requestBody: {
        contentType: 'application/json',
        required: true,
        schema: { kind: 'ref', name: 'Order' },
      },
      successResponses: [response({ status: 201, schema: { kind: 'ref', name: 'Order' } })],
    }),
    operation({
      name: 'uploadPhoto',
      method: 'post',
      path: '/menu/{id}/photo',
      tags: ['Coffee Orders'],
      requestBody: {
        contentType: 'multipart/form-data',
        required: true,
        schema: { kind: 'unknown' },
      },
    }),
    operation({ name: 'ping', method: 'get', path: '/ping' }),
  ],
  {
    title: 'Cafe API',
    schemas: [namedSchema('Order', { kind: 'object', properties: [] })],
    securitySchemes: [{ key: 'BearerAuth', kind: 'bearer' }],
  }
);

function render(options: Record<string, unknown> = {}): string {
  const files = cliDocsGenerator({
    model: CAFE,
    outputPath: '/out/cafe.client.ts',
    outputMode: 'single',
    emit: {},
    selected: ['typescript', 'zod', 'cli', 'cli-docs'],
    options,
  });
  expect(files).toHaveLength(1);
  expect(files[0].path).toBe('/out/cafe.client.cli.md');
  return files[0].content;
}

describe('cliDocsGenerator', () => {
  it('documents every command the CLI dispatches, addressed the way the CLI addresses it', () => {
    const page = render();
    // Groups are the slugs the CLI accepts, with the original tag as the section title.
    expect(page).toContain('## Coffee Orders');
    expect(page).toContain('### `coffee-orders listOrders`');
    expect(page).toContain('### `coffee-orders createOrder`');
    // An untagged operation is addressed without a group.
    expect(page).toContain('### `ping`');
    expect(page).toContain('GET /orders');
  });

  it('renders flags with type, requiredness, and choices', () => {
    const page = render();
    expect(page).toContain('--status');
    expect(page).toContain('`open`, `closed`');
    // A number-typed query param is documented as a number, not a string.
    expect(page).toMatch(/--max-total.*number/);
    expect(page).toContain('--json');
  });

  it('carries the global flags, the credential variables, and the exit-code contract', () => {
    const page = render();
    expect(page).toContain('--page-all');
    // The env prefix comes from the bin name the CLI derives from the same stem.
    expect(page).toContain('CAFE_CLIENT_TOKEN');
    expect(page).toContain('| 3 |');
    expect(page).toContain('validation error');
  });

  it('lists --token only when the description declares a bearer scheme, like the CLI itself', () => {
    expect(render()).toContain('--token');
    const noBearer = modelWith([operation({ name: 'ping', method: 'get', path: '/ping' })], {
      title: 'Cafe API',
      securitySchemes: [{ kind: 'apiKeyHeader', key: 'ApiKeyAuth', headerName: 'X-Api-Key' }],
    });
    const files = cliDocsGenerator({
      model: noBearer,
      outputPath: '/out/cafe.client.ts',
      outputMode: 'single',
      emit: {},
      selected: ['typescript', 'zod', 'cli', 'cli-docs'],
      options: {},
    });
    expect(files[0].content).not.toContain('--token');
  });

  it('says when a body is one the CLI cannot build, instead of implying the command runs', () => {
    const page = render();
    expect(page).toContain('### `coffee-orders uploadPhoto`');
    expect(page).toContain('`multipart/form-data` body, which the CLI cannot build');
    // And it does not advertise --json for that command.
    const section = page.slice(page.indexOf('### `coffee-orders uploadPhoto`'));
    expect(section.slice(0, section.indexOf('###', 3))).not.toContain('--json');
  });

  it('keeps a description safe inside a table cell', () => {
    const page = render();
    // A newline would break the row; a pipe would open a new column.
    expect(page).toContain('List orders across every shop');
    expect(page).toContain('Create an order \\| with a pipe');
  });

  it('honors its declared options', () => {
    expect(render()).toContain('# Cafe API command-line reference');
    const custom = render({ title: 'Coffee CLI', frontmatter: true });
    expect(custom.startsWith('---\ntitle: Coffee CLI\n---\n')).toBe(true);
    expect(custom).toContain('# Coffee CLI');
  });
});

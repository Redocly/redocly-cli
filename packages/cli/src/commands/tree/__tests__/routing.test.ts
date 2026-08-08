import {
  analyzeApi,
  BaseResolver,
  detectSpec,
  getTypes,
  normalizeTypes,
  type Document,
} from '@redocly/openapi-core';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveTreeView, TreeSelectorError } from '../index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(__dirname, '../../../../../core/src/api-graph/__tests__/fixtures/split');
const FIXTURE_WEBHOOKS = join(
  __dirname,
  '../../../../../core/src/api-graph/__tests__/fixtures/webhooks'
);
const FIXTURE_MULTI_WEBHOOKS = join(
  __dirname,
  '../../../../../core/src/api-graph/__tests__/fixtures/multi-webhooks'
);

async function analysisOfFixture(fixtureRoot: string) {
  const resolver = new BaseResolver();
  const rootDocument = (await resolver.resolveDocument(
    null,
    join(fixtureRoot, 'openapi.yaml'),
    true
  )) as Document;
  const specVersion = detectSpec(rootDocument.parsed);
  const types = normalizeTypes(getTypes(specVersion), {});
  const analysis = await analyzeApi({
    rootDocument,
    specVersion,
    types,
    externalRefResolver: resolver,
    cwd: fixtureRoot,
    resolveRef: (base, uri) => join(dirname(base), uri),
  });
  return { analysis, specVersion, cwd: fixtureRoot };
}

describe('resolveTreeView', () => {
  it('routes bare invocation to the overview and selectors to their views', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE);
    const route = (argv: Record<string, unknown>) =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    expect(route({}).kind).toBe('overview');
    expect(route({ tag: 'Tickets' })).toMatchObject({ kind: 'operations', scope: 'Tickets' });
    expect(route({ operations: true }).kind).toBe('operations');
    expect(route({ paths: true }).kind).toBe('paths');
    expect(route({ path: '/tickets' }).kind).toBe('operations');
    expect(route({ path: '/tickets', operation: 'post' }).kind).toBe('operation-card');
    expect(route({ operation: 'buyTickets' }).kind).toBe('operation-card');
    expect(route({ component: 'schemas' })).toMatchObject({
      kind: 'components',
      section: 'schemas',
    });
    expect(route({ component: 'schema', name: 'Ticket' }).kind).toBe('component-card');
    expect(route({ component: 'schemas', name: 'Ticket', 'used-by': true }).kind).toBe('used-by');
    expect(route({ file: 'components/schemas/Ticket.yaml' })).toMatchObject({
      kind: 'file-card',
      card: { file: 'components/schemas/Ticket.yaml' },
    });
    expect(route({ file: 'components/schemas/Ticket.yaml', 'used-by': true }).kind).toBe('used-by');
  });

  it('lists every webhook operation with --webhooks, same shape as --operations', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE_MULTI_WEBHOOKS);
    const route = (argv: Record<string, unknown>) =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    expect(route({ webhooks: true })).toMatchObject({
      kind: 'operations',
      items: [
        { method: 'post', webhook: 'zLast' },
        { method: 'get', webhook: 'aFirst' },
        { method: 'post', webhook: 'aFirst' },
      ],
    });
  });

  it('resolves --file to a file card listing everything the file defines', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE);
    const route = (argv: Record<string, unknown>) =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    expect(route({ file: 'paths/tickets.yaml' })).toMatchObject({
      kind: 'file-card',
      card: {
        file: 'paths/tickets.yaml',
        defines: [
          { method: 'get', path: '/tickets' },
          { method: 'post', path: '/tickets' },
        ],
      },
    });
  });

  it('resolves --file relative to the API root dir first, falling back to cwd-relative', async () => {
    const { analysis, specVersion } = await analysisOfFixture(FIXTURE);
    // FIXTURE's own directory is the API root; its parent is a cwd the file also happens to be
    // reachable from, but only via a cwd-relative path (prefixed with the fixture's own dir name).
    const parentCwd = dirname(FIXTURE);
    const route = (argv: Record<string, unknown>) =>
      resolveTreeView(argv as never, analysis, specVersion, parentCwd);

    expect(route({ file: 'components/schemas/Ticket.yaml' }).kind).toBe('file-card');
    expect(route({ file: 'split/components/schemas/Ticket.yaml' }).kind).toBe('file-card');
  });

  it('rejects bad selections with actionable messages', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE);
    const route = (argv: Record<string, unknown>) => () =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    expect(route({ tag: 'Ticket' })).toThrow(TreeSelectorError);
    expect(route({ tag: 'Ticket' })).toThrow(/Did you mean.*Tickets/);
    expect(route({ operation: 'post' })).toThrow(/looks like an HTTP method.*--path/);
    expect(route({ operation: 'buyTickets', 'with-deps': false, path: '/nope' })).toThrow(
      /No path "\/nope"/
    );
    expect(route({ component: 'bogus' })).toThrow(/Unknown component section/);
    expect(route({ name: 'Ticket' })).toThrow(/--name requires --component/);
    expect(route({ 'with-deps': true })).toThrow(/--with-deps requires/);
    expect(route({ 'used-by': true })).toThrow(/--used-by requires/);
    expect(
      route({ 'used-by': true, 'with-deps': true, component: 'schemas', name: 'Ticket' })
    ).toThrow(/--used-by and --with-deps cannot be combined/);
    expect(route({ brief: true, 'with-deps': true, component: 'schemas', name: 'Ticket' })).toThrow(
      /--brief cannot be combined with --used-by or --with-deps/
    );
    expect(route({ brief: true, 'used-by': true, component: 'schemas', name: 'Ticket' })).toThrow(
      TreeSelectorError
    );
    expect(route({ tag: 'Tickets', operation: 'buyTickets' })).toThrow(
      /combining it with --tag is ambiguous/
    );
    expect(route({ file: 'components/schemas/Ticket.yaml', 'with-deps': true })).toThrow(
      /--with-deps requires an operation or component selection/
    );
    expect(route({ file: 'components/schemas/Ticket' })).toThrow(
      /No file "components\/schemas\/Ticket"/
    );
    expect(route({ file: 'components/schemas/Ticket' })).toThrow(/Did you mean.*Ticket\.yaml/);
    expect(route({ webhooks: true, tag: 'Tickets' })).toThrow(/--webhooks .*cannot be combined/);
    expect(route({ webhooks: true, component: 'schemas' })).toThrow(
      /--webhooks .*cannot be combined/
    );
  });

  it('rejects an unknown --webhook selection', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE_WEBHOOKS);
    const route = (argv: Record<string, unknown>) => () =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    expect(route({ webhook: 'nope' })).toThrow(/No webhook "nope"/);
  });
});

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectSpec } from '../../detect-spec.js';
import { getTypes } from '../../oas-types.js';
import { BaseResolver, type Document } from '../../resolve.js';
import { normalizeTypes } from '../../types/index.js';
import { analyzeApi, type ApiIndexMeta } from '../build-graph.js';
import {
  findComponent,
  findOperationByOperationId,
  findOperationByPathMethod,
  findWebhookOperation,
  listOperations,
  normalizeComponentSection,
  suggestNames,
} from '../select.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function metaOfFixture(fixtureRoot: string): Promise<ApiIndexMeta> {
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
  return analysis.meta;
}

describe('select', () => {
  it('finds operations by path+method, operationId, and webhook name', async () => {
    const meta = await metaOfFixture(join(__dirname, 'fixtures', 'split'));

    expect(findOperationByPathMethod(meta, '/tickets', 'post')?.id).toBe('POST /tickets');
    expect(findOperationByPathMethod(meta, '/tickets', 'POST')?.id).toBe('POST /tickets');
    expect(findOperationByPathMethod(meta, '/nope', 'get')).toBeUndefined();
    expect(findOperationByOperationId(meta, 'buyTickets')?.id).toBe('POST /tickets');

    const webhooksMeta = await metaOfFixture(join(__dirname, 'fixtures', 'webhooks'));
    expect(findWebhookOperation(webhooksMeta, 'newTicket')?.id).toBe('POST newTicket');
    expect(findWebhookOperation(webhooksMeta, 'newTicket', 'post')?.id).toBe('POST newTicket');
    expect(findWebhookOperation(webhooksMeta, 'nope')).toBeUndefined();
  });

  it('scopes operation listings by tag and path, excluding webhooks by default', async () => {
    const meta = await metaOfFixture(join(__dirname, 'fixtures', 'split'));
    expect(listOperations(meta, { tag: 'Tickets' }).map((operation) => operation.id)).toEqual([
      'GET /tickets',
      'POST /tickets',
    ]);
    expect(listOperations(meta, { path: '/tickets' }).map((operation) => operation.id)).toEqual([
      'GET /tickets',
      'POST /tickets',
    ]);
    expect(listOperations(meta, { tag: 'nope' })).toEqual([]);
  });

  it('finds components and normalizes section aliases', async () => {
    const meta = await metaOfFixture(join(__dirname, 'fixtures', 'split'));
    expect(findComponent(meta, 'schemas', 'Ticket')?.name).toBe('Ticket');
    expect(normalizeComponentSection('schemas')).toBe('schemas');
    expect(normalizeComponentSection('schema')).toBe('schemas');
    expect(normalizeComponentSection('requestBody')).toBe('requestBodies');
    expect(normalizeComponentSection('bogus')).toBeUndefined();
  });

  it('suggests near matches, ranked exact > prefix > substring', () => {
    expect(suggestNames('ticket', ['Ticket', 'TicketList', 'Order', 'BuyTicketBody'])).toEqual([
      'Ticket',
      'TicketList',
      'BuyTicketBody',
    ]);
    expect(suggestNames('zzz', ['Ticket'])).toEqual([]);
  });
});

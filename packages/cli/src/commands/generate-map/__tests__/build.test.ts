import type { OperationCard } from '@redocly/openapi-core';

import { buildMapRow } from '../build.js';

const cardFixture: OperationCard = {
  method: 'post',
  path: '/v2/nfs',
  operationId: 'nfs_create',
  summary: 'Create a new NFS share',
  tags: ['nfs'],
  pointer: '#/paths/~1v2~1nfs/post',
  file: 'resources/nfs/nfs_create.yml',
  start_line: 1,
  end_line: 52,
  security: {
    requirements: [{ bearer_auth: ['nfs:create'] }],
    schemes: [{ name: 'bearer_auth', type: 'http', scheme: 'bearer' }],
  },
  refs: [],
  usedBy: [],
  content: [
    'operationId: nfs_create',
    'requestBody:',
    '  content:',
    '    application/json:',
    '      schema:',
    '        type: object',
    '        required: [name, size_gib]',
    '        properties:',
    '          name: { type: string }',
    '          size_gib: { type: integer }',
    'responses:',
    "  '201':",
    '    content:',
    '      application/json:',
    '        schema:',
    '          type: object',
    '          properties:',
    '            id: { type: string }',
  ].join('\n'),
  deps: [],
};

describe('buildMapRow', () => {
  it('assembles the full row grammar from a card', () => {
    const row = buildMapRow({
      card: cardFixture,
      isWebhook: false,
      containerKey: '/v2/nfs',
      method: 'post',
    });
    expect(row).toBe(
      'POST /v2/nfs · nfs_create — Create a new NFS share · auth: bearer_auth (nfs:create) · body: name*, size_gib*:int · 201→{id} · src: resources/nfs/nfs_create.yml L1-52'
    );
  });

  it('marks deprecation and renders the webhook shape', () => {
    const row = buildMapRow({
      card: { ...cardFixture, security: undefined, content: undefined },
      isWebhook: true,
      containerKey: 'order-notification',
      method: 'post',
      deprecated: true,
    });
    expect(row).toBe(
      'POST webhook order-notification · nfs_create — Create a new NFS share · deprecated · src: resources/nfs/nfs_create.yml L1-52'
    );
  });
});

describe('buildApiMap security section', () => {
  it('warns when the description declares no security at all', async () => {
    // GitHub declares none, so every row is honestly bare — and 13 benchmark runs read that
    // silence as "no auth needed" and skipped the token call the task required.
    const { securitySection } = await import('../build.js');
    expect(securitySection([])).toEqual([
      'none declared in this description — a call may still need auth stated in its own description',
    ]);
  });
});

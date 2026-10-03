import { createConfig } from '@redocly/openapi-core';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { collectDescriptions, UnresolvedRefError } from '../descriptions.js';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function fixture(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'recheck-descriptions-'));
  dirs.push(dir);
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
  return dir;
}

const ROOT = `openapi: 3.1.0
info:
  title: Museum
  version: 1.0.0
  description: |
    Welcome to the museum.
    Buy a ticket first.
paths:
  /tickets:
    post:
      summary: Buy a ticket
      description: Creates a ticket.
      responses:
        '200':
          description: The ticket.
          content:
            application/json:
              schema:
                $ref: ./schemas.yaml#/Ticket
    get:
      responses:
        '200':
          description: Tickets.
          content:
            application/json:
              schema:
                $ref: ./schemas.yaml#/Ticket
`;

const SCHEMAS = `Ticket:
  type: object
  description: A ticket for one visit.
  properties:
    id:
      type: string
      description: The ticket id.
`;

describe('collectDescriptions', () => {
  it('collects every string description, but not summary, with its pointer and owning source', async () => {
    const dir = fixture({ 'openapi.yaml': ROOT, 'schemas.yaml': SCHEMAS });
    const config = await createConfig({}, { configPath: join(dir, 'redocly.yaml') });
    const { descriptions } = await collectDescriptions(join(dir, 'openapi.yaml'), config);
    const root = join(dir, 'openapi.yaml');
    const schemas = join(dir, 'schemas.yaml');
    expect(
      new Map(
        descriptions.map((entry) => [`${entry.source.absoluteRef}${entry.pointer}`, entry.text])
      )
    ).toEqual(
      new Map([
        [`${root}#/info/description`, 'Welcome to the museum.\nBuy a ticket first.\n'],
        [`${root}#/paths/~1tickets/post/description`, 'Creates a ticket.'],
        [`${root}#/paths/~1tickets/post/responses/200/description`, 'The ticket.'],
        [`${root}#/paths/~1tickets/get/responses/200/description`, 'Tickets.'],
        [`${schemas}#/Ticket/description`, 'A ticket for one visit.'],
        [`${schemas}#/Ticket/properties/id/description`, 'The ticket id.'],
      ])
    );
  });

  // The walker visits a node once per type, so only refs of two types reach it twice.
  it('collects a $ref target once when refs of two node types point at it', async () => {
    const dir = fixture({
      'openapi.yaml': `openapi: 3.1.0
info:
  title: Museum
  version: 1.0.0
paths:
  /tickets:
    get:
      parameters:
        - $ref: '#/components/parameters/TicketId'
      responses:
        '200':
          description: The ticket.
          headers:
            Ticket-Id:
              $ref: '#/components/parameters/TicketId'
components:
  parameters:
    TicketId:
      name: Ticket-Id
      in: header
      description: The ticket id.
      schema:
        type: string
`,
    });
    const config = await createConfig({}, { configPath: join(dir, 'redocly.yaml') });
    const { descriptions } = await collectDescriptions(join(dir, 'openapi.yaml'), config);
    const ticketId = descriptions.filter(
      (entry) => entry.pointer === '#/components/parameters/TicketId/description'
    );
    expect(ticketId).toHaveLength(1);
  });

  it('returns the root document and every local $ref source as scanned files', async () => {
    const dir = fixture({ 'openapi.yaml': ROOT, 'schemas.yaml': SCHEMAS });
    const config = await createConfig({}, { configPath: join(dir, 'redocly.yaml') });
    const { files } = await collectDescriptions(join(dir, 'openapi.yaml'), config);
    expect(files).toContain(join(dir, 'openapi.yaml'));
    expect(files).toContain(join(dir, 'schemas.yaml'));
  });

  it('rejects a root whose local $ref target is missing', async () => {
    const dir = fixture({
      'openapi.yaml': `openapi: 3.1.0
info:
  title: Museum
  version: 1.0.0
  description: Welcome to the museum.
paths: {}
components:
  schemas:
    Pet:
      $ref: './missing.yaml#/Pet'
`,
    });
    const config = await createConfig({}, { configPath: join(dir, 'redocly.yaml') });
    const failure = await collectDescriptions(join(dir, 'openapi.yaml'), config).catch(
      (error: unknown) => error
    );
    expect(failure).toBeInstanceOf(UnresolvedRefError);
    expect((failure as UnresolvedRefError).message).toContain('missing.yaml');
    expect((failure as UnresolvedRefError).files).toEqual([join(dir, 'missing.yaml')]);
  });

  it('keeps the descriptions when an external file loads but its pointer is missing', async () => {
    const dir = fixture({
      'openapi.yaml': `openapi: 3.1.0
info:
  title: Museum
  version: 1.0.0
  description: Welcome to the museum.
paths:
  /tickets:
    get:
      description: Lists the tickets.
      responses:
        '200':
          description: Tickets.
          content:
            application/json:
              schema:
                $ref: ./schemas.yaml#/Missing
`,
      'schemas.yaml': SCHEMAS,
    });
    const config = await createConfig({}, { configPath: join(dir, 'redocly.yaml') });
    const { descriptions, unresolvedPointers, files } = await collectDescriptions(
      join(dir, 'openapi.yaml'),
      config
    );
    expect(descriptions.map((entry) => entry.pointer)).toEqual([
      '#/info/description',
      '#/paths/~1tickets/get/description',
      '#/paths/~1tickets/get/responses/200/description',
    ]);
    expect(unresolvedPointers).toHaveLength(1);
    expect(unresolvedPointers[0]).toContain('./schemas.yaml#/Missing');
    expect(files).toEqual([join(dir, 'openapi.yaml'), join(dir, 'schemas.yaml')]);
  });

  it('names the unread target by the same split the walker uses when the file name has a hash', async () => {
    const dir = fixture({
      'openapi.yaml': `openapi: 3.1.0
info:
  title: Museum
  version: 1.0.0
paths: {}
components:
  schemas:
    Pet:
      $ref: './data#v2.yaml#/Pet'
`,
    });
    const config = await createConfig({}, { configPath: join(dir, 'redocly.yaml') });
    const failure = await collectDescriptions(join(dir, 'openapi.yaml'), config).catch(
      (error: unknown) => error
    );
    expect(failure).toBeInstanceOf(UnresolvedRefError);
    expect((failure as UnresolvedRefError).files).toEqual([join(dir, 'data#v2.yaml')]);
  });
});

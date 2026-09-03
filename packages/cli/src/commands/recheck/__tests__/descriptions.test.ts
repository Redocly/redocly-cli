import { createConfig } from '@redocly/openapi-core';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { collectDescriptions } from '../descriptions.js';

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
  it('collects every string description with its pointer and owning source', async () => {
    const dir = fixture({ 'openapi.yaml': ROOT, 'schemas.yaml': SCHEMAS });
    const config = await createConfig({}, { configPath: join(dir, 'redocly.yaml') });
    const collected = await collectDescriptions(join(dir, 'openapi.yaml'), config);
    const byPointer = new Map(
      collected.map((entry) => [`${entry.source.absoluteRef}${entry.pointer}`, entry.text])
    );
    expect(byPointer.get(`${join(dir, 'openapi.yaml')}#/info/description`)).toBe(
      'Welcome to the museum.\nBuy a ticket first.\n'
    );
    expect(byPointer.get(`${join(dir, 'openapi.yaml')}#/paths/~1tickets/post/description`)).toBe(
      'Creates a ticket.'
    );
    expect(byPointer.get(`${join(dir, 'schemas.yaml')}#/Ticket/description`)).toBe(
      'A ticket for one visit.'
    );
    expect(byPointer.get(`${join(dir, 'schemas.yaml')}#/Ticket/properties/id/description`)).toBe(
      'The ticket id.'
    );
  });

  it('collects a $ref target once, however many refs point at it', async () => {
    const dir = fixture({ 'openapi.yaml': ROOT, 'schemas.yaml': SCHEMAS });
    const config = await createConfig({}, { configPath: join(dir, 'redocly.yaml') });
    const collected = await collectDescriptions(join(dir, 'openapi.yaml'), config);
    const ticket = collected.filter((entry) => entry.pointer === '#/Ticket/description');
    expect(ticket).toHaveLength(1);
  });

  it('leaves summary out', async () => {
    const dir = fixture({ 'openapi.yaml': ROOT, 'schemas.yaml': SCHEMAS });
    const config = await createConfig({}, { configPath: join(dir, 'redocly.yaml') });
    const collected = await collectDescriptions(join(dir, 'openapi.yaml'), config);
    expect(collected.some((entry) => entry.pointer.endsWith('/summary'))).toBe(false);
  });

  it('reads JSON documents', async () => {
    const dir = fixture({
      'openapi.json': JSON.stringify({
        openapi: '3.1.0',
        info: { title: 't', version: '1', description: 'Json intro.' },
        paths: {},
      }),
    });
    const config = await createConfig({}, { configPath: join(dir, 'redocly.yaml') });
    const collected = await collectDescriptions(join(dir, 'openapi.json'), config);
    expect(collected.map((entry) => entry.text)).toContain('Json intro.');
  });
});

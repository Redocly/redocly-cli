import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ApiModel, SchemaModel } from '../../intermediate-representation/model.js';
import { renderGoModels } from '../go.js';

const hasGo = spawnSync('go', ['version']).status === 0;

/** Assert the rendered source is compilable Go (skipped without the toolchain). */
function expectGoCompiles(source: string): void {
  if (!hasGo) return;
  const dir = mkdtempSync(join(tmpdir(), 'go-render-'));
  try {
    writeFileSync(join(dir, 'go.mod'), 'module render.test\n\ngo 1.21\n');
    writeFileSync(join(dir, 'models.go'), source);
    const result = spawnSync('go', ['build', './...'], { cwd: dir, encoding: 'utf-8' });
    expect(result.status, result.stderr).toBe(0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const STRING: SchemaModel = { kind: 'scalar', scalar: 'string' };
const INT: SchemaModel = { kind: 'scalar', scalar: 'integer' };

function model(schemas: Record<string, SchemaModel>): ApiModel {
  return {
    title: 'Cafe',
    version: '1.0.0',
    services: [],
    schemas: Object.entries(schemas).map(([name, schema]) => ({ name, schema })),
    securitySchemes: [],
  } as unknown as ApiModel;
}

describe('renderGoModels', () => {
  it('renders structs — required as value fields, optional as pointers with omitempty tags', () => {
    const out = renderGoModels(
      model({
        Order: {
          kind: 'object',
          description: 'One placed order.',
          properties: [
            { name: 'id', schema: STRING, required: true },
            { name: 'quantity', schema: INT, required: true },
            { name: 'note', schema: STRING, required: false },
          ],
        },
      })
    );
    expect(out).toContain('// Order — One placed order.');
    expect(out).toContain('type Order struct {');
    expect(out).toContain('Id string `json:"id"`');
    expect(out).toContain('Quantity int64 `json:"quantity"`');
    expect(out).toContain('Note *string `json:"note,omitempty"`');
    expectGoCompiles(out);
  });

  it('flattens allOf; json tags carry wire names for sanitized fields', () => {
    const out = renderGoModels(
      model({
        Base: { kind: 'object', properties: [{ name: 'offset', schema: INT, required: false }] },
        Page: {
          kind: 'intersection',
          members: [
            { kind: 'ref', name: 'Base' },
            {
              kind: 'object',
              properties: [
                { name: 'items', schema: { kind: 'array', items: STRING }, required: true },
                { name: 'go', schema: STRING, required: true }, // Go keyword as a wire name
              ],
            },
          ],
        },
      })
    );
    expect(out).toContain('type Page struct {');
    expect(out).toContain('Items []string `json:"items"`');
    // The exported field name is always usable; the tag keeps the exact wire name.
    expect(out).toContain('`json:"go"`');
    expectGoCompiles(out);
  });

  it('renders named enums as typed consts and discriminated unions with an unmarshal dispatcher', () => {
    const out = renderGoModels(
      model({
        Status: { kind: 'enum', values: ['in-progress', 'done'], scalar: 'string' },
        Cat: { kind: 'object', properties: [] },
        Dog: { kind: 'object', properties: [] },
        Pet: {
          kind: 'union',
          members: [
            { kind: 'ref', name: 'Cat' },
            { kind: 'ref', name: 'Dog' },
          ],
          discriminator: {
            propertyName: 'petType',
            mapping: [
              { value: 'cat', schemaName: 'Cat' },
              { value: 'dog', schemaName: 'Dog' },
            ],
          },
        },
      })
    );
    expect(out).toContain('type Status string');
    expect(out).toContain('StatusInProgress Status = "in-progress"');
    expect(out).toContain('type Pet = any');
    expect(out).toContain('func UnmarshalPet(data []byte) (Pet, error)');
    expect(out).toContain('case "cat":');
    expectGoCompiles(out);
  });

  it('maps nullability and records to pointers and maps', () => {
    const out = renderGoModels(
      model({
        Thing: {
          kind: 'object',
          properties: [
            {
              name: 'tag',
              schema: { kind: 'union', members: [STRING, { kind: 'null' }] },
              required: true,
            },
            { name: 'meta', schema: { kind: 'record', value: STRING }, required: true },
          ],
        },
      })
    );
    expect(out).toContain('Tag *string `json:"tag"`');
    expect(out).toContain('Meta map[string]string `json:"meta"`');
    expectGoCompiles(out);
  });
});

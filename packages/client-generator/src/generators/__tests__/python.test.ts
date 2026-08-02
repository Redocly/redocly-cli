import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ApiModel, SchemaModel } from '../../intermediate-representation/model.js';
import { renderPythonModels } from '../python.js';

const hasPython = spawnSync('python3', ['--version']).status === 0;

/** Assert the rendered source is valid Python (skipped when python3 is absent). */
function expectCompiles(source: string): void {
  if (!hasPython) return;
  const dir = mkdtempSync(join(tmpdir(), 'py-render-'));
  try {
    const file = join(dir, 'models.py');
    writeFileSync(file, source);
    const result = spawnSync('python3', ['-m', 'py_compile', file], { encoding: 'utf-8' });
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

describe('renderPythonModels', () => {
  it('renders an object schema as a dataclass — required fields first, optional with = None', () => {
    const out = renderPythonModels(
      model({
        Order: {
          kind: 'object',
          description: 'One placed order.',
          properties: [
            { name: 'note', schema: STRING, required: false },
            { name: 'id', schema: STRING, required: true },
            { name: 'quantity', schema: INT, required: true },
          ],
        },
      })
    );
    expect(out).toContain('from __future__ import annotations');
    expect(out).toContain('@dataclass\nclass Order:');
    expect(out).toContain('"""One placed order."""');
    // Required (no default) precede optional (= None) — a Python dataclass constraint.
    const id = out.indexOf('id: str');
    const note = out.indexOf('note: Optional[str] = None');
    expect(id).toBeGreaterThan(-1);
    expect(note).toBeGreaterThan(id);
  });

  it('flattens allOf compositions into one dataclass', () => {
    const out = renderPythonModels(
      model({
        Base: {
          kind: 'object',
          properties: [{ name: 'offset', schema: INT, required: false }],
        },
        Page: {
          kind: 'intersection',
          members: [
            { kind: 'ref', name: 'Base' },
            {
              kind: 'object',
              properties: [
                { name: 'items', schema: { kind: 'array', items: STRING }, required: true },
              ],
            },
          ],
        },
      })
    );
    expect(out).toContain('@dataclass\nclass Page:');
    expect(out).toContain('items: List[str]');
    expect(out).toContain('offset: Optional[int] = None');
  });

  it('renders enums with SCREAMING members and unions as aliases with a discriminator table', () => {
    const out = renderPythonModels(
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
    expect(out).toContain('class Status(str, Enum):');
    expect(out).toContain('IN_PROGRESS = "in-progress"');
    expect(out).toContain('Pet = Union[Cat, Dog]');
    expect(out).toContain('# Discriminated by "petType": cat -> Cat, dog -> Dog');
    expectCompiles(out);
  });

  it('sanitizes reserved-word field names and records the wire mapping', () => {
    const out = renderPythonModels(
      model({
        Lesson: {
          kind: 'object',
          properties: [{ name: 'class', schema: STRING, required: true }],
        },
      })
    );
    expect(out).toContain('class_: str');
    expect(out).toContain('"class_": "class"');
    expectCompiles(out);
  });

  it('renders nullable and record shapes idiomatically', () => {
    const out = renderPythonModels(
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
    expect(out).toContain('tag: Optional[str]');
    expect(out).toContain('meta: Dict[str, str]');
  });
});

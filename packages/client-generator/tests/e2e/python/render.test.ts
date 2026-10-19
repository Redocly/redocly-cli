import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PYTHON_CAFE } from '../../../src/generators/__tests__/fixtures/cafe-models.js';
import { generatorInput } from '../../../src/generators/__tests__/fixtures/generator-input.js';
import {
  pythonGenerator as pythonGeneratorEntry,
  renderPythonModels,
} from '../../../src/generators/python/index.js';
import type { ApiModel, SchemaModel } from '../../../src/intermediate-representation/model.js';

// The pipeline parses the output anchor and resolves pagination once; `generatorInput`
// mirrors those steps for these direct calls.
const pythonGenerator = (input: Parameters<typeof generatorInput>[0]) =>
  pythonGeneratorEntry(generatorInput(input));

/**
 * Assert the rendered source imports cleanly. An import runs the class bodies, so it also
 * catches dataclass errors that a syntax check misses, such as a bad field order.
 */
function expectImports(source: string): void {
  const dir = mkdtempSync(join(tmpdir(), 'py-render-'));
  try {
    writeFileSync(join(dir, 'rendered.py'), source);
    const result = spawnSync('python3', ['-c', 'import rendered'], { cwd: dir, encoding: 'utf-8' });
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

describe('renderPythonModels output, imported with python3', () => {
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
    expectImports(out);
  });

  it("renders pydantic models under models: 'pydantic', with wire names as aliases", () => {
    const out = renderPythonModels(
      model({
        Order: {
          kind: 'object',
          properties: [
            { name: 'id', schema: STRING, required: true },
            // A wire name that is not a legal Python field name: the alias carries it.
            { name: 'class', schema: STRING, required: false },
          ],
        },
      }),
      'string',
      'pydantic'
    );
    expect(out).toContain('from pydantic import BaseModel, ConfigDict, Field');
    expect(out).toContain('class Order(BaseModel):');
    expect(out).toContain('model_config = ConfigDict(populate_by_name=True)');
    expect(out).toContain('id: str');
    expect(out).toContain('class_: Optional[str] = Field(default=None, alias="class")');
    // The alias replaces `_field_map`, and `ClassVar` typed only that map.
    expect(out).not.toContain('@dataclass');
    expect(out).not.toContain('_field_map');
    expect(out).not.toContain('ClassVar');
    expect(out).not.toContain('from dataclasses import');
    expectImports(out);
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
    expectImports(out);
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
    expectImports(out);
  });

  it('emits a union alias after the aliases it names', () => {
    const out = renderPythonModels(
      model({
        Action: {
          kind: 'union',
          members: [
            { kind: 'ref', name: 'Feed' },
            { kind: 'ref', name: 'Adopt' },
          ],
          discriminator: {
            propertyName: 'type',
            mapping: [
              { value: 'feed', schemaName: 'Feed' },
              { value: 'adopt', schemaName: 'Adopt' },
            ],
          },
        },
        Feed: { kind: 'object', properties: [] },
        Adopt: {
          kind: 'union',
          members: [
            { kind: 'object', properties: [{ name: 'petId', schema: STRING, required: true }] },
            { kind: 'object', properties: [{ name: 'petName', schema: STRING, required: true }] },
          ],
        },
      })
    );
    expect(out).toContain(
      'Adopt = Union[Any, Any]\n\n# Discriminated by "type": feed -> Feed, adopt -> Adopt\nAction = Union[Feed, Adopt]'
    );
    expectImports(out);
  });

  /** Cat/Dog under a `petType` discriminator; `declares` controls whether they declare it. */
  function petUnion(declares: boolean) {
    const member = {
      kind: 'object' as const,
      properties: declares ? [{ name: 'petType', schema: STRING, required: true }] : [],
    };
    return {
      Cat: member,
      Dog: member,
      Pet: {
        kind: 'union' as const,
        members: [
          { kind: 'ref' as const, name: 'Cat' },
          { kind: 'ref' as const, name: 'Dog' },
        ],
        discriminator: {
          propertyName: 'petType',
          mapping: [
            { value: 'cat', schemaName: 'Cat' },
            { value: 'dog', schemaName: 'Dog' },
          ],
        },
      },
    };
  }

  it('pins the discriminator as a Literal so pydantic resolves a nested union', () => {
    const out = renderPythonModels(model(petUnion(true)), 'string', 'pydantic');
    expect(out).toContain('pet_type: Literal["cat"] = Field(alias="petType")');
    expect(out).toContain('pet_type: Literal["dog"] = Field(alias="petType")');
    expect(out).toContain('Pet = Annotated[Union[Cat, Dog], Field(discriminator="pet_type")]');
    expect(out).toContain('Annotated');
    expectImports(out);
  });

  it('leaves the union plain when its members do not declare the discriminator', () => {
    const out = renderPythonModels(model(petUnion(false)), 'string', 'pydantic');
    expect(out).toContain('Pet = Union[Cat, Dog]');
    expect(out).not.toContain('Annotated');
    // Dataclass mode never annotates: it walks the fields and reads the table itself.
    const dataclasses = renderPythonModels(model(petUnion(true)), 'string', 'dataclass');
    expect(dataclasses).toContain('Pet = Union[Cat, Dog]');
    expect(dataclasses).toContain('pet_type: str');
    expectImports(out);
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
    expectImports(out);
  });

  it('keeps +1 and -1 fields distinct (a collision silently drops one from the field map)', () => {
    const out = renderPythonModels(
      model({
        Reactions: {
          kind: 'object',
          properties: [
            { name: '+1', schema: INT, required: true },
            { name: '-1', schema: INT, required: true },
          ],
        },
      })
    );
    expect(out).toContain('plus_1: int');
    expect(out).toContain('minus_1: int');
    expect(out).toContain('"plus_1": "+1"');
    expect(out).toContain('"minus_1": "-1"');
    expectImports(out);
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
    expectImports(out);
  });
});

function generate(errorMode: 'throw' | 'result' = 'throw'): string {
  const files = pythonGenerator({
    model: PYTHON_CAFE,
    outputPath: '/out/client.ts',
    outputMode: 'single',
    emit: { errorMode },
  });
  expect(files).toHaveLength(1);
  expect(files[0].path).toBe('/out/client.py');
  return files[0].content;
}

describe('pythonGenerator full client, run with python3', () => {
  it('accepts apiKey (the documented, cross-language key) and api_key alike', () => {
    const out = pythonGenerator({
      model: PYTHON_CAFE,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: {},
    })[0].content;
    const dir = mkdtempSync(join(tmpdir(), 'py-auth-'));
    try {
      writeFileSync(join(dir, 'client.py'), out);
      const run = spawnSync(
        'python3',
        [
          '-c',
          [
            'import client',
            'spec = [[{"kind": "apiKey", "scheme": "K", "name": "X-Key", "in": "header"}]]',
            'print(client.resolve_auth(spec, {"apiKey": {"K": "v"}})[0])',
            'print(client.resolve_auth(spec, {"api_key": {"K": "v"}})[0])',
          ].join('\n'),
        ],
        { cwd: dir, encoding: 'utf-8' }
      );
      expect(run.status, run.stderr).toBe(0);
      expect(run.stdout.trim().split('\n')).toEqual(["{'X-Key': 'v'}", "{'X-Key': 'v'}"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('the assembled file imports cleanly in both error modes', () => {
    expectImports(generate());
    expectImports(generate('result'));
  });

  it('maps date/date-time to datetime objects under dateType: Date, and round-trips them', () => {
    const dated: ApiModel = {
      title: 'Cafe',
      version: '1.0.0',
      serverUrl: 'https://api.cafe.example',
      services: [
        {
          name: 'Orders',
          operations: [
            {
              name: 'listOrders',
              specName: 'listOrders',
              method: 'get',
              path: '/orders',
              tags: ['Orders'],
              pathParams: [],
              queryParams: [
                {
                  name: 'since',
                  in: 'query',
                  required: false,
                  schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
                },
              ],
              headerParams: [],
              cookieParams: [],
              security: [],
              successResponses: [
                {
                  status: '200',
                  contentType: 'application/json',
                  schema: { kind: 'array', items: { kind: 'ref', name: 'Order' } },
                },
              ],
              errorResponses: [],
            },
          ],
        },
      ],
      schemas: [
        {
          name: 'Order',
          schema: {
            kind: 'object',
            properties: [
              {
                name: 'placedAt',
                schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
                required: true,
              },
              {
                name: 'dueDate',
                schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date' } },
                required: false,
              },
              {
                name: 'reminders',
                schema: {
                  kind: 'array',
                  items: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
                },
                required: false,
              },
            ],
          },
        },
      ],
      securitySchemes: [],
    } as unknown as ApiModel;

    const out = pythonGenerator({
      model: dated,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: { dateType: 'Date' },
    })[0].content;

    expect(out).toContain('from datetime import date, datetime');
    expect(out).toContain('placed_at: datetime');
    expect(out).toContain('due_date: Optional[date] = None');
    // Nested positions must convert too, not just top-level fields.
    expect(out).toContain('reminders: Optional[List[datetime]] = None');
    expect(out).toContain('since: Optional[datetime] = None');
    // dateType: string (the default) keeps the wire representation.
    const asString = pythonGenerator({
      model: dated,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: {},
    })[0].content;
    expect(asString).toContain('placed_at: str');
    expect(asString).not.toContain('placed_at: datetime');

    // Behavioral: the runtime decodes ISO strings into objects and encodes them back.
    const dir = mkdtempSync(join(tmpdir(), 'py-dates-'));
    try {
      writeFileSync(join(dir, 'client.py'), out);
      const run = spawnSync(
        'python3',
        [
          '-c',
          [
            'import client',
            'order = client.decode(client.Order, {"placedAt": "2026-08-05T10:00:00+00:00", "dueDate": "2026-08-06", "reminders": ["2026-08-07T12:00:00+00:00"]})',
            'print(type(order.placed_at).__name__, type(order.due_date).__name__, type(order.reminders[0]).__name__)',
            'print(client.encode(order))',
          ].join('\n'),
        ],
        { cwd: dir, encoding: 'utf-8' }
      );
      expect(run.status, run.stderr).toBe(0);
      expect(run.stdout).toContain('datetime date datetime');
      expect(run.stdout).toContain('2026-08-06');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('decodes discriminated unions through the DISCRIMINATORS registry', () => {
    const files = pythonGenerator({
      model: {
        title: 'Pets',
        version: '1.0.0',
        serverUrl: 'https://pets.example',
        services: [],
        schemas: [
          { name: 'Cat', schema: { kind: 'object', properties: [] } },
          {
            name: 'Dog',
            schema: {
              kind: 'object',
              properties: [{ name: 'barks', schema: { kind: 'scalar', scalar: 'boolean' } }],
            },
          },
          {
            name: 'Pet',
            schema: {
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
          },
        ],
        securitySchemes: [],
      } as unknown as ApiModel,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: {},
    });
    const out = files[0].content;
    expect(out).toContain('DISCRIMINATORS[Pet] = ("petType", {"cat": Cat, "dog": Dog})');
    // Behavioral: first-member-wins would hydrate {"petType": "dog"} as Cat (empty
    // dataclasses accept anything); the registry must dispatch it to Dog.
    const dir = mkdtempSync(join(tmpdir(), 'py-dispatch-'));
    try {
      writeFileSync(join(dir, 'client.py'), out);
      const run = spawnSync(
        'python3',
        [
          '-c',
          [
            'import client',
            'print(type(client.decode(client.Pet, {"petType": "dog"})).__name__)',
          ].join('\n'),
        ],
        { cwd: dir, encoding: 'utf-8' }
      );
      expect(run.status, run.stderr).toBe(0);
      expect(run.stdout.trim()).toBe('Dog');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

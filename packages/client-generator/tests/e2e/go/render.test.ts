import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { GO_CAFE } from '../../../src/generators/__tests__/fixtures/cafe-models.js';
import { generatorInput } from '../../../src/generators/__tests__/fixtures/generator-input.js';
import {
  goGenerator as goGeneratorEntry,
  renderGoModels,
} from '../../../src/generators/go/index.js';
import type { ApiModel, SchemaModel } from '../../../src/intermediate-representation/model.js';

// The pipeline parses the output anchor and resolves pagination once; `generatorInput`
// mirrors those steps for these direct calls.
const goGenerator = (input: Parameters<typeof generatorInput>[0]) =>
  goGeneratorEntry(generatorInput(input));

// Every `expectGoCompiles` bar shells out to `go build`. The first build on a cold CI
// cache compiles the standard library, so these tests get more time than the project default.
vi.setConfig({ testTimeout: 180_000 });

/** Assert `gofmt` would not change the source — the output must ship idiomatic. */
function expectGofmtClean(source: string): void {
  const dir = mkdtempSync(join(tmpdir(), 'go-fmt-'));
  try {
    const file = join(dir, 'client.go');
    writeFileSync(file, source);
    const listed = spawnSync('gofmt', ['-l', file], { encoding: 'utf-8' });
    expect(listed.status, listed.stderr).toBe(0);
    const diff =
      listed.stdout.trim() === ''
        ? ''
        : spawnSync('gofmt', ['-d', file], { encoding: 'utf-8' }).stdout;
    expect(listed.stdout.trim(), `gofmt would reformat the output:\n${diff}`).toBe('');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Assert the rendered source is compilable Go. */
function expectGoCompiles(source: string): void {
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
describe('renderGoModels output, built with go build', () => {
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
    expect(out).toMatch(/Id\s+string\s+`json:"id"`/);
    expect(out).toMatch(/Quantity\s+int64\s+`json:"quantity"`/);
    expect(out).toMatch(/Note\s+\*string\s+`json:"note,omitempty"`/);
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
    expect(out).toMatch(/Items\s+\[\]string\s+`json:"items"`/);
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

  it('exports digit-leading field names with an N prefix (an _-prefixed field is invisible to encoding/json)', () => {
    const out = renderGoModels(
      model({
        PaymentMethod: {
          kind: 'object',
          properties: [{ name: '3ds', schema: STRING, required: false }],
        },
      })
    );
    expect(out).toMatch(/N3ds\s+\*string\s+`json:"3ds,omitempty"`/);
    expectGoCompiles(out);
  });

  it('keeps +1 and -1 fields distinct and exported (GitHub reactions)', () => {
    const out = renderGoModels(
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
    expect(out).toMatch(/Plus1\s+int64\s+`json:"\+1"`/);
    expect(out).toMatch(/Minus1\s+int64\s+`json:"-1"`/);
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
    expect(out).toMatch(/Tag\s+\*string\s+`json:"tag"`/);
    expect(out).toMatch(/Meta\s+map\[string\]string\s+`json:"meta"`/);
    expectGoCompiles(out);
  });
});

function generateGo(): string {
  const files = goGenerator({
    model: GO_CAFE,
    outputPath: '/out/client.ts',
    outputMode: 'single',
    emit: {},
  });
  expect(files).toHaveLength(1);
  expect(files[0].path).toBe('/out/client.go');
  return files[0].content;
}

describe('goGenerator full client, built with go build', () => {
  it('assembles one compilable file: models + embedded runtime + operations table', () => {
    const out = generateGo();
    expect(out).toContain('var operations = map[string]operationMeta{');
    expect(out).toMatch(/"listOrders":\s+\{/);
    expect(out).toContain('func send(ctx context.Context'); // embedded runtime
    expect(out.match(/^package client$/gm) ?? []).toHaveLength(1);
    expectGoCompiles(out);
  });
});

describe('goGenerator parity features, checked with gofmt and go build', () => {
  it('collapses consecutive blank lines in a doc comment, as gofmt would', () => {
    const out = renderGoModels(
      model({
        Documented: {
          kind: 'object',
          description: 'First paragraph.\n\nSecond paragraph.\n\n\nThird after two blanks.',
          properties: [{ name: 'id', schema: STRING, required: true }],
        },
      })
    );
    expect(out).toContain('// Documented — First paragraph.');
    expect(out).toContain('// Third after two blanks.');
    // Two empty comment lines in a row is exactly what gofmt rewrites.
    expect(out).not.toContain('//\n//\n');
    expectGofmtClean(out);
    expectGoCompiles(out);
  });

  it('emits gofmt-clean output — aligned struct fields and const blocks', () => {
    const out = generateGo();
    // The alignment gofmt would apply, applied by us.
    expect(out).toMatch(/Id\s+string\s+`json:"id"`/);
    expectGofmtClean(out);
  });

  it('maps date/date-time to time.Time and Date under dateType: Date', () => {
    const DATE_TIME: SchemaModel = {
      kind: 'scalar',
      scalar: 'string',
      metadata: { format: 'date-time' },
    };
    const DATE: SchemaModel = { kind: 'scalar', scalar: 'string', metadata: { format: 'date' } };
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
              queryParams: [{ name: 'since', in: 'query', required: false, schema: DATE_TIME }],
              headerParams: [],
              cookieParams: [],
              security: [],
              successResponses: [
                {
                  status: '200',
                  contentType: 'application/json',
                  schema: { kind: 'ref', name: 'Order' },
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
              { name: 'placedAt', schema: DATE_TIME, required: true },
              { name: 'dueDate', schema: DATE, required: false },
              { name: 'reminders', schema: { kind: 'array', items: DATE_TIME }, required: false },
            ],
          },
        },
      ],
      securitySchemes: [],
    } as unknown as ApiModel;

    const out = goGenerator({
      model: dated,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: { dateType: 'Date' },
    })[0].content;

    expect(out).toMatch(/PlacedAt\s+time\.Time\s+`json:"placedAt"`/);
    // A calendar date needs its own type: encoding/json only speaks RFC 3339 for time.Time.
    expect(out).toMatch(/DueDate\s+\*Date\s+`json:"dueDate,omitempty"`/);
    expect(out).toMatch(/Reminders\s+\[\]time\.Time\s+`json:"reminders,omitempty"`/);
    expect(out).toContain('Since *time.Time');
    expect(out).toContain('query.Set("since", (*params.Since).Format(time.RFC3339))');
    expectGoCompiles(out);

    // The default keeps the wire representation.
    const asString = goGenerator({
      model: dated,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: {},
    })[0].content;
    expect(asString).toMatch(/PlacedAt\s+string\s+`json:"placedAt"`/);
  });

  it('models referencing dates compile standalone (the models section imports time)', () => {
    const out = renderGoModels(
      model({
        Order: {
          kind: 'object',
          properties: [
            {
              name: 'placedAt',
              schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
              required: true,
            },
          ],
        },
      }),
      'Date'
    );
    expect(out).toContain('import "time"');
    expect(out).toContain('PlacedAt time.Time');
    expectGoCompiles(out);
  });

  it('honors goPackage for the package clause and rejects a name Go would not accept', () => {
    const out = goGenerator({
      model: GO_CAFE,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: { goPackage: 'rebilly' },
    })[0].content;
    expect(out).toContain('package rebilly');
    expect(out).not.toContain('package client');
    expectGoCompiles(out);

    expect(() =>
      goGenerator({
        model: GO_CAFE,
        outputPath: '/out/client.ts',
        outputMode: 'single',
        emit: { goPackage: 'rebilly-core' },
      })
    ).toThrow(/goPackage "rebilly-core" is not a valid Go package name/);
  });
});

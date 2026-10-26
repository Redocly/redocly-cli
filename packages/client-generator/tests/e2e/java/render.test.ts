import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { JAVA_CAFE } from '../../../src/generators/__tests__/fixtures/cafe-models.js';
import { generatorInput } from '../../../src/generators/__tests__/fixtures/generator-input.js';
import {
  javaGenerator as javaGeneratorEntry,
  renderJavaModels,
} from '../../../src/generators/java/index.js';
import type { ApiModel, SchemaModel } from '../../../src/intermediate-representation/model.js';
import { JAVA_RUNTIME_SOURCE } from '../../../src/runtime-sources/java.js';
import { expectJavacPasses } from './javac.js';

// The pipeline parses the output anchor and resolves pagination once; `generatorInput`
// mirrors those steps for these direct calls.
const javaGenerator = (input: Parameters<typeof generatorInput>[0]) =>
  javaGeneratorEntry(generatorInput(input));

// Every bar starts a JVM for javac; a cold CI runner takes its time over that.
vi.setConfig({ testTimeout: 180_000 });

/** Assert the rendered client source is compilable Java. */
function expectJavaCompiles(source: string): void {
  const dir = mkdtempSync(join(tmpdir(), 'java-render-'));
  try {
    writeFileSync(join(dir, 'Client.java'), source);
    expectJavacPasses(dir, ['Client.java']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * The models section on its own: nested in a class that extends the runtime, so the
 * hydration helpers and marker interfaces the records use resolve as they do in the client.
 */
function expectModelsCompile(models: string): void {
  const dir = mkdtempSync(join(tmpdir(), 'java-models-'));
  try {
    writeFileSync(join(dir, 'Runtime.java'), JAVA_RUNTIME_SOURCE);
    const imports = JAVA_RUNTIME_SOURCE.split('\n').filter((line) => line.startsWith('import '));
    const nested = models
      .split('\n')
      .map((line) => (line === '' ? '' : `    ${line}`))
      .join('\n');
    writeFileSync(
      join(dir, 'Models.java'),
      `${imports.join('\n')}\n\npublic final class Models extends Runtime {\n${nested}}\n`
    );
    expectJavacPasses(dir, ['Runtime.java', 'Models.java']);
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

describe('renderJavaModels output, built with javac', () => {
  it('renders records — boxed components, wire names in fromJson/toJson, optionals skipped when null', () => {
    const out = renderJavaModels(
      model({
        Order: {
          kind: 'object',
          // javac reads `\u` escapes inside comments too, so the path must not break the file.
          description: 'One placed order.\nArchived under C:\\users\\orders.',
          properties: [
            { name: 'id', schema: STRING, required: true },
            { name: 'quantity', schema: INT, required: true },
            { name: 'special-note', schema: STRING, required: false },
          ],
        },
      })
    );
    expect(out).toContain(' * Order — One placed order.');
    expect(out).toContain(' * Archived under C:\\\\users\\\\orders.');
    expect(out).toContain('public record Order(');
    expect(out).toContain('String id,');
    expect(out).toContain('Long quantity,');
    expect(out).toContain('String specialNote');
    expect(out).toContain('asString(data.get("special-note"))'); // wire name survives
    expect(out).toContain('data.put("id", id);');
    expect(out).toContain('if (specialNote != null) {');
    expectModelsCompile(out);
  });

  it('flattens allOf and hydrates nested refs, lists of refs, and enums', () => {
    const out = renderJavaModels(
      model({
        Base: { kind: 'object', properties: [{ name: 'offset', schema: INT, required: false }] },
        Status: { kind: 'enum', values: ['in-progress', 'done'], scalar: 'string' },
        Order: {
          kind: 'object',
          properties: [{ name: 'status', schema: { kind: 'ref', name: 'Status' }, required: true }],
        },
        Page: {
          kind: 'intersection',
          members: [
            { kind: 'ref', name: 'Base' },
            {
              kind: 'object',
              properties: [
                {
                  name: 'items',
                  schema: { kind: 'array', items: { kind: 'ref', name: 'Order' } },
                  required: true,
                },
              ],
            },
          ],
        },
      })
    );
    expect(out).toContain('public record Page(');
    expect(out).toContain('List<Order> items');
    expect(out).toContain('public enum Status implements WireValue {');
    expect(out).toContain('IN_PROGRESS("in-progress"),');
    expect(out).toContain('Status.fromWire(asString(data.get("status")))');
    expect(out).toContain('asList(data.get("items"), item -> Order.fromJson(item))');
    expectModelsCompile(out);
  });

  it('renders discriminated unions as sealed interfaces with a parse dispatcher, and keeps +1/-1 distinct', () => {
    const out = renderJavaModels(
      model({
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
        Owner: {
          kind: 'object',
          properties: [
            { name: 'pet', schema: { kind: 'ref', name: 'Pet' }, required: true },
            {
              name: 'pets',
              schema: { kind: 'array', items: { kind: 'ref', name: 'Pet' } },
              required: false,
            },
          ],
        },
        Reactions: {
          kind: 'object',
          properties: [
            { name: '+1', schema: INT, required: true },
            { name: '-1', schema: INT, required: true },
          ],
        },
      })
    );
    expect(out).toContain('public sealed interface Pet extends JsonValue {}');
    expect(out).toContain('public static Pet parsePet(Object json) {');
    expect(out).toContain('case "cat":');
    expect(out).toContain('return Cat.fromJson(data);');
    // Members implement the interface, so a consumer narrows with instanceof patterns.
    expect(out).toContain('public record Cat(\n) implements JsonValue, Pet {');
    expect(out).toContain('parsePet(data.get("pet"))');
    expect(out).toContain('asList(data.get("pets"), item -> parsePet(item))');
    expect(out).toContain('Long plus1,');
    expect(out).toContain('Long minus1');
    expectModelsCompile(out);
  });

  it('keeps a union whose mapping target has no record as Object, with a raw fallback', () => {
    const out = renderJavaModels(
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
        Log: {
          kind: 'object',
          properties: [{ name: 'action', schema: { kind: 'ref', name: 'Action' }, required: true }],
        },
      })
    );
    expect(out).not.toContain('sealed interface Action');
    expect(out).toContain('public static Object parseAction(Object json) {');
    expect(out).toContain('return Feed.fromJson(data);');
    expect(out).toContain('return data;');
    expect(out).toContain('Object action');
    expectModelsCompile(out);
  });

  it('suffixes a schema whose name the runtime or the JDK already takes', () => {
    const out = renderJavaModels(
      model({
        Config: { kind: 'object', properties: [{ name: 'key', schema: STRING, required: true }] },
        Thread: { kind: 'object', properties: [{ name: 'id', schema: STRING, required: true }] },
        Lesson: {
          kind: 'object',
          properties: [
            { name: 'config', schema: { kind: 'ref', name: 'Config' }, required: true },
            { name: 'class', schema: STRING, required: true },
          ],
        },
      })
    );
    expect(out).toContain('public record ConfigModel(');
    expect(out).toContain('public record ThreadModel(');
    expect(out).toContain('ConfigModel config,');
    // A reserved word as a wire name gets the cross-language trailing underscore.
    expect(out).toContain('String class_');
    expect(out).toContain('asString(data.get("class"))');
    expectModelsCompile(out);
  });
});

function generateJava(): string {
  const files = javaGenerator({
    model: JAVA_CAFE,
    outputPath: '/out/client.ts',
    outputMode: 'single',
    emit: {},
  });
  expect(files).toHaveLength(1);
  expect(files[0].path).toBe('/out/Client.java');
  return files[0].content;
}

describe('javaGenerator full client, built with javac', () => {
  it('assembles one compilable file: models + embedded runtime + methods', () => {
    const out = generateJava();
    expect(out).toContain('public final class Client {');
    expect(out).toContain('static HttpResponse<InputStream> send(Config config, RequestSpec spec)');
    expect(out).toContain('public Iterable<Order> listOrdersItems(ListOrdersParams params) {');
    expectJavaCompiles(out);
  });

  it('maps date/date-time to java.time under dateType: Date, hydrating both ways', () => {
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

    const out = javaGenerator({
      model: dated,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: { dateType: 'Date' },
    })[0].content;

    expect(out).toContain('OffsetDateTime placedAt,');
    expect(out).toContain('LocalDate dueDate,');
    expect(out).toContain('List<OffsetDateTime> reminders');
    expect(out).toContain('asOffsetDateTime(data.get("placedAt"))');
    expect(out).toContain('asList(data.get("reminders"), item -> asOffsetDateTime(item))');
    expect(out).toContain('public OffsetDateTime since;');
    expectJavaCompiles(out);

    // The default keeps the wire representation.
    const asString = javaGenerator({
      model: dated,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: {},
    })[0].content;
    expect(asString).toContain('String placedAt,');
  });
});

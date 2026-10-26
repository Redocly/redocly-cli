import { logger } from '@redocly/openapi-core';

import type { ApiModel, SchemaModel } from '../../../intermediate-representation/model.js';
import { JAVA_CAFE } from '../../__tests__/fixtures/cafe-models.js';
import { generatorInput } from '../../__tests__/fixtures/generator-input.js';
import { javaDocs, javaGenerator as javaGeneratorEntry, javaSample, javaType } from '../index.js';

// The pipeline parses the output anchor and resolves pagination once; `generatorInput`
// mirrors those steps for these direct calls.
const javaGenerator = (input: Parameters<typeof generatorInput>[0]) =>
  javaGeneratorEntry(generatorInput(input));

function generateJava(): string {
  const files = javaGenerator({
    model: JAVA_CAFE,
    outputPath: '/out/client.ts',
    outputMode: 'single',
    emit: {},
  });
  expect(files).toHaveLength(1);
  // One public class per file, named after it: the stem in PascalCase.
  expect(files[0].path).toBe('/out/Client.java');
  return files[0].content;
}

describe('javaGenerator (full client assembly)', () => {
  it('renders one public class nesting the models, the runtime, and a method per operation', () => {
    const out = generateJava();
    expect(out).toContain('public final class Client {');
    expect(out).toContain('public record Order(');
    expect(out).toContain('public static Order fromJson(Object json) {');
    expect(out).toContain('public Map<String, Object> toJson() {');
    expect(out).toContain(
      'static HttpResponse<InputStream> send(Config config, RequestSpec spec) {'
    );
    expect(out).toContain('public Client(Config config) {');
    expect(out).toContain('public Order getOrder(String orderId) {');
    expect(out).toContain('public Order createOrder(Order body) {');
    expect(out).toContain('throw apiErrorFrom(response, url);');
    expect(out).toContain('return Order.fromJson(decodeJson(response));');
    expect(out.match(/^public final class Client \{$/gm) ?? []).toHaveLength(1);
  });

  it('puts optional query parameters in a fluent <Op>Params class; an array repeats the key', () => {
    const out = generateJava();
    expect(out).toContain('public static final class ListOrdersParams {');
    expect(out).toContain('public ListOrdersParams limit(Long limit) {');
    expect(out).toContain('public OrderPage listOrders(ListOrdersParams params) {');
    expect(out).toContain('addQuery(query, "after", params.after);');
    expect(out).toContain('for (Object item : params.tags) {');
    expect(out).toContain('addQuery(query, "tags", item);');
  });

  it('writes the operation literal where it is used — a table of every operation would exceed the JVM method size', () => {
    const out = generateJava();
    expect(out).toContain(
      'Operation op = new Operation("listOrders", "GET", "/orders", List.of(List.of(SecuritySpec.of("BearerAuth", "bearer"))), new PaginationSpec("cursor", "after", "/next", null, null, null, "/items"));'
    );
    expect(out).not.toContain('OPERATIONS');
  });

  it('returns raw bytes for a non-JSON success body', () => {
    const out = generateJava();
    expect(out).toContain('public byte[] getOrderPdf(String orderId) {');
    expect(out).toContain('return readBody(response);');
  });
});

describe('javaType', () => {
  const model = {
    ...JAVA_CAFE,
    schemas: [
      ...JAVA_CAFE.schemas,
      { name: 'Tags', schema: { kind: 'array', items: { kind: 'scalar', scalar: 'string' } } },
    ],
  } as unknown as ApiModel;

  it.each<[string, SchemaModel, string]>([
    [
      'a nullable scalar stays boxed',
      { kind: 'union', members: [{ kind: 'scalar', scalar: 'integer' }, { kind: 'null' }] },
      'Long',
    ],
    [
      'a map',
      { kind: 'record', value: { kind: 'scalar', scalar: 'boolean' } },
      'Map<String, Boolean>',
    ],
    [
      'an inline enum keeps its wire type',
      { kind: 'enum', values: ['a'], scalar: 'string' },
      'String',
    ],
    ['a number literal', { kind: 'literal', value: 1 }, 'Double'],
    ['a boolean literal', { kind: 'literal', value: true }, 'Boolean'],
    ['an omit is its base record', { kind: 'omit', base: 'Order', keys: ['id'] }, 'Order'],
    ['a ref to an alias is the alias target', { kind: 'ref', name: 'Tags' }, 'List<String>'],
    ['a ref to nothing', { kind: 'ref', name: 'Missing' }, 'Object'],
    [
      'an undiscriminated union',
      {
        kind: 'union',
        members: [
          { kind: 'scalar', scalar: 'string' },
          { kind: 'scalar', scalar: 'integer' },
        ],
      },
      'Object',
    ],
  ])('%s', (_case, schema, expected) => {
    expect(javaType(schema, model)).toBe(expected);
  });
});

describe('security, binary bodies, and the reference page', () => {
  const secured = {
    ...JAVA_CAFE,
    securitySchemes: [
      { key: 'BearerAuth', kind: 'bearer' },
      { key: 'ApiKey', kind: 'apiKeyHeader', headerName: 'X-Api-Key' },
      { key: 'Basic', kind: 'basic' },
    ],
    services: [
      {
        ...JAVA_CAFE.services[0],
        operations: [
          {
            name: 'putReceipt',
            specName: 'putReceipt',
            method: 'put',
            path: '/orders/{orderId}/receipt',
            tags: ['Orders'],
            pathParams: [
              {
                name: 'orderId',
                in: 'path',
                required: true,
                schema: { kind: 'scalar', scalar: 'string' },
              },
            ],
            queryParams: [],
            headerParams: [],
            cookieParams: [],
            security: [['ApiKey'], ['Basic']],
            requestBody: {
              contentType: 'application/pdf',
              required: true,
              schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'binary' } },
            },
            successResponseHeaders: [
              { name: 'etag', schema: { kind: 'scalar', scalar: 'string' } },
            ],
            successResponses: [{ status: '204', contentType: '', schema: { kind: 'unknown' } }],
            errorResponses: [],
          },
        ],
      },
    ],
  } as unknown as ApiModel;

  it('denormalizes apiKey and basic alternatives and passes a binary body through', () => {
    const out = javaGenerator({
      model: secured,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: {},
    })[0].content;
    expect(out).toContain(
      'List.of(List.of(new SecuritySpec("ApiKey", "apiKey", "X-Api-Key", "header")), List.of(SecuritySpec.of("Basic", "basic")))'
    );
    expect(out).toContain('public void putReceipt(String orderId, Object body) {');
    expect(out).toContain('Body payload = binaryBody(body, "application/pdf");');
    // A bodiless success still gets its headers.
    expect(out).toContain(
      'public Envelope<Void> putReceiptWithHeaders(String orderId, Object body) {'
    );
    expect(out).toContain(
      'return new Envelope<>(null, readEnvelopeHeaders(response, new String[][] {{"etag", "etag", "string"}}), response.statusCode());'
    );
  });

  it('writes <stem>.java.md with the Java call of each operation', () => {
    const [page] = javaDocs(
      generatorInput({
        model: secured,
        outputPath: '/out/client.ts',
        outputMode: 'single',
        emit: {},
      })
    );
    expect(page.path).toBe('/out/client.java.md');
    expect(page.content).toContain('# Cafe Orders API Java SDK reference');
    expect(page.content).toContain('```java');
    expect(page.content).toContain('client.putReceipt("<orderId>", body);');
  });
});

describe('query and sample shapes', () => {
  it('repeats the key of a list parameter declared through a $ref, and moves a Params class aside from a schema of that name', () => {
    const model = {
      ...JAVA_CAFE,
      schemas: [
        ...JAVA_CAFE.schemas,
        { name: 'TagList', schema: { kind: 'array', items: { kind: 'scalar', scalar: 'string' } } },
        { name: 'ListOrdersParams', schema: { kind: 'object', properties: [] } },
      ],
      services: [
        {
          ...JAVA_CAFE.services[0],
          operations: JAVA_CAFE.services[0].operations.map((op) =>
            op.name === 'listOrders'
              ? {
                  ...op,
                  queryParams: [
                    ...op.queryParams.filter((param) => param.name !== 'tags'),
                    {
                      name: 'tags',
                      in: 'query',
                      required: false,
                      schema: { kind: 'ref', name: 'TagList' },
                    },
                  ],
                }
              : op
          ),
        },
      ],
    } as unknown as ApiModel;
    const out = javaGenerator({
      model,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: {},
    })[0].content;
    expect(out).toContain('public record ListOrdersParams(');
    expect(out).toContain('public static final class ListOrdersParams2 {');
    expect(out).toContain('public OrderPage listOrders(ListOrdersParams2 params) {');
    expect(out).toContain('for (Object item : params.tags) {');
    expect(out).toContain('addQuery(query, "tags", item);');
  });

  it('the sample matches the return shape: void has no result, SSE is iterated, a stem names the class', () => {
    const ctx = { model: JAVA_CAFE, outputPath: '/out/openapi.client.ts', emit: {} };
    const listOrders = JAVA_CAFE.services[0].operations.find((op) => op.name === 'listOrders')!;
    expect(javaSample(listOrders, ctx)?.source).toContain(
      'OpenapiClient client = new OpenapiClient(new OpenapiClient.Config());'
    );
    expect(javaSample(listOrders, ctx)?.source).toContain(
      'OrderPage result = client.listOrders(new OpenapiClient.ListOrdersParams());'
    );
    const upload = JAVA_CAFE.services[0].operations.find((op) => op.name === 'uploadPhoto')!;
    expect(javaSample(upload, ctx)?.source).toContain('client.uploadPhoto(body);');
    const streamEvents = JAVA_CAFE.services[0].operations.find((op) => op.name === 'streamEvents')!;
    expect(javaSample(streamEvents, ctx)?.source).toContain(
      'for (var event : client.streamEvents()) {'
    );
  });
});

describe('javaGenerator parity features', () => {
  it('paginated operations gain Pages/Items iterables with typed elements', () => {
    const out = generateJava();
    expect(out).toContain('public Iterable<OrderPage> listOrdersPages(ListOrdersParams params) {');
    expect(out).toContain('public Iterable<Order> listOrdersItems(ListOrdersParams params) {');
    expect(out).toContain(
      'return mapIterable(iterPages(call, op.pagination(), base), page -> OrderPage.fromJson(page));'
    );
    expect(out).toContain('item -> Order.fromJson(item));');
  });

  it('SSE operations stream events; multipart bodies route through multipartBody', () => {
    const out = generateJava();
    expect(out).toContain('public Iterable<ServerSentEvent> streamEvents() {');
    expect(out).toContain('return iterSse(extraHeaders -> {');
    expect(out).toContain('Body payload = multipartBody(body);');
  });

  it('resolves SSE auth on every open, so a reconnect asks the token supplier again', () => {
    expect(generateJava()).toMatch(
      /return iterSse\(extraHeaders -> \{\n\s+ResolvedAuth auth = resolveAuth\(op\.security\(\), config\.auth\);/
    );
  });

  it('emits a WithHeaders envelope variant only for ops with declared response headers', () => {
    const out = generateJava();
    expect(out).toContain(
      'public Envelope<OrderPage> listOrdersWithHeaders(ListOrdersParams params) {'
    );
    expect(out).toContain(
      'readEnvelopeHeaders(response, new String[][] {{"pagination-total", "paginationTotal", "integer"}, {"link", "link", "string"}})'
    );
    expect(out).not.toContain('getOrderWithHeaders');
  });

  it('bakes the serverUrl option, not just the description server', () => {
    const files = javaGenerator({
      model: JAVA_CAFE,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: { serverUrl: 'https://override.example' },
    });
    expect(files[0].content).toContain('config.serverUrl = "https://override.example";');
  });

  it('emits one Servers method per declared server with variables as parameters', () => {
    const out = generateJava();
    expect(out).toContain('public static String liveServer(String organizationId) {');
    expect(out).toContain('public static String sandboxServer(String organizationId) {');
    expect(out).toContain('return "https://api.cafe.example/organizations/" + organizationId;');
    // Java has no default arguments; the spec default lives in the doc comment.
    expect(out).toContain('organizationId default: "unknown"');
  });

  it.each([
    ['Java', 'java_'],
    ['Class', 'class_'],
    ['3D Printing API', '_3dprintingapi'],
    ['Кафе', 'api'],
  ])('follows the Oracle package convention for the title %j and says so', (title, expected) => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const out = javaGenerator({
      model: { ...JAVA_CAFE, title } as ApiModel,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: {},
    })[0].content;
    expect(out).toContain(`\npackage ${expected};\n`);
    expect(warn).toHaveBeenCalledWith(
      `generate-client: the API title ${JSON.stringify(title)} cannot be a Java package as is, so the java SDK uses package "${expected}" — rename the API title in the description to choose another.\n`
    );
  });

  it('declares a package derived from the API title, so the class can be imported', () => {
    // `Cafe Orders API`: lowercase words run together, the Java package convention.
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const out = generateJava();
    expect(out).toContain('\npackage cafeordersapi;\n');
    // The package is the title's own words, so there is nothing to explain.
    expect(warn).not.toHaveBeenCalled();
    const sample = javaSample(JAVA_CAFE.services[0].operations[0], {
      model: JAVA_CAFE,
      outputPath: '/out/client.ts',
      emit: {},
    });
    expect(sample.source).toContain('import cafeordersapi.Client;');
  });

  it('rejects an output stem that names a runtime type — inside the class the name would mean the class', () => {
    expect(() =>
      javaGenerator({
        model: JAVA_CAFE,
        outputPath: '/out/config.ts',
        outputMode: 'single',
        emit: {},
      })
    ).toThrow(/gives the Java class the name "Config", which the SDK already uses/);
  });

  it('rejects an output stem that names a schema — the schema could not nest inside the class', () => {
    const model = {
      ...JAVA_CAFE,
      schemas: [
        ...JAVA_CAFE.schemas,
        { name: 'Client', schema: { kind: 'object', properties: [] } },
      ],
    } as unknown as ApiModel;
    expect(() =>
      javaGenerator({ model, outputPath: '/out/client.ts', outputMode: 'single', emit: {} })
    ).toThrow(/the same name as the "Client" schema/);
    // Another stem resolves it without renaming the schema behind the user's back.
    const files = javaGenerator({
      model,
      outputPath: '/out/cafe.ts',
      outputMode: 'single',
      emit: {},
    });
    expect(files[0].path).toBe('/out/Cafe.java');
    expect(files[0].content).toContain('public record Client(');
  });

  it('writes the runtime as a base class the client extends under --runtime module', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    try {
      const files = javaGenerator({
        model: JAVA_CAFE,
        outputPath: '/out/client.ts',
        outputMode: 'single',
        emit: { runtime: 'module' },
      });
      expect(files.map((file) => file.path)).toEqual([
        '/out/Client.java',
        '/out/ClientRuntime.java',
      ]);
      expect(files[0].content).toContain('public final class Client extends ClientRuntime {');
      expect(files[0].content).not.toContain('Embedded runtime');
      expect(files[1].content).toContain('public abstract class ClientRuntime {');
      expect(files[1].content.startsWith('// Generated by @redocly/client-generator')).toBe(true);
    } finally {
      warn.mockRestore();
    }
  });
});

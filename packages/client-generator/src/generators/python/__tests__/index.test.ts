import type { ApiModel, SchemaModel } from '../../../intermediate-representation/model.js';
import { PYTHON_CAFE } from '../../__tests__/fixtures/cafe-models.js';
import { generatorInput } from '../../__tests__/fixtures/generator-input.js';
import { pythonGenerator as pythonGeneratorEntry } from '../index.js';

// The pipeline parses the output anchor and resolves pagination once; `generatorInput`
// mirrors those steps for these direct calls.
const pythonGenerator = (input: Parameters<typeof generatorInput>[0]) =>
  pythonGeneratorEntry(generatorInput(input));

const STRING: SchemaModel = { kind: 'scalar', scalar: 'string' };

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

describe('python output path', () => {
  const pathFor = (outputPath: string) =>
    pythonGenerator({ model: PYTHON_CAFE, outputPath, outputMode: 'single', emit: {} })[0].path;

  it('emits an importable module name — the TypeScript stem is not one', () => {
    // `openapi.client.py` and `rebilly-core.client.py` cannot be imported by name.
    expect(pathFor('/out/openapi.client.ts')).toBe('/out/openapi_client.py');
    expect(pathFor('/out/rebilly-core.client.ts')).toBe('/out/rebilly_core_client.py');
    // A stem that is already importable is left alone.
    expect(pathFor('/out/client.ts')).toBe('/out/client.py');
    // A leading digit would be a syntax error in an import.
    expect(pathFor('/out/3rd-party.client.ts')).toBe('/out/_3rd_party_client.py');
  });
});

describe('pythonGenerator (full client assembly)', () => {
  it('renders typed sync methods — kwargs for query params, positional path params, hydrated returns', () => {
    const out = generate();
    expect(out).toContain('class Client:');
    expect(out).toContain(
      'def list_orders(self, *, after: Optional[str] = None, limit: Optional[int] = None'
    );
    expect(out).toContain(') -> OrderPage:');
    expect(out).toContain('def get_order(self, order_id: str, *');
    expect(out).toContain('def create_order(self, body: Order, *');
    expect(out).toContain('return cast(OrderPage, decode(OrderPage, _safe_json(response)))');
    // Wire names survive the snake_case kwargs.
    expect(out).toContain('params["after"] = encode(after)');
  });

  it('embeds the runtime, the descriptor table, and an async mirror', () => {
    const out = generate();
    expect(out).toContain('def send('); // embedded runtime
    expect(out).toContain('async def send_async('); // async mirror
    expect(out).toContain('_OPERATIONS: Dict[str, Dict[str, Any]] = {');
    expect(out).toContain('"id": "listOrders"');
    expect(out).toContain('class AsyncClient:');
    expect(out).toContain('async def list_orders(');
    expect(out).not.toContain('from ._'); // relative imports stitched away
  });

  it('raises ApiError in throw mode; returns Result in result mode', () => {
    expect(generate('throw')).toContain('raise ApiError(');
    const result = generate('result');
    expect(result).toContain(') -> Result[OrderPage, Any]:');
    expect(result).toContain('return Result(data=None, error=');
  });
});

describe('pythonGenerator parity features', () => {
  it('paginated operations gain pages/items iterators, sync and async', () => {
    const out = generate();
    expect(out).toContain('"pagination": {"style": "cursor", "param": "after"');
    expect(out).toContain('def list_orders_pages(');
    expect(out).toContain('def list_orders_items(');
    expect(out).toContain('-> Iterator[Order]:'); // typed via schemaAtPointer on the items pointer
    expect(out).toContain('iter_pages(');
    expect(out).toContain('async for page in aiter_pages(');
    expect(out).toContain('-> Iterator[OrderPage]:');
  });

  it('SSE operations stream typed events; multipart bodies route through to_multipart', () => {
    const out = generate();
    expect(out).toContain('def stream_events(');
    expect(out).toContain('-> Iterator[ServerSentEvent]:');
    expect(out).toContain('iter_sse(');
    expect(out).toContain('-> AsyncIterator[ServerSentEvent]:');
    expect(out).toContain('aiter_sse(');
    expect(out).toContain('form_data, form_files = to_multipart(body)');
    expect(out).not.toContain('**multipart_arguments(body)');
  });

  it('emits a _with_headers envelope variant only for ops with declared response headers', () => {
    const out = generate();
    expect(out).toContain('def list_orders_with_headers(');
    expect(out).toContain('async def list_orders_with_headers(');
    expect(out).toContain(') -> Envelope[OrderPage]:');
    expect(out).toContain(
      'read_envelope_headers(response, [("pagination-total", "pagination_total", "integer"), ("link", "link", "string")])'
    );
    // No declared headers, no variant.
    expect(out).not.toContain('get_order_with_headers');
  });

  it('iterator signatures annotate a date query param like the method does', () => {
    // The `_pages`/`_items` wrappers dropped `dateType`, so `since` was `str` on the
    // iterator while the method beside it said `datetime`.
    const paged: ApiModel = {
      title: 'Cafe',
      version: '1.0.0',
      serverUrl: 'https://api.cafe.example',
      schemas: [],
      securitySchemes: [],
      services: [
        {
          name: 'Orders',
          operations: [
            {
              name: 'listOrders',
              specName: 'listOrders',
              method: 'get',
              path: '/orders',
              tags: [],
              pathParams: [],
              queryParams: [
                {
                  name: 'after',
                  in: 'query',
                  required: false,
                  schema: { kind: 'scalar', scalar: 'string' },
                },
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
              paginationExtension: {
                style: 'cursor',
                cursorParam: 'after',
                nextCursor: '/next',
                items: '/items',
              },
              successResponses: [
                {
                  status: '200',
                  contentType: 'application/json',
                  schema: {
                    kind: 'object',
                    properties: [
                      {
                        name: 'items',
                        schema: { kind: 'array', items: { kind: 'object', properties: [] } },
                        required: true,
                      },
                      { name: 'next', schema: STRING, required: false },
                    ],
                  },
                },
              ],
              errorResponses: [],
            },
          ],
        },
      ],
    } as unknown as ApiModel;
    const out = pythonGenerator({
      model: paged,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: { dateType: 'Date' },
    })[0].content;
    expect(out).toMatch(/def list_orders_pages\([^)]*since: Optional\[datetime\]/);
    expect(out).not.toMatch(/def list_orders_pages\([^)]*since: Optional\[str\]/);
  });

  it('bakes the serverUrl option, not just the description server', () => {
    const files = pythonGenerator({
      model: PYTHON_CAFE,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: { serverUrl: 'https://override.example' },
    });
    expect(files[0].content).toContain('server_url: str = "https://override.example"');
  });

  it('emits a Servers class with keyword arguments defaulting to the spec defaults', () => {
    const out = generate();
    expect(out).toContain('class Servers:');
    expect(out).toContain('def live_server(organization_id: str = "unknown") -> str:');
    expect(out).toContain('def sandbox_server(organization_id: str = "unknown") -> str:');
    expect(out).toContain('return "https://api.cafe.example/organizations/" + organization_id');
  });
});

import { goGenerator as goGeneratorEntry, goSample } from '../go/index.js';
import { GO_CAFE } from './fixtures/cafe-models.js';
import { generatorInput } from './fixtures/generator-input.js';

// The pipeline parses the output anchor and resolves pagination once; `generatorInput`
// mirrors those steps for these direct calls.
const goGenerator = (input: Parameters<typeof generatorInput>[0]) =>
  goGeneratorEntry(generatorInput(input));

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

describe('goGenerator (full client assembly)', () => {
  it('renders (T, error) methods over the operations table with typed params structs', () => {
    const out = generateGo();
    expect(out).toContain('type Client struct {');
    expect(out).toContain('func New(config Config) *Client {');
    expect(out).toContain('type ListOrdersParams struct {');
    expect(out).toContain('After *string');
    expect(out).toContain(
      'func (c *Client) ListOrders(ctx context.Context, params *ListOrdersParams) (OrderPage, error) {'
    );
    expect(out).toContain(
      'func (c *Client) GetOrder(ctx context.Context, orderId string) (Order, error) {'
    );
    expect(out).toContain(
      'func (c *Client) CreateOrder(ctx context.Context, body Order) (Order, error) {'
    );
    expect(out).toContain('return out, apiErrorFrom(resp, requestURL)');
  });
});

describe('query and sample shapes', () => {
  it('an array query param repeats the key per element — fmt.Sprint would send "[a b]"', () => {
    const out = generateGo();
    expect(out).toContain('for _, item := range *params.Tags {');
    expect(out).toContain('query.Add("tags", item)');
    expect(out).not.toContain('query.Set("tags"');
  });

  it('the sample assignment matches the return shape: void has no result, SSE is one value', () => {
    const ctx = { model: GO_CAFE, outputPath: '/out/client.ts', emit: {} };
    const listOrders = GO_CAFE.services[0].operations.find((op) => op.name === 'listOrders')!;
    expect(goSample(listOrders, ctx)?.source).toContain('result, err := client.ListOrders(');
    const streamEvents = GO_CAFE.services[0].operations.find((op) => op.name === 'streamEvents')!;
    expect(goSample(streamEvents, ctx)?.source).toContain('stream := client.StreamEvents(');
  });
});

describe('goGenerator parity features', () => {
  it('paginated operations gain Pages/Items yield-func iterators with typed elements', () => {
    const out = generateGo();
    expect(out).toContain('Pagination: &PaginationSpec{Style: "cursor", Param: "after"');
    expect(out).toContain(
      'func (c *Client) ListOrdersPages(ctx context.Context, params *ListOrdersParams) func(yield func(OrderPage, error) bool) {'
    );
    expect(out).toContain(
      'func (c *Client) ListOrdersItems(ctx context.Context, params *ListOrdersParams) func(yield func(Order, error) bool) {'
    );
    expect(out).toContain('iterPages(call, *op.Pagination, base)');
  });

  it('SSE operations stream events; multipart bodies route through toMultipart', () => {
    const out = generateGo();
    expect(out).toContain(
      'func (c *Client) StreamEvents(ctx context.Context) func(yield func(ServerSentEvent, error) bool) {'
    );
    expect(out).toContain('return iterSSE(open,');
    expect(out).toContain('contentType, reader, err := toMultipart(body)');
  });

  it('emits a WithHeaders envelope variant only for ops with declared response headers', () => {
    const out = generateGo();
    expect(out).toContain('type ListOrdersHeaders struct {');
    expect(out).toMatch(/PaginationTotal\s+\*int64/);
    expect(out).toMatch(/Link\s+\*string/);
    expect(out).toContain(
      'func (c *Client) ListOrdersWithHeaders(ctx context.Context, params *ListOrdersParams) (OrderPage, ListOrdersHeaders, error) {'
    );
    expect(out).toContain('headers.PaginationTotal = headerInt64(resp.Header, "pagination-total")');
    expect(out).toContain('return out, headers, nil');
    // No declared headers, no variant.
    expect(out).not.toContain('GetOrderWithHeaders');
  });

  it('bakes the serverUrl option, not just the description server', () => {
    const files = goGenerator({
      model: GO_CAFE,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: { serverUrl: 'https://override.example' },
    });
    expect(files[0].content).toContain('config.ServerURL = "https://override.example"');
  });

  it('emits one URL function per declared server with variables as parameters', () => {
    const out = generateGo();
    expect(out).toContain('func LiveServerURL(organizationId string) string {');
    expect(out).toContain('func SandboxServerURL(organizationId string) string {');
    expect(out).toContain('return "https://api.cafe.example/organizations/" + organizationId');
    // Go has no default arguments; the spec default lives in the doc comment.
    expect(out).toContain('organizationId default: "unknown"');
  });
});

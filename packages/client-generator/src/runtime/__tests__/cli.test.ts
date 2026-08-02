import { parseInvocation, runCli, type CliCommand, type CliWiring } from '../cli.js';

const LIST: CliCommand = {
  group: 'orders',
  name: 'listOrders',
  summary: 'List orders.',
  method: 'GET',
  path: '/orders',
  positionals: [],
  flags: [
    { name: 'status', param: 'status', type: 'string', required: false, enum: ['open', 'closed'] },
    { name: 'limit', param: 'limit', type: 'number', required: false },
    { name: 'tag', param: 'tag', type: 'array', required: false },
  ],
  paginated: true,
};
const GET: CliCommand = {
  group: 'orders',
  name: 'getOrder',
  method: 'GET',
  path: '/orders/{orderId}',
  positionals: [{ name: 'orderId' }],
  flags: [],
};
const CREATE: CliCommand = {
  group: 'orders',
  name: 'createOrder',
  method: 'POST',
  path: '/orders',
  positionals: [],
  flags: [],
  body: { required: true },
  schemas: { request: { kind: 'object' } },
};
const PING: CliCommand = { name: 'ping', method: 'GET', path: '/ping', positionals: [], flags: [] };
const COMMANDS = [LIST, GET, CREATE, PING];

describe('parseInvocation', () => {
  it('routes group + name, coerces flag types, repeats arrays, accepts --flag=value', () => {
    const parsed = parseInvocation(COMMANDS, [
      'orders',
      'listOrders',
      '--status',
      'open',
      '--limit=10',
      '--tag',
      'a',
      '--tag',
      'b',
    ]);
    expect(parsed).toMatchObject({
      kind: 'run',
      command: LIST,
      params: { status: 'open', limit: 10, tag: ['a', 'b'] },
    });
  });

  it('binds positionals in path order and routes untagged commands flat', () => {
    expect(parseInvocation(COMMANDS, ['orders', 'getOrder', 'ord_1'])).toMatchObject({
      kind: 'run',
      positionals: { orderId: 'ord_1' },
    });
    expect(parseInvocation(COMMANDS, ['ping'])).toMatchObject({ kind: 'run', command: PING });
  });

  it('extracts global flags and leaves the body source raw', () => {
    const parsed = parseInvocation(COMMANDS, [
      'orders',
      'createOrder',
      '--json',
      '{"a":1}',
      '--dry-run',
      '--server-url',
      'http://x',
      '--format',
      'ndjson',
    ]);
    expect(parsed).toMatchObject({
      kind: 'run',
      globals: { json: '{"a":1}', dryRun: true, serverUrl: 'http://x', format: 'ndjson' },
    });
  });

  it.each([
    [['nowhere'], /unknown command/i],
    [['orders', 'nowhere'], /unknown command/i],
    [['orders', 'listOrders', '--bogus', 'x'], /unknown flag/i],
    [['orders', 'listOrders', '--limit', 'ten'], /expects a number/i],
    [['orders', 'listOrders', '--status', 'stale'], /one of: open, closed/i],
    [['orders', 'getOrder'], /missing required argument/i],
    [['orders', 'getOrder', 'a', 'b'], /unexpected argument/i],
    [['orders', 'getOrder', 'a', '--json', '{}'], /does not accept a request body/i],
    [['orders', 'createOrder'], /requires a request body/i],
    [['orders', 'listOrders', '--format', 'xml'], /one of: json, ndjson/i],
  ])('usage error for %j', (argv, message) => {
    expect(parseInvocation(COMMANDS, argv as string[])).toMatchObject({
      kind: 'usage-error',
      message: expect.stringMatching(message),
    });
  });

  it('recognizes help at root, group, and command level, and the schema pseudo-command', () => {
    expect(parseInvocation(COMMANDS, [])).toMatchObject({ kind: 'help' });
    expect(parseInvocation(COMMANDS, ['--help'])).toMatchObject({ kind: 'help' });
    expect(parseInvocation(COMMANDS, ['orders', '--help'])).toMatchObject({
      kind: 'help',
      topic: 'orders',
    });
    expect(parseInvocation(COMMANDS, ['orders', 'listOrders', '--help'])).toMatchObject({
      kind: 'help',
      topic: LIST,
    });
    expect(parseInvocation(COMMANDS, ['schema', 'createOrder'])).toMatchObject({
      kind: 'schema',
      command: CREATE,
    });
    expect(parseInvocation(COMMANDS, ['schema', 'nowhere'])).toMatchObject({
      kind: 'usage-error',
    });
  });
});

type FakeCall = { name: string; variables: unknown };

function fakeWiring(overrides: Partial<CliWiring> & { results?: Record<string, unknown> } = {}) {
  const calls: FakeCall[] = [];
  const configured: Record<string, unknown>[] = [];
  const out: string[] = [];
  const err: string[] = [];
  const { results = {}, ...rest } = overrides;
  const client: Record<string, unknown> = {};
  for (const command of COMMANDS) {
    const method = async (variables: unknown) => {
      calls.push({ name: command.name, variables });
      const result = results[command.name];
      if (result instanceof Error) throw result;
      return result;
    };
    client[command.name] = Object.assign(method, {
      pages: async function* (variables: unknown) {
        calls.push({ name: `${command.name}.pages`, variables });
        yield { items: [1] };
        yield { items: [2] };
      },
    });
  }
  const wiring: CliWiring = {
    binName: 'cafe',
    client,
    configure: (config) => configured.push(config as Record<string, unknown>),
    schemes: [{ key: 'BearerAuth', kind: 'bearer' }],
    env: {},
    stdout: (line) => out.push(line),
    stderr: (line) => err.push(line),
    ...rest,
  };
  return { wiring, calls, configured, out, err };
}

describe('runCli', () => {
  it('dispatches grouped args and pretty-prints the JSON result', async () => {
    const { wiring, calls, out } = fakeWiring({ results: { getOrder: { id: 'ord_1' } } });
    const code = await runCli(COMMANDS, wiring, ['orders', 'getOrder', 'ord_1']);
    expect(code).toBe(0);
    expect(calls).toEqual([{ name: 'getOrder', variables: { orderId: 'ord_1' } }]);
    expect(JSON.parse(out.join('\n'))).toEqual({ id: 'ord_1' });
  });

  it('passes query params under `params` and prints nothing for void results', async () => {
    const { wiring, calls, out } = fakeWiring();
    const code = await runCli(COMMANDS, wiring, ['orders', 'listOrders', '--status', 'open']);
    expect(code).toBe(0);
    expect(calls[0]).toEqual({ name: 'listOrders', variables: { params: { status: 'open' } } });
    expect(out).toEqual([]);
  });

  it('loads --json bodies inline, from @file, and from @- (stdin)', async () => {
    const { wiring, calls } = fakeWiring({
      readFile: () => '{"from":"file"}',
      stdin: () => '{"from":"stdin"}',
    });
    await runCli(COMMANDS, wiring, ['orders', 'createOrder', '--json', '{"from":"inline"}']);
    await runCli(COMMANDS, wiring, ['orders', 'createOrder', '--json', '@body.json']);
    await runCli(COMMANDS, wiring, ['orders', 'createOrder', '--json', '@-']);
    expect(calls.map((call) => (call.variables as { body: unknown }).body)).toEqual([
      { from: 'inline' },
      { from: 'file' },
      { from: 'stdin' },
    ]);
  });

  it('malformed --json is a usage error: JSON error object on stderr, exit 4, no dispatch', async () => {
    const { wiring, calls, err } = fakeWiring();
    const code = await runCli(COMMANDS, wiring, ['orders', 'createOrder', '--json', '{nope']);
    expect(code).toBe(4);
    expect(calls).toEqual([]);
    expect(JSON.parse(err.join('\n')).error.code).toBe(4);
  });

  it.each([
    [Object.assign(new Error('boom'), { name: 'ApiError', status: 500 }), 1],
    [Object.assign(new Error('nope'), { name: 'ApiError', status: 401 }), 2],
    [Object.assign(new Error('bad'), { name: 'ZodValidationError' }), 3],
    [new Error('plain'), 1],
  ])('maps thrown %o to exit %i with a JSON error on stderr', async (error, expected) => {
    const { wiring, err } = fakeWiring({ results: { ping: error } });
    const code = await runCli(COMMANDS, wiring, ['ping']);
    expect(code).toBe(expected);
    const printed = JSON.parse(err.join('\n')).error;
    expect(printed.code).toBe(expected);
    expect(printed.message).toBe(error.message);
  });

  it('resolves bearer auth from <PREFIX>_TOKEN; --token wins over env', async () => {
    const { wiring, configured } = fakeWiring({ env: { CAFE_TOKEN: 'from-env' } });
    await runCli(COMMANDS, wiring, ['ping']);
    expect(configured[0]).toEqual({ auth: { bearer: 'from-env' } });

    const flagged = fakeWiring({ env: { CAFE_TOKEN: 'from-env' } });
    await runCli(COMMANDS, flagged.wiring, ['ping', '--token', 'from-flag']);
    expect(flagged.configured[0]).toEqual({ auth: { bearer: 'from-flag' } });
  });

  it('resolves basic and apiKey credentials from prefixed env vars', async () => {
    const { wiring, configured } = fakeWiring({
      schemes: [
        { key: 'BasicAuth', kind: 'basic' },
        { key: 'ApiKeyAuth', kind: 'apiKey' },
      ],
      env: { CAFE_USERNAME: 'u', CAFE_PASSWORD: 'p', CAFE_API_KEY_API_KEY_AUTH: 'k' },
    });
    await runCli(COMMANDS, wiring, ['ping']);
    expect(configured[0]).toEqual({
      auth: { basic: { username: 'u', password: 'p' }, apiKey: { ApiKeyAuth: 'k' } },
    });
  });

  it('--server-url reconfigures the client', async () => {
    const { wiring, configured } = fakeWiring();
    await runCli(COMMANDS, wiring, ['ping', '--server-url', 'http://other']);
    expect(configured).toContainEqual({ serverUrl: 'http://other' });
  });

  it('--dry-run captures the prepared request via injected fetch, redacts credentials, sends nothing', async () => {
    const { wiring, configured, out } = fakeWiring({ env: { CAFE_TOKEN: 'secret-token' } });
    // The generated client would call the injected fetch; emulate that with a client
    // whose method invokes whatever fetch was configured, like the real runtime does.
    let injectedFetch: ((url: string, init: RequestInit) => Promise<Response>) | undefined;
    wiring.configure = (config) => {
      configured.push(config as Record<string, unknown>);
      const candidate = (config as { fetch?: typeof injectedFetch }).fetch;
      if (candidate) injectedFetch = candidate;
    };
    (wiring.client as Record<string, unknown>).ping = async () => {
      await injectedFetch?.('http://api/ping', {
        method: 'GET',
        headers: { Authorization: 'Bearer secret-token' },
      });
      return { ok: true };
    };
    const code = await runCli(COMMANDS, wiring, ['ping', '--dry-run']);
    expect(code).toBe(0);
    const printed = JSON.parse(out.join('\n'));
    expect(printed).toEqual({
      url: 'http://api/ping',
      method: 'GET',
      headers: { Authorization: '***' },
    });
  });

  it('--page-all streams one JSON page per line through .pages()', async () => {
    const { wiring, out } = fakeWiring();
    const code = await runCli(COMMANDS, wiring, ['orders', 'listOrders', '--page-all']);
    expect(code).toBe(0);
    expect(out.map((line) => JSON.parse(line))).toEqual([{ items: [1] }, { items: [2] }]);
  });

  it('--page-all on a non-paginated operation is a usage error', async () => {
    const { wiring } = fakeWiring();
    expect(await runCli(COMMANDS, wiring, ['ping', '--page-all'])).toBe(4);
  });

  it('sse results stream as NDJSON events', async () => {
    const events = [
      { event: 'tick', data: 1 },
      { event: 'tick', data: 2 },
    ];
    const sseCommands = [{ ...PING, name: 'streamEvents', sse: true }];
    const { wiring, out } = fakeWiring();
    (wiring.client as Record<string, unknown>).streamEvents = async function* () {
      yield* events;
    };
    const code = await runCli(sseCommands, wiring, ['streamEvents']);
    expect(code).toBe(0);
    expect(out.map((line) => JSON.parse(line))).toEqual(events);
  });

  it('blob results require --output and print a byte receipt', async () => {
    const blobCommands = [{ ...PING, name: 'downloadReport', blob: true }];
    const writes: Array<{ path: string; bytes: number }> = [];
    const { wiring, out } = fakeWiring({
      writeFile: (path, data) => writes.push({ path, bytes: data.length }),
    });
    (wiring.client as Record<string, unknown>).downloadReport = async () =>
      new Blob([new Uint8Array([1, 2, 3])]);
    expect(await runCli(blobCommands, wiring, ['downloadReport'])).toBe(4);
    const code = await runCli(blobCommands, wiring, ['downloadReport', '--output', 'report.bin']);
    expect(code).toBe(0);
    expect(writes).toEqual([{ path: 'report.bin', bytes: 3 }]);
    expect(JSON.parse(out.join('\n'))).toEqual({ saved: 'report.bin', bytes: 3 });
  });

  it('schema prints the stored request/response schemas', async () => {
    const { wiring, out } = fakeWiring();
    const code = await runCli(COMMANDS, wiring, ['schema', 'createOrder']);
    expect(code).toBe(0);
    expect(JSON.parse(out.join('\n'))).toEqual({ request: { kind: 'object' } });
  });

  it('help renders groups at the root, commands per group, and flags per command', async () => {
    const root = fakeWiring();
    expect(await runCli(COMMANDS, root.wiring, ['--help'])).toBe(0);
    const rootText = root.out.join('\n');
    expect(rootText).toContain('orders');
    expect(rootText).toContain('ping');

    const group = fakeWiring();
    await runCli(COMMANDS, group.wiring, ['orders', '--help']);
    expect(group.out.join('\n')).toContain('listOrders');

    const command = fakeWiring();
    await runCli(COMMANDS, command.wiring, ['orders', 'listOrders', '--help']);
    const commandText = command.out.join('\n');
    expect(commandText).toContain('--status');
    expect(commandText).toContain('open, closed');
    expect(commandText).toContain('List orders.');
  });
});

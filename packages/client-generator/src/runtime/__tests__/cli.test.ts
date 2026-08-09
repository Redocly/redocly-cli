import {
  parseInvocation,
  runCli,
  type CliCommand,
  type CliWiring,
  type CommandContext,
  type CustomCommand,
} from '../cli.js';

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
  positionals: [{ name: 'orderId', type: 'string' }],
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

describe('custom commands (composition)', () => {
  const whoami = (received: CommandContext[]): CustomCommand => ({
    name: 'whoami',
    summary: 'Print the current identity.',
    flags: [{ name: 'verbose', param: 'verbose', type: 'boolean', required: false }],
    handler: (context) => {
      received.push(context);
      context.wiring.stdout('me');
      return 0;
    },
  });

  it('dispatches a handler with parsed inputs and the wiring, and uses its exit code', async () => {
    const received: CommandContext[] = [];
    const { wiring, out } = fakeWiring();
    const code = await runCli([...COMMANDS, whoami(received)], wiring, ['whoami', '--verbose']);
    expect(code).toBe(0);
    expect(out).toEqual(['me']);
    expect(received[0].params).toEqual({ verbose: true });
    expect(received[0].wiring.binName).toBe('cafe');
  });

  it('lists a custom command in help and its declared contract in schema', async () => {
    const { wiring, out } = fakeWiring();
    await runCli([...COMMANDS, whoami([])], wiring, ['--help']);
    expect(out.join('\n')).toContain('whoami  Print the current identity.');

    const schema = fakeWiring();
    await runCli([...COMMANDS, whoami([])], schema.wiring, ['schema', 'whoami']);
    const contract = JSON.parse(schema.out.join('\n'));
    expect(contract.operationId).toBe('whoami');
    expect(contract.parameters.query).toEqual([
      expect.objectContaining({ name: 'verbose', type: 'boolean' }),
    ]);
    expect(contract.request).toBeUndefined();
  });

  it('a thrown handler exits 1 with the standard error JSON', async () => {
    const boom: CustomCommand = {
      name: 'boom',
      handler: () => {
        throw new Error('handler exploded');
      },
    };
    const { wiring, err } = fakeWiring();
    const code = await runCli([...COMMANDS, boom], wiring, ['boom']);
    expect(code).toBe(1);
    expect(JSON.parse(err.join('')).error.message).toContain('handler exploded');
  });

  it('rejects a custom command whose name collides with a generated one', async () => {
    const shadow: CustomCommand = { name: 'ping', handler: () => 0 };
    const { wiring, err } = fakeWiring();
    const code = await runCli([...COMMANDS, shadow], wiring, ['ping']);
    // Silently shadowing an operation is how an operator debugs the wrong thing.
    expect(code).toBe(4);
    expect(JSON.parse(err.join('')).error.message).toContain('ping');
  });
});

describe('multi-source runCli (one binary, several APIs)', () => {
  function sources(overrides: { rootCommands?: CustomCommand[] } = {}) {
    const main = fakeWiring();
    const syncer = fakeWiring({ envPrefix: 'REUNITE_SYNCER' });
    const root = fakeWiring();
    return {
      main,
      syncer,
      root,
      list: [
        ...(overrides.rootCommands
          ? [{ commands: overrides.rootCommands, wiring: root.wiring }]
          : []),
        { namespace: 'main', commands: COMMANDS, wiring: main.wiring },
        // The same operationIds again: collisions across descriptions are the normal case.
        { namespace: 'syncer', commands: COMMANDS, wiring: syncer.wiring },
      ],
    };
  }

  it('routes the first token to its source, so colliding operationIds are different commands', async () => {
    const context = sources();
    const code = await runCli(context.list, ['syncer', 'orders', 'getOrder', 'ord_9']);
    expect(code).toBe(0);
    expect(context.syncer.calls).toEqual([{ name: 'getOrder', variables: { orderId: 'ord_9' } }]);
    expect(context.main.calls).toEqual([]);
  });

  it('a namespace-less source puts its commands at the root', async () => {
    const login: CustomCommand = {
      name: 'login',
      handler: (context) => {
        context.wiring.stdout('logged in');
        return 0;
      },
    };
    const context = sources({ rootCommands: [login] });
    const code = await runCli(context.list, ['login']);
    expect(code).toBe(0);
    expect(context.root.out).toEqual(['logged in']);
  });

  it('top-level help lists the namespaces; namespace help lists that API alone', async () => {
    const context = sources();
    await runCli(context.list, ['--help']);
    const help = context.main.out.join('\n');
    expect(help).toContain('main');
    expect(help).toContain('syncer');

    const scoped = sources();
    await runCli(scoped.list, ['syncer', '--help']);
    expect(scoped.syncer.out.join('\n')).toContain('orders');
  });

  it('an unknown first token is a usage error naming the namespaces', async () => {
    const context = sources();
    const code = await runCli(context.list, ['nowhere', 'getOrder']);
    expect(code).toBe(4);
    const message = JSON.parse(context.main.err.join('')).error.message;
    expect(message).toContain('main');
    expect(message).toContain('syncer');
  });
});

describe('wiring.envPrefix', () => {
  it('overrides the credential prefix without changing the displayed name', async () => {
    const { wiring, out } = fakeWiring({ envPrefix: 'REUNITE_MAIN' });
    await runCli(COMMANDS, wiring, ['--help']);
    const help = out.join('\n');
    expect(help).toContain('Usage: cafe');
    expect(help).toContain('REUNITE_MAIN_TOKEN');
    expect(help).not.toContain('CAFE_TOKEN');
  });

  it('reads credentials under the override', async () => {
    const { wiring, calls, configured } = fakeWiring({
      envPrefix: 'REUNITE_MAIN',
      env: { REUNITE_MAIN_TOKEN: 'tok' },
      results: { getOrder: {} },
    });
    await runCli(COMMANDS, wiring, ['orders', 'getOrder', 'ord_1']);
    expect(calls).toHaveLength(1);
    expect(
      configured.some((config) => (config.auth as { bearer?: string })?.bearer === 'tok')
    ).toBe(true);
  });
});

describe('schema is the complete contract for one command', () => {
  it('reports parameters, body, schemas, and the behavior flags', async () => {
    const { wiring, out } = fakeWiring();
    const code = await runCli(COMMANDS, wiring, ['schema', 'listOrders']);
    expect(code).toBe(0);
    const contract = JSON.parse(out.join('\n'));

    // An agent reading only this must be able to construct a valid invocation, so the
    // parameters have to be here — 'GET' operations have nothing else.
    expect(contract.operationId).toBe('listOrders');
    expect(contract.method).toBe('GET');
    expect(contract.path).toBe('/orders');
    expect(contract.parameters.query).toContainEqual(
      expect.objectContaining({ name: 'status', param: 'status', type: 'string', required: false })
    );
    expect(contract.paginated).toBe(true);
  });

  it('reports a path parameter with its type, which the usage line already knows', async () => {
    const { wiring, out } = fakeWiring();
    await runCli(COMMANDS, wiring, ['schema', 'getOrder']);
    const contract = JSON.parse(out.join('\n'));
    expect(contract.parameters.path).toEqual([
      expect.objectContaining({ name: 'orderId', type: 'string', required: true }),
    ]);
  });

  it('keeps the request and response schemas it already reported', async () => {
    const { wiring, out } = fakeWiring();
    await runCli(COMMANDS, wiring, ['schema', 'createOrder']);
    const contract = JSON.parse(out.join('\n'));
    expect(contract.request).toBeDefined();
    expect(contract.body).toEqual({ required: true });
  });
});

describe('credential flags follow the declared schemes', () => {
  const noBearer = [
    { key: 'BasicAuth', kind: 'basic' as const },
    { key: 'InternalToken', kind: 'apiKey' as const },
  ];

  it('omits --token from help when the description declares no bearer scheme', async () => {
    const { wiring, out } = fakeWiring({ schemes: noBearer });
    await runCli(COMMANDS, wiring, ['--help']);
    const help = out.join('\n');
    expect(help).not.toContain('--token');
    // The environment block follows the same rule: only what this API can use. (The
    // apiKey variable is named after its scheme, so match the bearer one exactly.)
    expect(help).not.toContain('CAFE_TOKEN');
    expect(help).toContain('CAFE_USERNAME');
    expect(help).toContain('CAFE_API_KEY_INTERNAL_TOKEN');
  });

  it('keeps --token when a bearer scheme is declared', async () => {
    const { wiring, out } = fakeWiring();
    await runCli(COMMANDS, wiring, ['--help']);
    expect(out.join('\n')).toContain('--token <token>');
  });

  it('rejects --token instead of silently discarding it, naming what the API accepts', async () => {
    const { wiring, err } = fakeWiring({ schemes: noBearer });
    const code = await runCli(COMMANDS, wiring, [
      'orders',
      'getOrder',
      'ord_1',
      '--token',
      'secret',
    ]);
    // Exit 4 is the usage-error contract; a dropped credential reads as "my token is
    // wrong" and costs a debugging session.
    expect(code).toBe(4);
    const message = JSON.parse(err.join('')).error.message;
    expect(message).toContain('--token');
    expect(message).toContain('BasicAuth');
    expect(message).toContain('InternalToken');
    expect(message).not.toContain('secret');
  });
});

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

  it('schema prints the stored request/response schemas inside the contract', async () => {
    const { wiring, out } = fakeWiring();
    const code = await runCli(COMMANDS, wiring, ['schema', 'createOrder']);
    expect(code).toBe(0);
    // The schemas keep their own keys; the contract adds the rest around them.
    expect(JSON.parse(out.join('\n'))).toMatchObject({ request: { kind: 'object' } });
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

describe('help output', () => {
  const MULTILINE: CliCommand = {
    group: 'Some multi-word tag',
    name: 'listThings',
    summary: 'List things.',
    method: 'GET',
    path: '/things',
    positionals: [],
    flags: [
      {
        name: 'cursor',
        param: 'cursor',
        type: 'string',
        required: false,
        description:
          'Cursor value for pagination.\nReturns items starting at this cursor.\n\nSee the guide.',
      },
    ],
  };

  async function help(argv: string[], commands = COMMANDS) {
    const { wiring, out } = fakeWiring();
    const code = await runCli(commands, wiring, argv);
    return { code, text: out.join('\n') };
  }

  it('lists every global flag and the credential env vars', async () => {
    const { code, text } = await help(['--help']);
    expect(code).toBe(0);
    expect(text).toContain('Global flags:');
    for (const flag of [
      '--server-url',
      '--format',
      '--dry-run',
      '--page-all',
      '--output',
      '--token',
      '--json',
    ]) {
      expect(text).toContain(flag);
    }
    // The env vars are how credentials actually get in.
    expect(text).toContain('_TOKEN');
  });

  it('points at the grouped form in the footer, since a bare command fails for grouped APIs', async () => {
    const { text } = await help(['--help']);
    expect(text).toContain('<group> <command> --help');
  });

  it('collapses a multiline flag description onto one line', async () => {
    const { text } = await help(['some-multi-word-tag', 'listThings', '--help'], [MULTILINE]);
    const cursorLine = text.split('\n').find((line) => line.includes('--cursor'));
    expect(cursorLine).toContain(
      'Cursor value for pagination. Returns items starting at this cursor. See the guide.'
    );
    expect(text.split('\n').filter((line) => line.startsWith('Returns items'))).toEqual([]);
  });

  it('addresses a multi-word tag by its kebab slug while showing the original title', async () => {
    const { code, text } = await help(['--help'], [MULTILINE]);
    expect(code).toBe(0);
    // Typed without quoting…
    expect(text).toContain('some-multi-word-tag');
    // …but the human name is still shown.
    expect(text).toContain('Some multi-word tag');
    expect(parseInvocation([MULTILINE], ['some-multi-word-tag', 'listThings'])).toMatchObject({
      kind: 'run',
      command: MULTILINE,
    });
  });

  it('resolves a bare operationId to its grouped command', () => {
    expect(parseInvocation(COMMANDS, ['getOrder', 'ord_1'])).toMatchObject({
      kind: 'run',
      command: GET,
    });
  });
});

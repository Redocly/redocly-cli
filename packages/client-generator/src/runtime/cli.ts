// The generated-CLI engine: a pure argv parser plus a dispatcher that drives the
// instance client and maps outcomes to the documented exit-code contract
// (0 success, 1 API error, 2 auth, 3 validation, 4 usage). Node-only by nature,
// but every effect (env, stdin, files, output) is injected through the wiring so
// the module itself stays dependency-free and fully unit-testable; the emitted
// entry fills the defaults with real `node:fs`/`process` bindings.

/** One flag derived from a query parameter. */
export type CliFlag = {
  /** Kebab-cased flag name (`--page-size`). */
  name: string;
  /** Original wire parameter name. */
  param: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  enum?: string[];
  description?: string;
};

/** One executable command, derived from the IR at generate time. Pure data. */
export type CliCommand = {
  /** Tag; absent = flat/untagged. */
  group?: string;
  name: string;
  summary?: string;
  method: string;
  path: string;
  /** Path params, in path-template order. */
  positionals: Array<{ name: string; description?: string }>;
  flags: CliFlag[];
  /** Present when the operation takes a JSON request body. */
  body?: { required: boolean };
  paginated?: boolean;
  sse?: boolean;
  blob?: boolean;
  /** IR schemas for the `schema` command, serialized verbatim. */
  schemas?: { request?: unknown; response?: unknown };
};

export type CliAuthScheme = { key: string; kind: 'bearer' | 'basic' | 'apiKey' };

export type CliWiring = {
  binName: string;
  /** The generated instance client (grouped-args methods). */
  client: Record<string, unknown>;
  configure: (config: Record<string, unknown>) => void;
  /** Security schemes of the API — drives env-var credential resolution. */
  schemes?: CliAuthScheme[];
  env?: Record<string, string | undefined>;
  stdin?: () => string;
  readFile?: (path: string) => string;
  writeFile?: (path: string, data: Uint8Array) => void;
  stdout: (line: string) => void;
  stderr: (line: string) => void;
};

type CliGlobals = {
  serverUrl?: string;
  format?: 'json' | 'ndjson';
  dryRun?: boolean;
  pageAll?: boolean;
  output?: string;
  token?: string;
  json?: string;
};

export type CliInvocation =
  | { kind: 'help'; topic?: CliCommand | string }
  | { kind: 'schema'; command: CliCommand }
  | {
      kind: 'run';
      command: CliCommand;
      positionals: Record<string, string>;
      params: Record<string, unknown>;
      globals: CliGlobals;
    }
  | { kind: 'usage-error'; message: string };

const GLOBAL_FLAGS: Record<string, { key: keyof CliGlobals; boolean?: boolean }> = {
  'server-url': { key: 'serverUrl' },
  format: { key: 'format' },
  'dry-run': { key: 'dryRun', boolean: true },
  'page-all': { key: 'pageAll', boolean: true },
  output: { key: 'output' },
  token: { key: 'token' },
  json: { key: 'json' },
};

/** Resolve argv against the command table. Pure — no I/O, no env. */
export function parseInvocation(commands: CliCommand[], argv: string[]): CliInvocation {
  if (argv.length === 0 || argv[0] === '--help') return { kind: 'help' };

  if (argv[0] === 'schema') {
    const command = commands.find((candidate) => candidate.name === argv[1]);
    return command
      ? { kind: 'schema', command }
      : { kind: 'usage-error', message: `Unknown command: schema ${argv[1] ?? ''}`.trim() };
  }

  const groups = new Set(commands.filter((c) => c.group).map((c) => c.group as string));
  let command: CliCommand | undefined;
  let rest: string[];
  if (groups.has(argv[0])) {
    if (argv[1] === '--help' || argv[1] === undefined) return { kind: 'help', topic: argv[0] };
    command = commands.find((c) => c.group === argv[0] && c.name === argv[1]);
    if (!command) return { kind: 'usage-error', message: `Unknown command: ${argv[0]} ${argv[1]}` };
    rest = argv.slice(2);
  } else {
    command = commands.find((c) => c.group === undefined && c.name === argv[0]);
    if (!command) return { kind: 'usage-error', message: `Unknown command: ${argv[0]}` };
    rest = argv.slice(1);
  }
  if (rest.includes('--help')) return { kind: 'help', topic: command };

  const positionals: Record<string, string> = {};
  const params: Record<string, unknown> = {};
  const globals: CliGlobals = {};
  let positionalIndex = 0;
  for (let index = 0; index < rest.length; index++) {
    const token = rest[index];
    if (!token.startsWith('--')) {
      const slot = command.positionals[positionalIndex++];
      if (!slot) return { kind: 'usage-error', message: `Unexpected argument: ${token}` };
      positionals[slot.name] = token;
      continue;
    }
    const equals = token.indexOf('=');
    const flagName = equals === -1 ? token.slice(2) : token.slice(2, equals);
    const inlineValue = equals === -1 ? undefined : token.slice(equals + 1);
    const takeValue = (): string | undefined =>
      inlineValue !== undefined ? inlineValue : rest[++index];

    const global = GLOBAL_FLAGS[flagName];
    if (global) {
      if (global.boolean) {
        (globals[global.key] as boolean) = true;
        continue;
      }
      const value = takeValue();
      if (value === undefined) {
        return { kind: 'usage-error', message: `Flag --${flagName} expects a value` };
      }
      if (global.key === 'format' && value !== 'json' && value !== 'ndjson') {
        return { kind: 'usage-error', message: `--format must be one of: json, ndjson` };
      }
      (globals[global.key] as string) = value;
      continue;
    }

    const flag = command.flags.find((candidate) => candidate.name === flagName);
    if (!flag) return { kind: 'usage-error', message: `Unknown flag: --${flagName}` };
    if (flag.type === 'boolean') {
      params[flag.param] = true;
      continue;
    }
    const value = takeValue();
    if (value === undefined) {
      return { kind: 'usage-error', message: `Flag --${flagName} expects a value` };
    }
    if (flag.enum && !flag.enum.includes(value)) {
      return {
        kind: 'usage-error',
        message: `--${flagName} must be one of: ${flag.enum.join(', ')}`,
      };
    }
    if (flag.type === 'number') {
      const numeric = Number(value);
      if (Number.isNaN(numeric)) {
        return { kind: 'usage-error', message: `--${flagName} expects a number, got "${value}"` };
      }
      params[flag.param] = numeric;
    } else if (flag.type === 'array') {
      const existing = params[flag.param];
      params[flag.param] = Array.isArray(existing) ? [...existing, value] : [value];
    } else {
      params[flag.param] = value;
    }
  }

  for (const slot of command.positionals) {
    if (!(slot.name in positionals)) {
      return { kind: 'usage-error', message: `Missing required argument: <${slot.name}>` };
    }
  }
  for (const flag of command.flags) {
    if (flag.required && !(flag.param in params)) {
      return { kind: 'usage-error', message: `Missing required flag: --${flag.name}` };
    }
  }
  if (globals.json !== undefined && !command.body) {
    return { kind: 'usage-error', message: `${command.name} does not accept a request body` };
  }
  if (command.body?.required && globals.json === undefined) {
    return {
      kind: 'usage-error',
      message: `${command.name} requires a request body: pass --json '<json>', --json @file.json, or --json @-`,
    };
  }
  if (globals.pageAll && !command.paginated) {
    return {
      kind: 'usage-error',
      message: `${command.name} is not paginated; --page-all only applies to paginated operations`,
    };
  }
  return { kind: 'run', command, positionals, params, globals };
}

/** Credential env-var prefix: bin name constant-cased (`cafe-api` → `CAFE_API`). */
function envPrefix(binName: string): string {
  return binName
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toUpperCase();
}

function resolveAuth(wiring: CliWiring, token: string | undefined): Record<string, unknown> {
  const env = wiring.env ?? {};
  const prefix = envPrefix(wiring.binName);
  const auth: Record<string, unknown> = {};
  for (const scheme of wiring.schemes ?? []) {
    if (scheme.kind === 'bearer') {
      const value = token ?? env[`${prefix}_TOKEN`];
      if (value !== undefined) auth.bearer = value;
    } else if (scheme.kind === 'basic') {
      const username = env[`${prefix}_USERNAME`];
      const password = env[`${prefix}_PASSWORD`];
      if (username !== undefined && password !== undefined) auth.basic = { username, password };
    } else {
      const value = env[`${prefix}_API_KEY_${envPrefix(scheme.key)}`];
      if (value !== undefined) {
        auth.apiKey = {
          ...(auth.apiKey as Record<string, string> | undefined),
          [scheme.key]: value,
        };
      }
    }
  }
  return auth;
}

function renderHelp(
  commands: CliCommand[],
  binName: string,
  topic?: CliCommand | string
): string[] {
  if (topic !== undefined && typeof topic !== 'string') {
    const command = topic;
    const usage = [
      binName,
      ...(command.group ? [command.group] : []),
      command.name,
      ...command.positionals.map((slot) => `<${slot.name}>`),
      ...(command.flags.length > 0 ? ['[flags]'] : []),
      ...(command.body ? ["--json '<json>' | @file | @-"] : []),
    ].join(' ');
    const lines = [`Usage: ${usage}`];
    if (command.summary) lines.push('', command.summary);
    if (command.flags.length > 0) {
      lines.push('', 'Flags:');
      for (const flag of command.flags) {
        const choices = flag.enum ? ` (one of: ${flag.enum.join(', ')})` : '';
        const required = flag.required ? ' [required]' : '';
        lines.push(
          `  --${flag.name} <${flag.type}>${choices}${required}  ${flag.description ?? ''}`.trimEnd()
        );
      }
    }
    return lines;
  }
  const scope = typeof topic === 'string' ? commands.filter((c) => c.group === topic) : commands;
  const lines =
    typeof topic === 'string'
      ? [`Usage: ${binName} ${topic} <command> …`, '', 'Commands:']
      : [`Usage: ${binName} [group] <command> …`, '', 'Commands:'];
  const seenGroups = new Set<string>();
  for (const command of scope) {
    if (typeof topic !== 'string' && command.group) {
      if (seenGroups.has(command.group)) continue;
      seenGroups.add(command.group);
      lines.push(`  ${command.group} <command>`);
      continue;
    }
    lines.push(
      `  ${[command.group, command.name].filter(Boolean).join(' ')}  ${command.summary ?? ''}`.trimEnd()
    );
  }
  lines.push(
    '',
    `Run ${binName} <command> --help for command details; ${binName} schema <command> prints its schemas.`
  );
  return lines;
}

function loadBody(source: string, wiring: CliWiring): unknown {
  const raw =
    source === '@-'
      ? (wiring.stdin ?? (() => ''))()
      : source.startsWith('@')
        ? (wiring.readFile ?? (() => ''))(source.slice(1))
        : source;
  return JSON.parse(raw);
}

/** Replace header values containing a known credential with `***`. */
function redactHeaders(headers: Record<string, string>, secrets: string[]): Record<string, string> {
  const redacted: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    redacted[name] = secrets.some((secret) => secret !== '' && value.includes(secret))
      ? '***'
      : value;
  }
  return redacted;
}

/** Parse argv, resolve env auth, dispatch through the client, print, return the exit code. */
export async function runCli(
  commands: CliCommand[],
  wiring: CliWiring,
  argv: string[]
): Promise<number> {
  const { stdout, stderr } = wiring;
  const fail = (code: number, error: Record<string, unknown>): number => {
    stderr(JSON.stringify({ error: { code, ...error } }));
    return code;
  };

  const invocation = parseInvocation(commands, argv);
  if (invocation.kind === 'usage-error') return fail(4, { message: invocation.message });
  if (invocation.kind === 'help') {
    for (const line of renderHelp(commands, wiring.binName, invocation.topic)) stdout(line);
    return 0;
  }
  if (invocation.kind === 'schema') {
    stdout(JSON.stringify(invocation.command.schemas ?? {}, null, 2));
    return 0;
  }

  const { command, positionals, params, globals } = invocation;
  if (command.blob && globals.output === undefined) {
    return fail(4, {
      message: `${command.name} downloads a file: pass --output <path>`,
      operationId: command.name,
    });
  }
  let body: unknown;
  if (globals.json !== undefined) {
    try {
      body = loadBody(globals.json, wiring);
    } catch (error) {
      return fail(4, {
        message: `Invalid --json body: ${(error as Error).message}`,
        operationId: command.name,
      });
    }
  }

  const auth = resolveAuth(wiring, globals.token);
  if (Object.keys(auth).length > 0) wiring.configure({ auth });
  if (globals.serverUrl !== undefined) wiring.configure({ serverUrl: globals.serverUrl });

  const secrets = [
    ...(typeof auth.bearer === 'string' ? [auth.bearer] : []),
    ...(auth.basic ? [(auth.basic as { password: string }).password] : []),
    ...Object.values((auth.apiKey as Record<string, string> | undefined) ?? {}),
  ];
  let captured: Record<string, unknown> | undefined;
  if (globals.dryRun) {
    wiring.configure({
      fetch: async (
        url: string,
        init: { method?: string; headers?: Record<string, string>; body?: unknown }
      ) => {
        captured = {
          url,
          method: init.method,
          headers: redactHeaders(init.headers ?? {}, secrets),
          ...(init.body !== undefined && init.body !== null ? { body: String(init.body) } : {}),
        };
        return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
      },
    });
  }

  const variables: Record<string, unknown> = { ...positionals };
  if (Object.keys(params).length > 0) variables.params = params;
  if (body !== undefined) variables.body = body;
  const argument = Object.keys(variables).length > 0 ? variables : undefined;

  try {
    if (globals.pageAll && !globals.dryRun) {
      const pages = (
        wiring.client[command.name] as { pages: (variables?: unknown) => AsyncIterable<unknown> }
      ).pages;
      for await (const page of pages(argument)) stdout(JSON.stringify(page));
      return 0;
    }
    const method = wiring.client[command.name] as (variables?: unknown) => Promise<unknown>;
    const result = await method(argument);
    if (globals.dryRun) {
      stdout(JSON.stringify(captured, null, 2));
      return 0;
    }
    if (command.sse) {
      for await (const event of result as AsyncIterable<unknown>) stdout(JSON.stringify(event));
      return 0;
    }
    if (command.blob) {
      const bytes = new Uint8Array(await (result as Blob).arrayBuffer());
      (wiring.writeFile ?? (() => {}))(globals.output as string, bytes);
      stdout(JSON.stringify({ saved: globals.output, bytes: bytes.length }));
      return 0;
    }
    if (result !== undefined && result !== null) stdout(JSON.stringify(result, null, 2));
    return 0;
  } catch (error) {
    const thrown = error as Error & { status?: number; issues?: unknown };
    const detail = {
      message: thrown.message,
      operationId: command.name,
      ...(thrown.status !== undefined ? { status: thrown.status } : {}),
      ...(thrown.issues !== undefined ? { issues: thrown.issues } : {}),
    };
    if (thrown.name === 'ZodValidationError') return fail(3, detail);
    if (thrown.name === 'ApiError' && (thrown.status === 401 || thrown.status === 403)) {
      return fail(2, detail);
    }
    return fail(1, detail);
  }
}

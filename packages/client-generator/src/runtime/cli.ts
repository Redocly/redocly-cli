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
  /** Path params, in path-template order. Always required — that is what a path is. */
  positionals: Array<{
    name: string;
    type?: CliFlag['type'];
    description?: string;
  }>;
  flags: CliFlag[];
  /**
   * Present when the operation takes a JSON request body. `merged` marks a body whose own
   * properties a flat-style call spells at the top level (the generator decides this from
   * the schema, so the CLI and the client can never disagree).
   */
  body?: { required: boolean; merged?: boolean };
  /**
   * The content type of a request body that is NOT JSON (multipart, url-encoded, binary).
   * `--json` cannot build one, so the command is reported as library-only rather than
   * offered as if it were runnable.
   */
  unsupportedBody?: string;
  paginated?: boolean;
  sse?: boolean;
  blob?: boolean;
  /** IR schemas for the `schema` command, serialized verbatim. */
  schemas?: { request?: unknown; response?: unknown };
};

export type CliAuthScheme = { key: string; kind: 'bearer' | 'basic' | 'apiKey' };

export type CliWiring = {
  binName: string;
  /** Credential variable prefix. Defaults to `binName`, constant-cased — set it when the
   * displayed name and the credential family must differ (a composed multi-API binary). */
  envPrefix?: string;
  /** The generated instance client. */
  client: Record<string, unknown>;
  /** How that client takes its inputs. Defaults to `'grouped'`, the generated default. */
  argsStyle?: 'grouped' | 'flat';
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

export type CliGlobals = {
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

/**
 * A hand-written command composed NEXT TO the generated ones: the same data shape plus a
 * `handler`, so it inherits help, parsing, `schema`, and the exit-code contract. This is
 * how behavior that is not in the description (a `login`, a doctor command) joins the
 * binary without the generator ever learning what it does.
 */
export type CustomCommand = {
  name: string;
  group?: string;
  summary?: string;
  positionals?: CliCommand['positionals'];
  flags?: CliFlag[];
  /** Returns the process exit code; throwing exits 1 with the standard error JSON. */
  handler: (context: CommandContext) => number | Promise<number>;
};

export type CommandContext = {
  positionals: Record<string, string>;
  params: Record<string, unknown>;
  globals: CliGlobals;
  wiring: CliWiring;
};

/** One API's contribution to a composed binary: its commands behind a namespace, with its
 * OWN wiring (base URL, schemes, credentials). A namespace-less source sits at the root. */
export type CommandSource = {
  namespace?: string;
  commands: Array<CliCommand | CustomCommand>;
  /** Absent = inherit the first wired source's — a root `login` shares the binary's identity. */
  wiring?: CliWiring;
};

type ResolvedCommand = CliCommand & { handler?: CustomCommand['handler'] };

/** Custom commands as the command shape the parser reads; generated ones pass through. */
function normalizeCommands(commands: Array<CliCommand | CustomCommand>): ResolvedCommand[] {
  return commands.map((command) =>
    'handler' in command
      ? { method: '', path: '', positionals: [], flags: [], ...command }
      : command
  );
}

/**
 * The name of a custom command that shadows another command. Rejected at startup: an
 * operator typing an operationId must never silently run something else.
 */
function shadowedCommandName(commands: ResolvedCommand[]): string | undefined {
  const seen = new Map<string, ResolvedCommand[]>();
  for (const command of commands) {
    const key = `${command.group ?? ''}\u0000${command.name}`;
    seen.set(key, [...(seen.get(key) ?? []), command]);
  }
  for (const clashing of seen.values()) {
    if (clashing.length > 1 && clashing.some((command) => command.handler !== undefined)) {
      return clashing[0].name;
    }
  }
  return undefined;
}

const GLOBAL_FLAGS: Record<string, { key: keyof CliGlobals; boolean?: boolean }> = {
  'server-url': { key: 'serverUrl' },
  format: { key: 'format' },
  'dry-run': { key: 'dryRun', boolean: true },
  'page-all': { key: 'pageAll', boolean: true },
  output: { key: 'output' },
  token: { key: 'token' },
  json: { key: 'json' },
};

/**
 * The shell-typable form of a group name: an OpenAPI tag can contain spaces ("Some
 * multi-word tag"), which only resolves if the user quotes it. Commands are addressed by
 * this slug; help still shows the original tag.
 */
export function groupSlug(group: string): string {
  return group
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join('-');
}

/** A description on ONE line: newlines in an OpenAPI description wreck help alignment. */
function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * The parsed argv as one call input, in the style the wired client takes: grouped by layer
 * (the default) or merged into one object.
 */
function callInputs(
  command: CliCommand,
  positionals: Record<string, string>,
  params: Record<string, unknown>,
  body: unknown,
  argsStyle: CliWiring['argsStyle']
): Record<string, unknown> | undefined {
  const inputs: Record<string, unknown> = {};
  if (argsStyle === 'flat') {
    Object.assign(inputs, positionals, params);
    if (body !== undefined) {
      if (command.body?.merged === true) Object.assign(inputs, body as Record<string, unknown>);
      else inputs.body = body;
    }
  } else {
    if (Object.keys(positionals).length > 0) inputs.path = positionals;
    if (Object.keys(params).length > 0) inputs.query = params;
    if (body !== undefined) inputs.body = body;
  }
  return Object.keys(inputs).length > 0 ? inputs : undefined;
}

/** Resolve argv against the command table. Pure — no I/O, no env. */
export function parseInvocation(commands: CliCommand[], argv: string[]): CliInvocation {
  if (argv.length === 0 || argv[0] === '--help') return { kind: 'help' };

  if (argv[0] === 'schema') {
    const command = commands.find((candidate) => candidate.name === argv[1]);
    return command
      ? { kind: 'schema', command }
      : { kind: 'usage-error', message: `Unknown command: schema ${argv[1] ?? ''}`.trim() };
  }

  const slugs = new Set(commands.filter((c) => c.group).map((c) => groupSlug(c.group as string)));
  // An untagged operation is only ever addressed by its bare name, so when that name is also
  // a group slug the name wins — reading it as the group would leave the command unreachable.
  // A tagged operation in the same position keeps yielding to group help: it is still
  // reachable as `<its group> <name>`.
  const untagged = commands.some((c) => c.group === undefined && c.name === argv[0]);
  let command: CliCommand | undefined;
  let rest: string[];
  if (!untagged && slugs.has(argv[0])) {
    if (argv[1] === '--help' || argv[1] === undefined) return { kind: 'help', topic: argv[0] };
    command = commands.find((c) => c.group && groupSlug(c.group) === argv[0] && c.name === argv[1]);
    if (!command) return { kind: 'usage-error', message: `Unknown command: ${argv[0]} ${argv[1]}` };
    rest = argv.slice(2);
  } else {
    // An ungrouped command, or a bare operationId — knowing the group shouldn't be
    // required when the name alone is unambiguous.
    const named = commands.filter((c) => c.name === argv[0]);
    command =
      named.find((c) => c.group === undefined) ?? (named.length === 1 ? named[0] : undefined);
    if (!command) {
      const ambiguous = named.length > 1;
      return {
        kind: 'usage-error',
        message: ambiguous
          ? `Ambiguous command: ${argv[0]} — prefix it with its group (${named
              .map((c) => groupSlug(c.group as string))
              .join(', ')})`
          : `Unknown command: ${argv[0]}`,
      };
    }
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
export function envPrefix(binName: string): string {
  return binName
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toUpperCase();
}

function resolveAuth(wiring: CliWiring, token: string | undefined): Record<string, unknown> {
  const env = wiring.env ?? {};
  const prefix = wiring.envPrefix ?? envPrefix(wiring.binName);
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

/**
 * One command's complete contract as plain data — what `schema <command>` prints. It has
 * to carry the parameters: 'GET' operations have no body, so without them the output says
 * nothing a caller could act on, and the only alternative is scraping `--help`, which is
 * prose written for humans.
 */
function commandContract(command: CliCommand): Record<string, unknown> {
  return {
    operationId: command.name,
    ...(command.group === undefined ? {} : { group: groupSlug(command.group) }),
    ...(command.summary === undefined ? {} : { summary: oneLine(command.summary) }),
    ...(command.method === '' ? {} : { method: command.method }),
    ...(command.path === '' ? {} : { path: command.path }),
    parameters: {
      path: command.positionals.map((positional) => ({
        name: positional.name,
        type: positional.type ?? 'string',
        required: true,
        ...(positional.description === undefined
          ? {}
          : { description: oneLine(positional.description) }),
      })),
      // `name` is what you type (`--max-total`); `param` is the wire name it becomes.
      query: command.flags.map((flag) => ({
        name: flag.name,
        param: flag.param,
        type: flag.type,
        required: flag.required,
        ...(flag.enum === undefined ? {} : { enum: flag.enum }),
        ...(flag.description === undefined ? {} : { description: oneLine(flag.description) }),
      })),
    },
    ...(command.body === undefined ? {} : { body: command.body }),
    ...(command.unsupportedBody === undefined ? {} : { unsupportedBody: command.unsupportedBody }),
    ...(command.paginated === true ? { paginated: true } : {}),
    ...(command.sse === true ? { sse: true } : {}),
    ...(command.blob === true ? { blob: true } : {}),
    ...(command.schemas ?? {}),
  };
}

function renderHelp(
  commands: CliCommand[],
  binName: string,
  schemes: CliAuthScheme[],
  prefix: string,
  topic?: CliCommand | string
): string[] {
  if (topic !== undefined && typeof topic !== 'string') {
    const command = topic;
    const usage = [
      binName,
      ...(command.group ? [groupSlug(command.group)] : []),
      command.name,
      ...command.positionals.map((slot) => `<${slot.name}>`),
      ...(command.flags.length > 0 ? ['[flags]'] : []),
      ...(command.body ? ["--json '<json>' | @file | @-"] : []),
    ].join(' ');
    const lines = [`Usage: ${usage}`];
    if (command.summary) lines.push('', command.summary);
    if (command.unsupportedBody !== undefined) {
      lines.push(
        '',
        `This operation takes a ${command.unsupportedBody} body, which the CLI cannot build — call it through the generated client instead.`
      );
    }
    if (command.flags.length > 0) {
      lines.push('', 'Flags:');
      for (const flag of command.flags) {
        const choices = flag.enum ? ` (one of: ${flag.enum.join(', ')})` : '';
        const required = flag.required ? ' [required]' : '';
        lines.push(
          `  --${flag.name} <${flag.type}>${choices}${required}  ${oneLine(flag.description ?? '')}`.trimEnd()
        );
      }
    }
    return lines;
  }
  const scope =
    typeof topic === 'string'
      ? commands.filter((c) => c.group && groupSlug(c.group) === topic)
      : commands;
  const lines =
    typeof topic === 'string'
      ? [`Usage: ${binName} ${topic} <command> …`, '', 'Commands:']
      : [`Usage: ${binName} [group] <command> …`, '', 'Commands:'];
  const seenGroups = new Set<string>();
  const grouped = commands.some((c) => c.group);
  for (const command of scope) {
    if (typeof topic !== 'string' && command.group) {
      const slug = groupSlug(command.group);
      if (seenGroups.has(slug)) continue;
      seenGroups.add(slug);
      // The slug is what you type; the tag is what you recognize.
      const title = slug === command.group ? '' : `  (${command.group})`;
      lines.push(`  ${slug} <command>${title}`);
      continue;
    }
    lines.push(
      `  ${[command.group === undefined ? undefined : groupSlug(command.group), command.name]
        .filter(Boolean)
        .join(' ')}  ${oneLine(command.summary ?? '')}`.trimEnd()
    );
  }
  // Flags that apply to every command, and the env vars credentials come from: a flag
  // absent from --help may as well not exist — and one this API cannot use should not be
  // listed at all, since the operator would spend the debugging session on their token.
  const kinds = new Set(schemes.map((scheme) => scheme.kind));
  const credentials = [
    ...(kinds.has('bearer') ? [`${prefix}_TOKEN`] : []),
    ...(kinds.has('basic') ? [`${prefix}_USERNAME`, `${prefix}_PASSWORD`] : []),
    ...schemes
      .filter((scheme) => scheme.kind === 'apiKey')
      .map((scheme) => `${prefix}_API_KEY_${envPrefix(scheme.key)}`),
  ];
  lines.push(
    '',
    'Global flags:',
    '  --server-url <url>      Override the baked server URL',
    '  --format <json|ndjson>  Output format',
    '  --dry-run               Print the prepared request without sending it',
    '  --page-all              Follow pagination, one JSON page per line',
    '  --output <path>         Write the response body to a file (required for binary)',
    ...(kinds.has('bearer') ? ['  --token <token>         Bearer token'] : []),
    `  --json <json|@file|@->  Request body`,
    ...(credentials.length > 0 ? ['', 'Environment:', `  ${credentials.join(', ')}`] : []),
    '',
    `Run ${binName} ${grouped ? '<group> <command>' : '<command>'} --help for command details; ${binName} schema <command> prints its schemas.`
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
  commands: Array<CliCommand | CustomCommand>,
  wiring: CliWiring,
  argv: string[]
): Promise<number>;
/** The composed form: one binary over several sources, each namespaced with its own wiring. */
export async function runCli(sources: CommandSource[], argv: string[]): Promise<number>;
export async function runCli(
  commandsOrSources: Array<CliCommand | CustomCommand> | CommandSource[],
  wiringOrArgv: CliWiring | string[],
  argv?: string[]
): Promise<number> {
  if (Array.isArray(wiringOrArgv)) {
    return runSources(commandsOrSources as CommandSource[], wiringOrArgv);
  }
  return runSingle(
    commandsOrSources as Array<CliCommand | CustomCommand>,
    wiringOrArgv,
    argv ?? []
  );
}

/** Route the first token to its source; the namespace-less source owns the root. */
async function runSources(sources: CommandSource[], argv: string[]): Promise<number> {
  // A source without wiring inherits the first wired one, so the documented root-source
  // shape `{ commands: [login] }` works: the login shares the composed binary's identity.
  const inherited = sources.find((source) => source.wiring !== undefined)?.wiring;
  const wiringOf = (source: CommandSource): CliWiring => source.wiring ?? (inherited as CliWiring);
  // Top-level output goes through the first source: with a root source that is the one
  // carrying the shared commands, otherwise the first API listed.
  const top = wiringOf(sources[0]);
  const fail = (code: number, message: string): number => {
    top.stderr(JSON.stringify({ error: { code, message } }));
    return code;
  };
  const namespaced = sources.filter(
    (source): source is CommandSource & { namespace: string } => source.namespace !== undefined
  );
  const root = sources.find((source) => source.namespace === undefined);
  if (root !== undefined) {
    const clash = root.commands.find((command) =>
      namespaced.some((source) => source.namespace === command.name)
    );
    if (clash !== undefined) {
      return fail(
        4,
        `Root command "${clash.name}" collides with the "${clash.name}" namespace — rename one of them.`
      );
    }
  }
  if (argv.length === 0 || argv[0] === '--help') {
    for (const line of renderComposedHelp(sources, top.binName)) top.stdout(line);
    return 0;
  }
  const source = namespaced.find((candidate) => candidate.namespace === argv[0]);
  if (source !== undefined) return runSingle(source.commands, wiringOf(source), argv.slice(1));
  const rootTakes =
    root !== undefined &&
    (argv[0] === 'schema' ||
      root.commands.some(
        (command) =>
          command.name === argv[0] ||
          (command.group !== undefined && groupSlug(command.group) === argv[0])
      ));
  if (rootTakes)
    return runSingle((root as CommandSource).commands, wiringOf(root as CommandSource), argv);
  return fail(
    4,
    `Unknown command: ${argv[0]} — expected an API namespace (${namespaced
      .map((candidate) => candidate.namespace)
      .join(', ')})${root !== undefined ? ' or a root command' : ''}`
  );
}

/** The composed top-level help: namespaces, root commands, and how to descend. */
function renderComposedHelp(sources: CommandSource[], binName: string): string[] {
  const lines = [`Usage: ${binName} <api> <command> …`, '', 'APIs:'];
  for (const source of sources) {
    if (source.namespace !== undefined) lines.push(`  ${source.namespace}`);
  }
  const root = sources.find((source) => source.namespace === undefined);
  if (root !== undefined && root.commands.length > 0) {
    lines.push('', 'Commands:');
    for (const command of root.commands) {
      lines.push(`  ${command.name}  ${oneLine(command.summary ?? '')}`.trimEnd());
    }
  }
  lines.push('', `Run ${binName} <api> --help for that API's commands.`);
  return lines;
}

async function runSingle(
  rawCommands: Array<CliCommand | CustomCommand>,
  wiring: CliWiring,
  argv: string[]
): Promise<number> {
  const { stdout, stderr } = wiring;
  const commands = normalizeCommands(rawCommands);
  const shadowed = shadowedCommandName(commands);
  if (shadowed !== undefined) {
    stderr(
      JSON.stringify({
        error: {
          code: 4,
          message: `Custom command "${shadowed}" collides with another command of the same name — rename it.`,
        },
      })
    );
    return 4;
  }
  const fail = (code: number, error: Record<string, unknown>): number => {
    stderr(JSON.stringify({ error: { code, ...error } }));
    return code;
  };

  const invocation = parseInvocation(commands, argv);
  if (invocation.kind === 'usage-error') return fail(4, { message: invocation.message });
  if (invocation.kind === 'help') {
    const prefix = wiring.envPrefix ?? envPrefix(wiring.binName);
    for (const line of renderHelp(
      commands,
      wiring.binName,
      wiring.schemes ?? [],
      prefix,
      invocation.topic
    ))
      stdout(line);
    return 0;
  }
  if (invocation.kind === 'schema') {
    stdout(JSON.stringify(commandContract(invocation.command), null, 2));
    return 0;
  }

  const { command, positionals, params, globals } = invocation;
  // A credential the user passed explicitly must never be dropped in silence: without a
  // bearer scheme the request would go out unauthenticated and come back 401, which reads
  // as "my token is wrong" rather than "that flag does nothing here".
  const schemes = wiring.schemes ?? [];
  if (globals.token !== undefined && !schemes.some((scheme) => scheme.kind === 'bearer')) {
    const declared = schemes.map((scheme) => `${scheme.key} (${scheme.kind})`).join(', ');
    return fail(4, {
      message:
        `--token is a bearer credential, and this API declares no bearer scheme. ` +
        (declared === '' ? 'It declares no security schemes at all.' : `It accepts: ${declared}.`),
    });
  }
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

  // Redaction matches these against header VALUES — so basic auth must contribute the
  // form the wire actually carries (`Basic ${base64(user:pass)}`), not just the raw
  // password, which never appears in the encoded header.
  const basic = auth.basic as { username: string; password: string } | undefined;
  const secrets = [
    ...(typeof auth.bearer === 'string' ? [auth.bearer] : []),
    ...(basic ? [basic.password, btoa(`${basic.username}:${basic.password}`)] : []),
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

  const argument = callInputs(command, positionals, params, body, wiring.argsStyle);

  // The client's methods are typed per-operation; the dispatcher only needs "callable
  // by name", so one localized widening here keeps the emitted wiring cast-free.
  const methods = wiring.client as Record<string, unknown>;
  try {
    const resolved = command as ResolvedCommand;
    if (resolved.handler !== undefined) {
      return await resolved.handler({ positionals, params, globals, wiring });
    }
    if (globals.pageAll && !globals.dryRun) {
      const paginated = methods[command.name] as {
        pages: (variables?: unknown) => AsyncIterable<unknown>;
      };
      for await (const page of paginated.pages(argument)) stdout(JSON.stringify(page));
      return 0;
    }
    const method = methods[command.name] as (variables?: unknown) => Promise<unknown>;
    const result = await method(argument);
    if (globals.dryRun) {
      // An SSE method returns a lazy stream — drain the stubbed response so its fetch
      // actually runs and captures the request.
      if (command.sse) for await (const _event of result as AsyncIterable<unknown>);
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

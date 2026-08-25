// The generated-CLI authoring contract: the command/wiring shapes a wrapper around a
// generated or composed CLI is written against, plus the two casing helpers the cli
// generator shares with the engine. Defined at package level (ADR-0022: contracts own
// their types); the engine re-exports them, and the prepare-time snapshot splices the
// definitions back into the embedded module so generated CLIs stay self-contained.

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
  /** `'grouped'` marks a command whose client method takes namespaced inputs even on a
   * flat-style client, because its merged names would collide. */
  argsStyle?: 'grouped';
  sse?: boolean;
  blob?: boolean;
  /** IR schemas for the `schema` command, serialized verbatim. */
  schemas?: { request?: unknown; response?: unknown };
};

export type CliAuthScheme = { key: string; kind: 'bearer' | 'basic' | 'apiKey' };

export type CliWiring = {
  /** The name the CLI is invoked as, for help output only. The generated entry reads it
   * from `process.argv[1]`, so help never names a command that is not installed. */
  name: string;
  /** Credential variable prefix, constant-cased: `CAFE` gives `CAFE_TOKEN`. Fixed at
   * generation from the output file name, so renaming the binary keeps the variables
   * a published CLI already documents. A composed entry sets one per api alias. */
  envPrefix: string;
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

/** `cafe-api` → `CAFE_API`: the casing of every credential variable this CLI reads. */
export function constantCase(value: string): string {
  return value
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toUpperCase();
}

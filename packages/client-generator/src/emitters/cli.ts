// The cli emitter: derives pure `CliCommand[]` data from the IR and renders
// `<stem>.cli.ts` — a shebang entry that embeds (inline) or imports (package)
// the `runCli` engine and dispatches through the sibling generated client.

import { logger } from '@redocly/openapi-core';

import { casing } from '../authoring/naming.js';
import type {
  ApiModel,
  OperationModel,
  ParamModel,
  SchemaModel,
} from '../intermediate-representation/model.js';
import {
  constantCase,
  groupSlug,
  type CliAuthScheme,
  type CliCommand,
  type CliFlag,
} from '../runtime/cli.js';
import { HEADER } from './emit-options.js';
import { embedCliRuntime } from './inline-runtime.js';
import { resolveOperationPagination, type PaginationConfig } from './pagination.js';
import { flatInputShape } from './render-client.js';
import { isSseOp } from './sse.js';

function kebab(name: string): string {
  return casing.snake(name).replace(/_/g, '-');
}

function flagFor(param: ParamModel): CliFlag {
  const schema = param.schema;
  const type: CliFlag['type'] =
    schema.kind === 'array'
      ? 'array'
      : schema.kind === 'scalar' && (schema.scalar === 'integer' || schema.scalar === 'number')
        ? 'number'
        : schema.kind === 'scalar' && schema.scalar === 'boolean'
          ? 'boolean'
          : 'string';
  return {
    name: kebab(param.name),
    param: param.name,
    type,
    required: param.required,
    ...(schema.kind === 'enum' ? { enum: schema.values.map(String) } : {}),
    ...(param.description !== undefined ? { description: param.description } : {}),
  };
}

/** Mirrors `computeResponse`: a blob operation has binary success content and no JSON alternative. */
function isBlobOp(op: OperationModel): boolean {
  const responses = op.successResponses;
  if (responses.some((response) => response.contentType.toLowerCase().includes('json'))) {
    return false;
  }
  return responses.some(
    (response) =>
      response.contentType.startsWith('image/') ||
      response.contentType === 'application/octet-stream'
  );
}

function jsonSuccessSchema(op: OperationModel): SchemaModel | undefined {
  return op.successResponses.find((response) => response.contentType.toLowerCase().includes('json'))
    ?.schema;
}

/**
 * Whether a flat-style call spells this operation's body as its own properties — the same
 * decision the client's types make, so the dispatcher never has to guess from a value.
 */
function mergedBodyFlag(
  op: OperationModel,
  model: ApiModel,
  argsStyle: 'grouped' | 'flat' | undefined
): { merged?: true } {
  if (argsStyle !== 'flat') return {};
  const shape = flatInputShape(op, model.schemas);
  return 'mergeBody' in shape && shape.mergeBody ? { merged: true } : {};
}

/**
 * The operations a flat-style run still addresses by layer: their merged names would
 * collide, so the client's own input type keeps the namespaced shape and the dispatcher
 * has to build that shape too.
 */
function groupedInputFlag(
  op: OperationModel,
  model: ApiModel,
  argsStyle: 'grouped' | 'flat' | undefined
): { argsStyle?: 'grouped' } {
  if (argsStyle !== 'flat') return {};
  return 'collisions' in flatInputShape(op, model.schemas) ? { argsStyle: 'grouped' } : {};
}

/** Every operation as pure command data — the table `runCli` interprets. */
export function commandData(
  model: ApiModel,
  emit: { pagination?: PaginationConfig; argsStyle?: 'grouped' | 'flat' }
): CliCommand[] {
  const commands: CliCommand[] = [];
  for (const service of model.services) {
    for (const op of service.operations) {
      const jsonBody = op.requestBody?.contentType.toLowerCase().includes('json')
        ? op.requestBody
        : undefined;
      const responseSchema = jsonSuccessSchema(op);
      commands.push({
        ...(op.tags.length > 0 ? { group: op.tags[0] } : {}),
        name: op.name,
        ...(op.summary !== undefined ? { summary: op.summary } : {}),
        method: op.method.toUpperCase(),
        path: op.path,
        positionals: op.pathParams.map((param) => ({
          name: param.name,
          type: flagFor(param).type,
          ...(param.description !== undefined ? { description: param.description } : {}),
        })),
        flags: op.queryParams.map(flagFor),
        ...(jsonBody
          ? { body: { required: jsonBody.required, ...mergedBodyFlag(op, model, emit.argsStyle) } }
          : {}),
        ...(jsonBody === undefined && op.requestBody !== undefined
          ? { unsupportedBody: op.requestBody.contentType }
          : {}),
        ...(resolveOperationPagination(op, model, emit.pagination).spec !== undefined
          ? { paginated: true }
          : {}),
        ...groupedInputFlag(op, model, emit.argsStyle),
        ...(isSseOp(op) ? { sse: true } : {}),
        ...(isBlobOp(op) ? { blob: true } : {}),
        ...(jsonBody !== undefined || responseSchema !== undefined
          ? {
              schemas: {
                ...(jsonBody ? { request: jsonBody.schema } : {}),
                ...(responseSchema !== undefined ? { response: responseSchema } : {}),
              },
            }
          : {}),
      });
    }
  }
  return commands;
}

/**
 * The self-execution guard both generated entries share. Realpath on both sides: some
 * runners resolve symlinks in `import.meta.url` but not in `argv[1]` (macOS temp dirs,
 * installed bin symlinks); the catch covers an entry that is not a file (REPL, node -e).
 */
const ENTRY_GUARD = `function isProcessEntry(): boolean {
  if (process.argv[1] === undefined) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
}
if (isProcessEntry()) {
  process.exit(await run());
}`;

/** JSON as a TS expression: U+2028/U+2029 are line terminators in code contexts. */
function codeJson(value: unknown, indent?: number): string {
  return JSON.stringify(value, null, indent)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export type CliModuleOptions = {
  stem: string;
  importExt: string;
  runtime: 'inline' | 'package';
  zodSelected: boolean;
  pagination?: PaginationConfig;
  /** The sibling client's call shape, which the dispatcher builds its inputs for. */
  argsStyle?: 'grouped' | 'flat';
};

/**
 * The auth schemes as the CLI sees them: every apiKey placement is one `apiKey` kind,
 * since the credential is read from the same env variable either way. Exported so the
 * docs generator names the same variables the runtime reads.
 */
export function cliAuthSchemes(model: ApiModel): CliAuthScheme[] {
  return model.securitySchemes.map((scheme) => ({
    key: scheme.key,
    kind: scheme.kind === 'bearer' || scheme.kind === 'basic' ? scheme.kind : 'apiKey',
  }));
}

/** How an operation named after a tag is reached — the two halves of `parseInvocation`. */
function shadowedAddress(command: CliCommand): string {
  return command.group === undefined
    ? `${command.name} (keeps the bare word, so the "${command.name}" group has no help page)`
    : `${command.name} (run it as "${groupSlug(command.group)} ${command.name}")`;
}

/**
 * A leading group name is read as the group, so an operation whose name is also a tag name
 * resolves unusually: a tagged one loses the bare form and runs as `<its group> <name>`,
 * and an untagged one keeps the bare form and hides that group's help. Nothing becomes
 * unreachable either way, but only the description's author can rename a side of the
 * collision, so say it once at generation time.
 */
function warnShadowedCommands(commands: CliCommand[]): void {
  const slugs = new Set(commands.filter((c) => c.group).map((c) => groupSlug(c.group as string)));
  const shadowed = commands.filter((command) => slugs.has(command.name));
  if (shadowed.length === 0) return;
  logger.warn(
    `generate-client: cli reads a leading group name as the group, so ${shadowed.length} operation(s) named after a tag resolve unusually — rename the operation or the tag: ${shadowed
      .map(shadowedAddress)
      .join(', ')}.\n`
  );
}

/** The whole `<stem>.cli.ts` file. */
export function renderCliModule(model: ApiModel, options: CliModuleOptions): string {
  const commands = commandData(model, {
    pagination: options.pagination,
    argsStyle: options.argsStyle,
  });
  warnShadowedCommands(commands);
  const schemes = cliAuthSchemes(model);
  const clientModule = `./${options.stem}.${options.importExt}`;
  const clientImports = ['client', 'configure', ...(options.zodSelected ? ['use'] : [])];

  const parts = [
    '#!/usr/bin/env node',
    HEADER,
    'import { readFileSync, realpathSync, writeFileSync } from "node:fs";\nimport { fileURLToPath } from "node:url";',
    [
      ...(options.runtime === 'package'
        ? [
            'import { invokedName, runCli, type CliCommand, type CliWiring } from "@redocly/client-generator";',
          ]
        : []),
      `import { ${clientImports.join(', ')} } from "${clientModule}";`,
      ...(options.zodSelected
        ? [`import { zodValidation } from "./${options.stem}.zod.${options.importExt}";`]
        : []),
    ].join('\n'),
    ...(options.runtime === 'inline'
      ? ['// ─── Embedded cli engine (@redocly/client-generator) ───\n' + embedCliRuntime()]
      : []),
    `export const COMMANDS: CliCommand[] = ${codeJson(commands, 2)};`,
    ...(options.zodSelected
      ? [
          // A dry run never sends the request, so its "response" is the stub the dry-run
          // fetch returns — validating that reports drift that does not exist. Request
          // validation still runs, which is what makes `--dry-run` a useful preflight.
          `use(zodValidation(process.argv.includes("--dry-run") ? { response: false } : {}));`,
        ]
      : []),
    `export const wiring: CliWiring = {
  name: invokedName(process.argv[1], ${codeJson(options.stem)}),
  envPrefix: ${codeJson(constantCase(options.stem))},
  client,
${options.argsStyle === 'flat' ? '  argsStyle: "flat",\n' : ''}  configure,
  schemes: ${codeJson(schemes)},
  env: process.env,
  stdin: () => readFileSync(0, "utf-8"),
  readFile: (path: string) => readFileSync(path, "utf-8"),
  writeFile: (path: string, data: Uint8Array) => writeFileSync(path, data),
  stdout: (line: string) => console.log(line),
  stderr: (line: string) => console.error(line),
};

/** Run this CLI programmatically; defaults to the process argv. */
export const run = (argv: string[] = process.argv.slice(2)): Promise<number> =>
  runCli(COMMANDS, wiring, argv);

// Re-exported so a composed entry can run these commands without its own runtime copy.
export { runCli };

// Self-execute only as the process entry, so importing this module is side-effect-safe:
// composed binaries and login-style wrappers import COMMANDS/wiring/run instead of
// editing this generated file.
${ENTRY_GUARD}`,
  ];
  return parts.join('\n\n') + '\n';
}

export type ComposedCliSource = {
  /** The api alias from `apis:` — it becomes the namespace the shell types. */
  alias: string;
  /** Relative specifier of that api's generated cli module, extension included. */
  modulePath: string;
};

/**
 * The composed entry `client.cliOutput` produces: one binary over every api that selected
 * `cli`, each behind its alias as the namespace, with `<BINNAME>_<ALIAS>` credential
 * prefixes. It imports `runCli` from the first source's module — generated code, so the
 * inline runtime's zero-dependency promise holds — and exports `SOURCES` so an adopter
 * layers custom commands (a `login`) around it without editing a generated file.
 */
export function renderComposedCliEntry(sources: ComposedCliSource[], stem: string): string {
  const prefix = constantCase(stem);
  // An identifier can't start with a digit, and two aliases can sanitize identically —
  // the underscore and the index keep every import binding legal and unique.
  const idents = new Map<string, string>();
  sources.forEach(({ alias }, index) => {
    const sanitized = alias.replace(/[^A-Za-z0-9]/g, '_');
    const legal = /^[A-Za-z_]/.test(sanitized) ? sanitized : `_${sanitized}`;
    idents.set(alias, [...idents.values()].includes(legal) ? `${legal}_${index}` : legal);
  });
  const identFor = (alias: string): string => idents.get(alias)!;
  const imports = sources.map(({ alias, modulePath }, index) => {
    const ident = identFor(alias);
    const runtime = index === 0 ? ', runCli' : '';
    return `import { COMMANDS as ${ident}Commands, wiring as ${ident}Wiring${runtime} } from ${JSON.stringify(modulePath)};`;
  });
  const entries = sources.map(({ alias }) => {
    const ident = identFor(alias);
    const namespace = kebab(alias);
    const aliasPrefix = `${prefix}_${constantCase(alias)}`;
    return `  {
    namespace: ${JSON.stringify(namespace)},
    commands: ${ident}Commands,
    wiring: { ...${ident}Wiring, envPrefix: ${JSON.stringify(aliasPrefix)} },
  },`;
  });
  return (
    [
      '#!/usr/bin/env node',
      HEADER,
      [
        'import { realpathSync } from "node:fs";',
        'import { fileURLToPath } from "node:url";',
        ...imports,
      ].join('\n'),
      `/** The composed sources — import SOURCES to layer custom commands around this binary. */
export const SOURCES = [
${entries.join('\n')}
];

/** Run the composed CLI programmatically; defaults to the process argv. */
export const run = (argv: string[] = process.argv.slice(2)): Promise<number> =>
  runCli(SOURCES, argv);

${ENTRY_GUARD}`,
    ].join('\n\n') + '\n'
  );
}

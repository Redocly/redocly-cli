// The cli emitter: derives pure `CliCommand[]` data from the IR and renders
// `<stem>.cli.ts` — a shebang entry that embeds (inline) or imports (package)
// the `runCli` engine and dispatches through the sibling generated client.

import { casing } from '../authoring/naming.js';
import type {
  ApiModel,
  OperationModel,
  ParamModel,
  SchemaModel,
} from '../intermediate-representation/model.js';
import type { CliAuthScheme, CliCommand, CliFlag } from '../runtime/cli.js';
import { HEADER } from './emit-options.js';
import { embedCliRuntime } from './inline-runtime.js';
import { resolveOperationPagination, type PaginationConfig } from './pagination.js';
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

/** Every operation as pure command data — the table `runCli` interprets. */
export function commandData(
  model: ApiModel,
  emit: { pagination?: PaginationConfig }
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
          ...(param.description !== undefined ? { description: param.description } : {}),
        })),
        flags: op.queryParams.map(flagFor),
        ...(jsonBody ? { body: { required: jsonBody.required } } : {}),
        ...(resolveOperationPagination(op, model, emit.pagination).spec !== undefined
          ? { paginated: true }
          : {}),
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
  binName: string;
  pagination?: PaginationConfig;
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

/** The whole `<stem>.cli.ts` file. */
export function renderCliModule(model: ApiModel, options: CliModuleOptions): string {
  const commands = commandData(model, { pagination: options.pagination });
  const schemes = cliAuthSchemes(model);
  const clientModule = `./${options.stem}.${options.importExt}`;
  const clientImports = ['client', 'configure', ...(options.zodSelected ? ['use'] : [])];

  const parts = [
    '#!/usr/bin/env node',
    HEADER,
    'import { readFileSync, writeFileSync } from "node:fs";',
    [
      ...(options.runtime === 'package'
        ? ['import { runCli, type CliCommand } from "@redocly/client-generator";']
        : []),
      `import { ${clientImports.join(', ')} } from "${clientModule}";`,
      ...(options.zodSelected
        ? [`import { zodValidation } from "./${options.stem}.zod.${options.importExt}";`]
        : []),
    ].join('\n'),
    ...(options.runtime === 'inline'
      ? ['// ─── Embedded cli engine (@redocly/client-generator) ───\n' + embedCliRuntime()]
      : []),
    `const COMMANDS: CliCommand[] = ${codeJson(commands, 2)};`,
    ...(options.zodSelected ? ['use(zodValidation());'] : []),
    `process.exit(
  await runCli(COMMANDS, {
    binName: ${codeJson(options.binName)},
    client,
    configure,
    schemes: ${codeJson(schemes)},
    env: process.env,
    stdin: () => readFileSync(0, "utf-8"),
    readFile: (path: string) => readFileSync(path, "utf-8"),
    writeFile: (path: string, data: Uint8Array) => writeFileSync(path, data),
    stdout: (line: string) => console.log(line),
    stderr: (line: string) => console.error(line),
  }, process.argv.slice(2))
);`,
  ];
  return parts.join('\n\n') + '\n';
}

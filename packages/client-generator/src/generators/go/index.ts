// The built-in `go` generator — the second non-TypeScript library entry,
// authored with the language-neutral toolkit only (same dogfooding invariant as
// the python generator, pinned by its guard test). Output is a single
// stdlib-only Go file: structs with json tags, typed-const enums, discriminated
// unions with unmarshal dispatchers, and a Client over the embedded runtime.
// One file per pipeline stage (ADR-0020); this entry assembles them.

import {
  type ApiModel,
  type CodeSample,
  type DateType,
  type EmitOptions,
  type Generator,
  identifierFor,
  jsonSuccessSchema,
  type NeutralPaginationRule,
  type OperationModel,
  paginationItemSchema,
  renderReferencePage,
  type SampleContext,
  sseResponse,
} from '@redocly/client-generator';
import { exported, GoPrinter } from '@redocly/client-generator/printers/go';
import { GO_RUNTIME_SOURCE } from '@redocly/client-generator/runtime-sources';

import { writeGoServers } from './client.ts';
import { goPaginationLiteral, goSecurityLiteral } from './descriptor.ts';
import { renderGoModels } from './models.ts';
import { GO, goOperationIdents, goPackageName, naming } from './naming.ts';
import { writeGoMethod } from './operations.ts';
import { writeGoPaginationWrappers } from './pagination.ts';
import { goType } from './types.ts';

export { renderGoModels } from './models.ts';
export { goType } from './types.ts';

/** Strip the package clause and import lines/blocks so a section stitches into one file. */
function stripHeader(source: string): string {
  const lines = source.split('\n');
  const out: string[] = [];
  let inImportBlock = false;
  for (const line of lines) {
    if (line.startsWith('package ')) continue;
    if (line.startsWith('import (')) {
      inImportBlock = true;
      continue;
    }
    if (inImportBlock) {
      if (line.startsWith(')')) inImportBlock = false;
      continue;
    }
    if (line.startsWith('import ')) continue;
    out.push(line);
  }
  return out.join('\n').trim();
}

/** Every stdlib package the merged inline file needs (the runtime dominates the list). */
const GO_STDLIB_IMPORTS = [
  'bytes',
  'context',
  'encoding/base64',
  'encoding/json',
  'errors',
  'fmt',
  'io',
  'math/rand',
  'mime/multipart',
  'net/http',
  'net/url',
  'strconv',
  'strings',
  'time',
];

/**
 * Everything below the import block: models, servers, the (optionally embedded)
 * runtime, the operations table, and the Client — one emission path for both
 * runtime modes, so module mode cannot drift from the inline layout.
 */
function writeGoBody(
  printer: GoPrinter,
  model: ApiModel,
  emit: EmitOptions,
  dateType: DateType,
  paginationRules: Map<string, NeutralPaginationRule>,
  embedRuntime: boolean
): void {
  printer.line(stripHeader(renderGoModels(model, dateType)));
  printer.blank();
  writeGoServers(printer, model);
  if (embedRuntime) {
    printer.line('// ─── Embedded runtime (@redocly/client-generator go runtime) ───');
    printer.line(stripHeader(GO_RUNTIME_SOURCE));
    printer.blank();
  }

  printer.block(
    'type operationMeta struct {',
    () => {
      printer.line('ID         string');
      printer.line('Method     string');
      printer.line('Path       string');
      printer.line('Security   [][]SecuritySpec');
      printer.line('Pagination *PaginationSpec');
    },
    '}'
  );
  printer.blank();
  printer.block(
    'var operations = map[string]operationMeta{',
    () => {
      for (const { op, ident } of goOperationIdents(model)) {
        const id = op.specName ?? op.name;
        const security = goSecurityLiteral(op, model);
        const rule = paginationRules.get(ident);
        const fields = [
          `ID: ${naming.string(id)}`,
          `Method: ${naming.string(op.method.toUpperCase())}`,
          `Path: ${naming.string(op.path)}`,
          ...(security !== undefined ? [`Security: ${security}`] : []),
          ...(rule !== undefined ? [`Pagination: ${goPaginationLiteral(rule)}`] : []),
        ];
        printer.line(`${naming.string(id)}: {${fields.join(', ')}},`);
      }
    },
    '}'
  );
  printer.blank();

  // Per-operation query-parameter structs (pointer fields: absent = not sent).
  for (const { op, ident } of goOperationIdents(model)) {
    if (op.queryParams.length === 0) continue;
    printer.block(
      `type ${ident}Params struct {`,
      () => {
        for (const param of op.queryParams) {
          const fieldType = goType(param.schema, dateType);
          printer.line(
            `${exported(param.name)} ${fieldType.startsWith('*') ? fieldType : `*${fieldType}`}`
          );
        }
      },
      '}'
    );
    printer.blank();
  }

  printer.doc('Client', `Client for ${model.title} (${model.version}).`);
  printer.block(
    'type Client struct {',
    () => {
      printer.line('config Config');
    },
    '}'
  );
  printer.blank();
  printer.block(
    'func New(config Config) *Client {',
    () => {
      printer.block(
        'if config.ServerURL == "" {',
        () => {
          printer.line(
            `config.ServerURL = ${naming.string(emit.serverUrl ?? model.serverUrl ?? '')}`
          );
        },
        '}'
      );
      printer.line('return &Client{config: config}');
    },
    '}'
  );
  printer.blank();

  for (const { op, ident } of goOperationIdents(model)) {
    writeGoMethod(printer, op, ident, dateType);
    if (sseResponse(op) === undefined && (op.successResponseHeaders?.length ?? 0) > 0) {
      writeGoMethod(printer, op, ident, dateType, model, true);
    }
    const rule = paginationRules.get(ident);
    if (rule === undefined) continue;
    const success = jsonSuccessSchema(op);
    const pageType = success === undefined ? 'any' : goType(success, dateType);
    const element = paginationItemSchema(success, rule.items, model);
    writeGoPaginationWrappers(
      printer,
      op,
      ident,
      dateType,
      pageType,
      element === undefined ? 'any' : goType(element, dateType)
    );
  }
}

/** The whole generated file: models + embedded runtime + operations table + Client. */
export const goGenerator: Generator = ({ model, output, banner, emit, pagination }) => {
  const printer = new GoPrinter();
  const dateType = emit.dateType ?? 'string';
  const packageName = goPackageName(emit.goPackage);
  // Pagination arrives RESOLVED from the pipeline — one fit-verified answer per run.
  const paginationRules = new Map<string, NeutralPaginationRule>();
  for (const { op, ident } of goOperationIdents(model)) {
    const spec = pagination?.get(op.name)?.spec;
    if (spec !== undefined) paginationRules.set(ident, spec);
  }
  printer.line(
    `// Code generated by @redocly/client-generator (go) from "${model.title}" ${model.version}. DO NOT EDIT.`
  );
  printer.line(
    '// Regenerate with `redocly generate-client`. Standard library only — zero dependencies.'
  );
  printer.line(`package ${packageName}`);
  printer.blank();
  const embedRuntime = emit.runtime !== 'module';
  // One merged import block. Inline: the runtime uses every entry. Module: the runtime
  // imports for itself, so the client lists only the packages its own body references —
  // an unused import is a Go compile error, so the subset is derived from the body text.
  const imports = embedRuntime
    ? GO_STDLIB_IMPORTS
    : (() => {
        const scratch = new GoPrinter();
        writeGoBody(scratch, model, emit, dateType, paginationRules, false);
        const body = scratch.toString();
        return GO_STDLIB_IMPORTS.filter((spec) =>
          new RegExp(`\\b${spec.split('/').pop()}\\.`).test(body)
        );
      })();
  printer.block(
    'import (',
    () => {
      for (const spec of imports) {
        printer.line(naming.string(spec));
      }
    },
    ')'
  );
  printer.blank();

  writeGoBody(printer, model, emit, dateType, paginationRules, embedRuntime);

  const entry = {
    path: output.path.replace(/\.[^.\\/]+$/, '.go'),
    // Sections are stitched with their own trailing blanks; gofmt allows at most one
    // between declarations and none at the end of the file.
    content: printer.toString(),
  };
  if (embedRuntime) return [entry];
  // The runtime, verbatim except the package clause — same directory, same Go package.
  const header = banner.map((line) => `// ${line}`).join('\n');
  const runtimeSource = GO_RUNTIME_SOURCE.replace(/^package .*$/m, `package ${packageName}`);
  return [
    entry,
    {
      path: entry.path.replace(/[^\\/]+$/, 'runtime.go'),
      content: `${header}\n${runtimeSource.trimEnd()}\n`,
    },
  ];
};

/** One idiomatic Go call per operation — feeds `x-codeSamples` for docs. */
export function goSample(op: OperationModel, ctx: SampleContext): CodeSample {
  const dateType = ctx.emit.dateType ?? 'string';
  // `goPackage` renames the package clause, and the snippet qualifies with it.
  const pkg = ctx.emit.goPackage ?? 'client';
  // The DEDUPED name: on a collision the method is `GetUser2`, and a snippet naming the
  // raw `GetUser` would show a call that goes to a different operation.
  const ident =
    goOperationIdents(ctx.model).find((entry) => entry.op.name === op.name)?.ident ??
    exported(op.name);
  const args = [
    'ctx',
    ...op.pathParams.map(
      (param) => `"<${identifierFor(param.name, { style: 'camel', reserved: GO })}>"`
    ),
    ...(op.requestBody ? [`${goType(op.requestBody.schema, dateType)}{ /* … */ }`] : []),
    ...(op.queryParams.length > 0 ? ['nil'] : []),
  ];
  // The assignment matches the return shape: an SSE method returns one iterator, a void
  // method returns `error` alone — `result, err :=` would not compile against either.
  const call = `client.${ident}(${args.join(', ')})`;
  const statement =
    sseResponse(op) !== undefined
      ? `stream := ${call}`
      : jsonSuccessSchema(op) === undefined
        ? `err := ${call}`
        : `result, err := ${call}`;
  return {
    lang: 'go',
    label: 'Go SDK',
    source: `client := ${pkg}.New(${pkg}.Config{})\n${statement}\n`,
  };
}

/**
 * The SDK's own reference page, written when `client.docs` is on. The call snippets come
 * from `goSample` — this generator's own hook — so the page can only ever show the syntax
 * of the SDK beside it, and ejecting this generator takes the page with it.
 */
export const goDocs: Generator = ({ model, output, emit, pagination }) => [
  {
    path: output.path.replace(/\.[^.\\/]+$/, '.go.md'),
    content: renderReferencePage(model, {
      title: `${model.title} Go SDK reference`,
      frontmatter: emit.docsFrontmatter === true,
      language: {
        name: 'go',
        label: 'Go',
        fence: 'go',
        requires: 'The SDK needs the standard library only.',
      },
      sample: (op) => goSample(op, { model, emit, outputPath: output.path }),
      paginated: new Set(pagination?.keys() ?? []),
    }),
  },
];

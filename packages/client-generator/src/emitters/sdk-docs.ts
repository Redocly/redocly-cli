// The sdk-docs emitter: renders the Markdown reference for one language SDK from the IR
// the SDK itself is built from, plus that generator's own `sample` hook for the call
// snippets. It writes no call syntax of its own — a second spelling of the SDK would
// drift from it the first time either side changed.

import { paginationRuleFor } from '../authoring/pagination.js';
import { Printer } from '../authoring/printer.js';
import type { CodeSample } from '../generators/types.js';
import type {
  ApiModel,
  OperationModel,
  ParamModel,
  SchemaModel,
} from '../intermediate-representation/model.js';
import type { PaginationConfig } from './pagination.js';

/** What this generator knows about a language that the IR cannot tell it. */
export type SdkDocsLanguage = {
  /** Generator name; also the infix of the page file (`<stem>.python.md`). */
  name: string;
  /** Display name for the default heading. */
  label: string;
  /** Fence language for the call samples. */
  fence: string;
  /** What the SDK needs at run time, as one sentence. */
  requires: string;
};

export type SdkDocsOptions = {
  /** Page heading. */
  title: string;
  /** Emit YAML front matter carrying the title, for docs sites that expect it. */
  frontmatter: boolean;
  language: SdkDocsLanguage;
  /** The call snippet for one operation, from the SDK generator's own `sample` hook. */
  sample: (operation: OperationModel) => CodeSample | undefined;
  pagination?: PaginationConfig;
};

/** Table-cell-safe text: one line, with pipes and backslashes escaped. */
function cell(text: string | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim().replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
}

/** A wire-level type name for a schema — the vocabulary of the description, not of a language. */
function typeLabel(schema: SchemaModel): string {
  switch (schema.kind) {
    case 'ref':
      return schema.name;
    case 'omit':
      return schema.base;
    case 'scalar':
      return schema.scalar;
    case 'array':
      return `array of ${typeLabel(schema.items)}`;
    case 'record':
      return `map of ${typeLabel(schema.value)}`;
    case 'enum': {
      const values = schema.values.map(String);
      const shown = values.slice(0, 6).join(', ');
      return values.length > 6 ? `enum: ${shown}, and ${values.length - 6} more` : `enum: ${shown}`;
    }
    case 'literal':
      return String(schema.value);
    case 'union':
      return schema.members.map(typeLabel).join(' or ');
    case 'intersection':
      return schema.members.map(typeLabel).join(' and ');
    case 'object':
      return 'object';
    case 'null':
      return 'null';
    case 'unknown':
      return 'any';
  }
}

/** Binary success content with no JSON alternative — the same test the clients apply. */
function isBinary(op: OperationModel): boolean {
  if (op.successResponses.some((response) => response.contentType.toLowerCase().includes('json'))) {
    return false;
  }
  return op.successResponses.some(
    (response) =>
      response.contentType.startsWith('image/') ||
      response.contentType === 'application/octet-stream'
  );
}

function writeParameterTable(printer: Printer, params: ParamModel[]): void {
  printer.line('| Parameter | In | Type | Required | Description |');
  printer.line('| --------- | -- | ---- | -------- | ----------- |');
  for (const param of params) {
    printer.line(
      `| \`${param.name}\` | ${param.in} | ${cell(typeLabel(param.schema))} | ${
        param.required ? 'yes' : 'no'
      } | ${cell(param.description)} |`
    );
  }
  printer.blank();
}

function writeOperation(printer: Printer, op: OperationModel, options: SdkDocsOptions): void {
  printer.line(`### \`${op.specName ?? op.name}\``);
  printer.blank();
  if (op.summary !== undefined) {
    printer.line(cell(op.summary));
    printer.blank();
  }
  printer.line(`\`${op.method.toUpperCase()} ${op.path}\``);
  printer.blank();

  const sample = options.sample(op);
  if (sample !== undefined) {
    printer.line('```' + options.language.fence);
    for (const line of sample.source.replace(/\n+$/, '').split('\n')) printer.line(line);
    printer.line('```');
    printer.blank();
  }

  const params = [...op.pathParams, ...op.queryParams, ...op.headerParams];
  if (params.length > 0) writeParameterTable(printer, params);

  if (op.requestBody !== undefined) {
    printer.line(
      `Body: \`${op.requestBody.contentType}\`${op.requestBody.required ? ', required' : ', optional'}, of type ${typeLabel(op.requestBody.schema)}.`
    );
  }
  const success = op.successResponses[0];
  printer.line(
    success === undefined
      ? 'Returns no content.'
      : `Returns \`${success.contentType}\`, of type ${typeLabel(success.schema)}.`
  );
  // The same three declaration-level facts every SDK reads: `paginationRuleFor` is the
  // helper the language generators resolve pagination with, and the success content type
  // is what decides a streaming or a binary response.
  if (paginationRuleFor(op, options.pagination as Record<string, unknown> | undefined)) {
    printer.line('This operation is paginated, so the SDK gives it page and item iterators.');
  }
  if (op.successResponses.some((response) => response.contentType === 'text/event-stream')) {
    printer.line('This operation streams server-sent events, so the SDK iterates the events.');
  }
  if (isBinary(op)) {
    printer.line('This operation returns binary content.');
  }
  printer.blank();
}

/** The whole page: heading, requirements, security schemes, then every operation by tag. */
export function renderSdkDocs(model: ApiModel, options: SdkDocsOptions): string {
  const printer = new Printer();
  if (options.frontmatter) {
    printer.line('---');
    printer.line(`title: ${options.title}`);
    printer.line('---');
    printer.blank();
  }
  printer.line(`# ${options.title}`);
  printer.blank();
  printer.line(
    `Generated reference for the ${options.language.label} SDK, produced from the API description by \`redocly generate-client\`.`
  );
  printer.line('Re-run generation to update it — this file is not hand-edited.');
  printer.blank();
  printer.line(options.language.requires);
  printer.blank();

  printer.line('## Authentication');
  printer.blank();
  if (model.securitySchemes.length === 0) {
    printer.line('The description declares no security schemes.');
  } else {
    printer.line('The description declares these schemes, which you pass to the client:');
    printer.blank();
    printer.line('| Scheme | Kind | Sent as |');
    printer.line('| ------ | ---- | ------- |');
    for (const scheme of model.securitySchemes) {
      const sentAs =
        scheme.kind === 'bearer'
          ? '`Authorization: Bearer <token>`'
          : scheme.kind === 'basic'
            ? '`Authorization: Basic <base64>`'
            : scheme.kind === 'apiKeyHeader'
              ? `the \`${scheme.headerName}\` header`
              : scheme.kind === 'apiKeyQuery'
                ? `the \`${scheme.paramName}\` query parameter`
                : `the \`${scheme.cookieName}\` cookie`;
      printer.line(`| \`${scheme.key}\` | ${scheme.kind} | ${sentAs} |`);
    }
  }
  printer.blank();

  // One section per tag, in the order the description declares them, then the untagged
  // operations — the same grouping the CLI and the split output modes use.
  const operations = model.services.flatMap((service) => service.operations);
  const groups = [...new Set(operations.map((op) => op.tags[0]))];
  for (const group of groups) {
    printer.line(group === undefined ? '## Operations' : `## ${group}`);
    printer.blank();
    for (const op of operations.filter((candidate) => candidate.tags[0] === group)) {
      writeOperation(printer, op, options);
    }
  }
  return (
    printer
      .toString()
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd() + '\n'
  );
}

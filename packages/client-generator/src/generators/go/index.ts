// The built-in `go` generator — the second non-TypeScript library entry,
// authored with the language-neutral toolkit only (same dogfooding invariant as
// the python generator, pinned by its guard test). Output is a single
// stdlib-only Go file: structs with json tags, typed-const enums, discriminated
// unions with unmarshal dispatchers, and a Client over the embedded runtime.

import {
  casing,
  Printer,
  discriminatorCases,
  docText,
  enumValues,
  flattenAllOf,
  headerCoerceType,
  identifierFor,
  uniqueIdentifiers,
  isNullable,
  NotSupportedError,
  paginationRuleFor,
  renderReferencePage,
  RESERVED_WORDS,
  unwrapNullable,
  type DateType,
  type NeutralPaginationRule,
  isMultipartBody,
  jsonSuccessSchema,
  sseResponse,
  serverUrlParts,
  securityRequirements,
  paginationItemSchema,
} from '../../authoring/index.js';
import { GO_RUNTIME_SOURCE } from '../../emitters/go-runtime-sources.js';
import type {
  ApiModel,
  OperationModel,
  ParamModel,
  PropertyModel,
  SchemaModel,
  ServerModel,
} from '../../intermediate-representation/model.js';
import type { CodeSample, Generator, SampleContext } from '../types.js';

const GO = RESERVED_WORDS.go;

/**
 * The package clause the output declares. Rewriting an invalid name would hide the
 * publisher's typo behind a package their imports don't mention, so this rejects it.
 */
function goPackageName(configured: string | undefined): string {
  if (configured === undefined) return 'client';
  if (!/^[a-z_][a-z0-9_]*$/.test(configured) || GO.has(configured)) {
    throw new NotSupportedError(
      `goPackage "${configured}" is not a valid Go package name: use lowercase letters, digits, and underscores, don't start with a digit, and avoid Go keywords.`
    );
  }
  return configured;
}

/** An exported Go identifier (PascalCase; keywords can't collide since these start uppercase). */
function exported(name: string): string {
  const ident = identifierFor(name, { style: 'pascal', reserved: GO });
  // A digit-leading name gets `_`-prefixed by identifierFor, which in Go means
  // UNexported — encoding/json would silently skip the field. `N` (number) keeps it exported.
  return ident.startsWith('_') ? `N${ident.slice(1)}` : ident;
}

/** The Go type for a schema; `required=false` optionals become pointers at the field site. */
export function goType(schema: SchemaModel, dateType: DateType = 'string'): string {
  if (isNullable(schema)) {
    const inner = goType(unwrapNullable(schema), dateType);
    return inner.startsWith('*') || inner === 'any' ? inner : `*${inner}`;
  }
  switch (schema.kind) {
    case 'scalar':
      // Under `dateType: Date`, a date-time is a time.Time (encoding/json handles
      // RFC 3339 natively) and a bare date is the runtime's `Date` wrapper.
      if (dateType === 'Date' && schema.scalar === 'string') {
        if (schema.metadata?.format === 'date-time') return 'time.Time';
        if (schema.metadata?.format === 'date') return 'Date';
      }
      return { string: 'string', integer: 'int64', number: 'float64', boolean: 'bool' }[
        schema.scalar
      ];
    case 'array':
      return `[]${goType(schema.items, dateType)}`;
    case 'record':
      return `map[string]${goType(schema.value, dateType)}`;
    case 'ref':
      return exported(schema.name);
    case 'literal':
      return typeof schema.value === 'string'
        ? 'string'
        : typeof schema.value === 'boolean'
          ? 'bool'
          : 'float64';
    case 'enum':
      // Anonymous (inline) enums keep the wire scalar; only NAMED enums get types.
      return { string: 'string', integer: 'int64', number: 'float64', boolean: 'bool' }[
        schema.scalar
      ];
    case 'omit':
      // Go has no Omit; the base struct is the honest annotation (readOnly
      // fields are server-managed and simply omitted from requests).
      return exported(schema.base);
    case 'union':
    case 'null':
    case 'object':
    case 'intersection':
    case 'unknown':
      return 'any';
  }
}

function writeDocComment(printer: Printer, name: string, description?: string): void {
  const lines = docText(description);
  if (lines.length === 0) return;
  printer.line(`// ${name} — ${lines[0]}`);
  // A blank line inside a description is `//`, never `// ` — gofmt strips the space — and
  // CONSECUTIVE blank lines collapse to one, because gofmt rewrites `//\n//` that way.
  let previousWasBlank = false;
  for (const line of lines.slice(1)) {
    if (line === '') {
      if (!previousWasBlank) printer.line('//');
      previousWasBlank = true;
      continue;
    }
    printer.line(`// ${line}`);
    previousWasBlank = false;
  }
}

function writeStruct(
  printer: Printer,
  name: string,
  properties: PropertyModel[],
  dateType: DateType,
  description?: string
): void {
  writeDocComment(printer, exported(name), description);
  printer.block(
    `type ${exported(name)} struct {`,
    () => {
      for (const property of properties) {
        const field = exported(property.name);
        let fieldType = goType(property.schema, dateType);
        let tag = `\`json:"${property.name}"\``;
        if (!property.required) {
          if (
            !fieldType.startsWith('*') &&
            !fieldType.startsWith('[]') &&
            !fieldType.startsWith('map[') &&
            fieldType !== 'any'
          ) {
            fieldType = `*${fieldType}`;
          }
          tag = `\`json:"${property.name},omitempty"\``;
        }
        printer.line(`${field} ${fieldType} ${tag}`);
      }
    },
    '}'
  );
  printer.blank();
}

/**
 * The whitespace shape gofmt produces: never more than one blank line, and exactly one
 * trailing newline. Both entry points below run through it, so the models view is as
 * gofmt-clean as the full client.
 */
function gofmtShape(source: string): string {
  return `${source.replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
}

/** Render every named schema: typed-const enums, structs (allOf flattened), union dispatchers. */
export function renderGoModels(model: ApiModel, dateType: DateType = 'string'): string {
  const printer = new Printer('\t');
  printer.line('package client');
  printer.blank();
  const needsJSON = model.schemas.some(
    ({ schema }) => discriminatorCases(schema, model) !== undefined
  );
  if (needsJSON) {
    printer.line('import "encoding/json"');
    printer.blank();
  }
  // The models section also compiles standalone (see the unit bars), so it declares
  // its own `time` import when a field is a date.
  const body = renderGoModelBodies(model, dateType);
  if (dateType === 'Date' && body.includes('time.Time')) {
    printer.line('import "time"');
    printer.blank();
  }
  printer.line(body);
  return gofmtShape(alignGoColumns(printer.toString()));
}

/** The struct/enum/union declarations themselves — the header is renderGoModels' job. */
function renderGoModelBodies(model: ApiModel, dateType: DateType): string {
  const printer = new Printer('\t');

  for (const { name, schema } of model.schemas) {
    const asEnum = enumValues(schema);
    if (asEnum !== undefined) {
      const base = asEnum.scalar === 'string' ? 'string' : 'int64';
      writeDocComment(printer, exported(name), schema.description);
      printer.line(`type ${exported(name)} ${base}`);
      printer.blank();
      printer.block(
        'const (',
        () => {
          // Two values may fold to one pascal name (`1.5` and `15`) — a duplicate const
          // would not compile, so the names are made unique per enum. A digit-leading
          // value needs no `_` prefix here: the member starts with the type name.
          const used = new Set<string>();
          asEnum.values.forEach((value) => {
            const base = casing.pascal(String(value)) || 'Value';
            let suffix = '';
            for (let n = 2; used.has(base + suffix); n++) suffix = String(n);
            used.add(base + suffix);
            const member = exported(name) + base + suffix;
            printer.line(`${member} ${exported(name)} = ${JSON.stringify(value)}`);
          });
        },
        ')'
      );
      printer.blank();
      continue;
    }
    if (schema.kind === 'object' || schema.kind === 'intersection') {
      const flat = flattenAllOf(schema, model);
      if (flat !== undefined) {
        writeStruct(
          printer,
          name,
          flat.properties,
          dateType,
          flat.description ?? schema.description
        );
        continue;
      }
    }
    const cases = discriminatorCases(schema, model);
    if (cases !== undefined) {
      const typeName = exported(name);
      const table = cases.cases
        .map((entry) => `${entry.value} -> ${exported(entry.schemaName)}`)
        .join(', ');
      printer.line(`// ${typeName} is a discriminated union ("${cases.property}"): ${table}.`);
      printer.line(`type ${typeName} = any`);
      printer.blank();
      printer.line(
        `// Unmarshal${typeName} decodes into the member selected by "${cases.property}".`
      );
      printer.block(
        `func Unmarshal${typeName}(data []byte) (${typeName}, error) {`,
        () => {
          printer.block(
            'var probe struct {',
            () => {
              printer.line(`Discriminant string \`json:"${cases.property}"\``);
            },
            '}'
          );
          printer.block(
            'if err := json.Unmarshal(data, &probe); err != nil {',
            () => {
              printer.line('return nil, err');
            },
            '}'
          );
          // gofmt keeps `case` at the switch's own indent, so the switch body is NOT
          // indented as a block — only each case's statements are.
          printer.line('switch probe.Discriminant {');
          for (const entry of cases.cases) {
            printer.block(`case ${JSON.stringify(entry.value)}:`, () => {
              printer.line(`var value ${exported(entry.schemaName)}`);
              printer.line('err := json.Unmarshal(data, &value)');
              printer.line('return value, err');
            });
          }
          printer.line('}');
          printer.line('var fallback any');
          printer.line('err := json.Unmarshal(data, &fallback)');
          printer.line('return fallback, err');
        },
        '}'
      );
      printer.blank();
      continue;
    }
    // Everything else (plain unions, scalar aliases, records) becomes a type alias.
    writeDocComment(printer, exported(name), schema.description);
    printer.line(`type ${exported(name)} = ${goType(schema, dateType)}`);
    printer.blank();
  }
  return printer.toString();
}

/** Go composite literal for one operation's security OR-alternatives. */
function goSecurityLiteral(op: OperationModel, model: ApiModel): string | undefined {
  const alternatives = securityRequirements(op, model).map((alternative) =>
    alternative.map((spec) =>
      spec.kind === 'apiKey'
        ? `{Scheme: ${JSON.stringify(spec.scheme)}, Kind: "apiKey", Name: ${JSON.stringify(spec.name)}, In: ${JSON.stringify(spec.in)}}`
        : `{Scheme: ${JSON.stringify(spec.scheme)}, Kind: ${JSON.stringify(spec.kind)}}`
    )
  );
  if (alternatives.length === 0) return undefined;
  return `[][]SecuritySpec{${alternatives.map((specs) => `{${specs.join(', ')}}`).join(', ')}}`;
}

/** Every operation with its collision-free exported Go method name. */
function goOperationIdents(model: ApiModel): Array<{ op: OperationModel; ident: string }> {
  const used = new Set<string>();
  const out: Array<{ op: OperationModel; ident: string }> = [];
  for (const service of model.services) {
    for (const op of service.operations) {
      let ident = exported(op.name);
      let suffix = 2;
      while (used.has(ident)) ident = `${exported(op.name)}${suffix++}`;
      used.add(ident);
      out.push({ op, ident });
    }
  }
  return out;
}

/** A query-value expression formatted to string for url.Values. */
function goQueryFormat(expr: string, type: string): string {
  if (type === 'string') return expr;
  // Dates serialize in their wire layout, not Go's default String(). A dereferenced
  // pointer needs parentheses: `*p.Format(…)` would deref Format's result.
  const receiver = expr.startsWith('*') ? `(${expr})` : expr;
  if (type === 'time.Time') return `${receiver}.Format(time.RFC3339)`;
  if (type === 'Date') return `${receiver}.Format("2006-01-02")`;
  if (type === 'int64') return `strconv.FormatInt(${expr}, 10)`;
  if (type === 'float64') return `strconv.FormatFloat(${expr}, 'f', -1, 64)`;
  if (type === 'bool') return `strconv.FormatBool(${expr})`;
  return `fmt.Sprint(${expr})`;
}

/**
 * Align columns the way gofmt does, so the emitted file is already idiomatic and a
 * `gofmt` run is a no-op. gofmt pads with spaces inside a contiguous run of similar
 * lines: struct fields align their type and tag columns, `const`/`var` entries align
 * their type and `=`. A line that doesn't fit the shape (a comment, a blank line, a
 * type containing spaces) ends the run, exactly like gofmt's tabwriter.
 */
function alignGoColumns(source: string): string {
  const lines = source.split('\n');
  const out = [...lines];
  // `\tName Type` optionally followed by a `json:"…"` tag, `\tName Type = value`, or a
  // quoted map key. A statement starting with a Go keyword (`case "x":`, `return y`) is
  // NOT a declaration and must never be padded.
  const FIELD = /^(\t+)([A-Za-z_]\w*) (\S+)( `[^`]*`)?$/;
  const CONST = /^(\t+)([A-Za-z_]\w*) (\S+) = (.+)$/;
  const ENTRY = /^(\t+)("(?:[^"\\]|\\.)*":) (.+)$/;

  const flush = (run: Array<{ index: number; parts: string[]; indent: string }>): void => {
    if (run.length < 2) return;
    const widths: number[] = [];
    for (const { parts } of run) {
      parts.forEach((part, column) => {
        // The last column never needs padding.
        if (column < parts.length - 1) widths[column] = Math.max(widths[column] ?? 0, part.length);
      });
    }
    for (const { index, parts, indent } of run) {
      const padded = parts.map((part, column) =>
        column < parts.length - 1 ? part.padEnd(widths[column] ?? 0) : part
      );
      out[index] = indent + padded.join(' ').trimEnd();
    }
  };

  let run: Array<{ index: number; parts: string[]; indent: string }> = [];
  let runKind: 'field' | 'const' | 'entry' | undefined;
  lines.forEach((line, index) => {
    const entryMatch = ENTRY.exec(line);
    const constMatch = entryMatch === null ? CONST.exec(line) : null;
    const fieldCandidate = entryMatch === null && constMatch === null ? FIELD.exec(line) : null;
    // `case`, `return`, `var`, … start statements, not declarations.
    const fieldMatch =
      fieldCandidate !== null && !GO.has(fieldCandidate[2]) ? fieldCandidate : null;
    const kind =
      entryMatch !== null
        ? 'entry'
        : constMatch !== null
          ? 'const'
          : fieldMatch !== null
            ? 'field'
            : undefined;
    if (kind === undefined || kind !== runKind) {
      flush(run);
      run = [];
      runKind = kind;
    }
    if (entryMatch !== null) {
      run.push({ index, indent: entryMatch[1], parts: [entryMatch[2], entryMatch[3]] });
      return;
    }
    if (constMatch !== null) {
      run.push({
        index,
        indent: constMatch[1],
        parts: [constMatch[2], constMatch[3], '=', constMatch[4]],
      });
      return;
    }
    if (fieldMatch !== null) {
      const parts = [fieldMatch[2], fieldMatch[3]];
      if (fieldMatch[4] !== undefined) parts.push(fieldMatch[4].trimStart());
      run.push({ index, indent: fieldMatch[1], parts });
    }
  });
  flush(run);
  return out.join('\n');
}

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

/** The neutral rule as a `&PaginationSpec{…}` composite literal for the operations table. */
function goPaginationLiteral(rule: NeutralPaginationRule): string {
  const fields = [
    `Style: ${JSON.stringify(rule.style)}`,
    ...(rule.param !== undefined ? [`Param: ${JSON.stringify(rule.param)}`] : []),
    ...(rule.nextCursor !== undefined ? [`NextCursor: ${JSON.stringify(rule.nextCursor)}`] : []),
    ...(rule.hasMore !== undefined ? [`HasMore: ${JSON.stringify(rule.hasMore)}`] : []),
    ...(rule.limitParam !== undefined ? [`LimitParam: ${JSON.stringify(rule.limitParam)}`] : []),
    ...(rule.items !== undefined ? [`Items: ${JSON.stringify(rule.items)}`] : []),
  ];
  return `&PaginationSpec{${fields.join(', ')}}`;
}

/**
 * The argument names a method declares beside its path parameters: the receiver, the
 * context, the request body, and the query struct.
 */
const METHOD_ARG_SLOTS = ['c', 'ctx', 'body', 'params', 'out', 'op'];

/**
 * Path parameters as Go arguments, uniquely named. A parameter named after one of the
 * method's own arguments (or a name a description reuses across locations) moves aside as
 * `id2` — Go rejects a duplicate parameter, and the wire name is untouched either way.
 */
function pathArguments(
  op: OperationModel,
  dateType: DateType
): Array<{ param: ParamModel; go: string; type: string }> {
  const names = uniqueIdentifiers(
    op.pathParams.map((param) => param.name),
    { style: 'camel', reserved: GO, taken: METHOD_ARG_SLOTS }
  );
  return op.pathParams.map((param, index) => ({
    param,
    go: names[index],
    type: goType(param.schema, dateType),
  }));
}

/** Declared response headers planned for the `<Op>Headers` struct: field, wire name, coerce helper. */
function envelopeHeaderPlan(
  op: OperationModel,
  model: ApiModel
): Array<{ field: string; name: string; goType: string; helper: string }> {
  const used = new Set<string>();
  return (op.successResponseHeaders ?? []).map((header) => {
    const base = exported(header.name);
    let field = base;
    let suffix = 2;
    while (used.has(field)) field = `${base}${suffix++}`;
    used.add(field);
    const coerce = headerCoerceType(header.schema, model);
    const mapping = {
      integer: { goType: '*int64', helper: 'headerInt64' },
      number: { goType: '*float64', helper: 'headerFloat64' },
      boolean: { goType: '*bool', helper: 'headerBool' },
      string: { goType: '*string', helper: 'headerString' },
    }[coerce];
    return { field, name: header.name, ...mapping };
  });
}

function writeGoMethod(
  printer: Printer,
  op: OperationModel,
  ident: string,
  dateType: DateType,
  model?: ApiModel,
  envelope = false
): void {
  const pathArgs = pathArguments(op, dateType);
  const hasParams = op.queryParams.length > 0;
  const success = jsonSuccessSchema(op);
  const returnType = success === undefined ? undefined : goType(success, dateType);
  const headerPlan = envelope ? envelopeHeaderPlan(op, model!) : [];
  if (envelope) {
    printer.line(
      `// ${ident}Headers carries the declared response headers of ${ident}WithHeaders (nil when absent or unparsable).`
    );
    printer.block(
      `type ${ident}Headers struct {`,
      () => {
        for (const planned of headerPlan) printer.line(`${planned.field} ${planned.goType}`);
      },
      '}'
    );
    printer.blank();
  }
  const args = [
    'ctx context.Context',
    ...pathArgs.map(({ go, type }) => `${go} ${type}`),
    ...(op.requestBody ? [`body ${goType(op.requestBody.schema, dateType)}`] : []),
    ...(hasParams ? [`params *${ident}Params`] : []),
  ];
  const sse = sseResponse(op);
  const returns = envelope
    ? returnType === undefined
      ? `(${ident}Headers, error)`
      : `(${returnType}, ${ident}Headers, error)`
    : sse !== undefined
      ? 'func(yield func(ServerSentEvent, error) bool)'
      : returnType === undefined
        ? 'error'
        : `(${returnType}, error)`;
  const fail = (errExpr: string) =>
    envelope
      ? returnType === undefined
        ? `return headers, ${errExpr}`
        : `return out, headers, ${errExpr}`
      : returnType === undefined
        ? `return ${errExpr}`
        : `return out, ${errExpr}`;
  const funcName = envelope ? `${ident}WithHeaders` : ident;
  writeDocComment(
    printer,
    funcName,
    envelope ? `Like ${ident}, also returning the declared response headers.` : op.summary
  );
  printer.block(
    `func (c *Client) ${funcName}(${args.join(', ')}) ${returns} {`,
    () => {
      if (sse === undefined && returnType !== undefined) printer.line(`var out ${returnType}`);
      if (envelope) printer.line(`var headers ${ident}Headers`);
      printer.line(`op := operations[${JSON.stringify(op.specName ?? op.name)}]`);
      printer.line('authHeaders, query := resolveAuth(op.Security, c.config.Auth)');
      if (hasParams) {
        printer.block(
          'if params != nil {',
          () => {
            for (const param of op.queryParams) {
              const field = exported(param.name);
              printer.block(
                `if params.${field} != nil {`,
                () => {
                  // An array repeats the key per element (OpenAPI `form` + `explode`, the
                  // default — and what the TS runtime sends). `fmt.Sprint` of a slice
                  // would put `[a b]` on the wire as one value.
                  if (param.schema.kind === 'array') {
                    const elementType = goType(param.schema.items, dateType);
                    printer.block(
                      `for _, item := range *params.${field} {`,
                      () => {
                        printer.line(
                          `query.Add(${JSON.stringify(param.name)}, ${goQueryFormat('item', elementType)})`
                        );
                      },
                      '}'
                    );
                  } else {
                    printer.line(
                      `query.Set(${JSON.stringify(param.name)}, ${goQueryFormat(`*params.${field}`, goType(param.schema, dateType))})`
                    );
                  }
                },
                '}'
              );
            }
          },
          '}'
        );
      }
      const pathDict = pathArgs
        .map(({ param, go, type }) => `${JSON.stringify(param.name)}: ${goQueryFormat(go, type)}`)
        .join(', ');
      printer.line(
        `requestURL := buildURL(c.config.ServerURL, op.Path, map[string]string{${pathDict}})`
      );
      if (sse !== undefined) {
        printer.block(
          'open := func(extraHeaders map[string]string) (*http.Response, error) {',
          () => {
            printer.line('merged := map[string]string{}');
            printer.block(
              'for key, value := range authHeaders {',
              () => {
                printer.line('merged[key] = value');
              },
              '}'
            );
            printer.block(
              'for key, value := range extraHeaders {',
              () => {
                printer.line('merged[key] = value');
              },
              '}'
            );
            printer.line(
              'return send(ctx, &c.config, requestSpec{OperationID: op.ID, Method: op.Method, URL: requestURL, Headers: merged, Query: query})'
            );
          },
          '}'
        );
        printer.line(
          `return iterSSE(open, ${sse.schema !== undefined && sse.schema.kind !== 'unknown'})`
        );
        return;
      }
      const specFields = [
        'OperationID: op.ID',
        'Method: op.Method',
        'URL: requestURL',
        'Headers: authHeaders',
        'Query: query',
      ];
      if (op.requestBody && isMultipartBody(op)) {
        printer.line('contentType, reader, err := toMultipart(body)');
        printer.block(
          'if err != nil {',
          () => {
            printer.line(fail('err'));
          },
          '}'
        );
        specFields.push('Body: reader');
        specFields.push('ContentType: contentType');
      } else if (op.requestBody) {
        printer.line('payload, err := json.Marshal(body)');
        printer.block(
          'if err != nil {',
          () => {
            printer.line(fail('err'));
          },
          '}'
        );
        specFields.push('Body: bytes.NewReader(payload)');
        specFields.push(`ContentType: ${JSON.stringify(op.requestBody.contentType)}`);
      }
      printer.line(`resp, err := send(ctx, &c.config, requestSpec{${specFields.join(', ')}})`);
      printer.block(
        'if err != nil {',
        () => {
          printer.line(fail('err'));
        },
        '}'
      );
      printer.block(
        'if resp.StatusCode >= 400 {',
        () => {
          printer.line(fail('apiErrorFrom(resp, requestURL)'));
        },
        '}'
      );
      if (envelope) {
        printer.block(
          `if err := decodeJSON(resp, ${returnType === undefined ? 'nil' : '&out'}); err != nil {`,
          () => {
            printer.line(fail('err'));
          },
          '}'
        );
        for (const planned of headerPlan) {
          printer.line(
            `headers.${planned.field} = ${planned.helper}(resp.Header, ${JSON.stringify(planned.name)})`
          );
        }
        printer.line(returnType === undefined ? 'return headers, nil' : 'return out, headers, nil');
      } else if (returnType === undefined) {
        printer.line('return decodeJSON(resp, nil)');
      } else {
        printer.block(
          'if err := decodeJSON(resp, &out); err != nil {',
          () => {
            printer.line('return out, err');
          },
          '}'
        );
        printer.line('return out, nil');
      }
    },
    '}'
  );
  printer.blank();
}

/** `<Op>Pages` / `<Op>Items` iterators over the runtime's `iterPages`, hydrated via `reencode`. */
function writeGoPaginationWrappers(
  printer: Printer,
  op: OperationModel,
  ident: string,
  dateType: DateType,
  pageType: string,
  itemType: string
): void {
  const pathArgs = pathArguments(op, dateType);
  const hasParams = op.queryParams.length > 0;
  const args = [
    'ctx context.Context',
    ...pathArgs.map(({ go, type }) => `${go} ${type}`),
    ...(hasParams ? [`params *${ident}Params`] : []),
  ].join(', ');

  const writeCallClosure = () => {
    printer.line(`op := operations[${JSON.stringify(op.specName ?? op.name)}]`);
    printer.line('base := url.Values{}');
    if (hasParams) {
      printer.block(
        'if params != nil {',
        () => {
          for (const param of op.queryParams) {
            const field = exported(param.name);
            printer.block(
              `if params.${field} != nil {`,
              () => {
                printer.line(
                  `base.Set(${JSON.stringify(param.name)}, ${goQueryFormat(`*params.${field}`, goType(param.schema, dateType))})`
                );
              },
              '}'
            );
          }
        },
        '}'
      );
    }
    printer.block(
      'call := func(pageParams url.Values) (any, *http.Response, error) {',
      () => {
        printer.line('authHeaders, query := resolveAuth(op.Security, c.config.Auth)');
        printer.block(
          'for key, values := range pageParams {',
          () => {
            printer.block(
              'for _, value := range values {',
              () => {
                printer.line('query.Set(key, value)');
              },
              '}'
            );
          },
          '}'
        );
        const pathDict = pathArgs
          .map(({ param, go, type }) => `${JSON.stringify(param.name)}: ${goQueryFormat(go, type)}`)
          .join(', ');
        printer.line(
          `requestURL := buildURL(c.config.ServerURL, op.Path, map[string]string{${pathDict}})`
        );
        printer.line(
          'resp, err := send(ctx, &c.config, requestSpec{OperationID: op.ID, Method: op.Method, URL: requestURL, Headers: authHeaders, Query: query})'
        );
        printer.block(
          'if err != nil {',
          () => {
            printer.line('return nil, nil, err');
          },
          '}'
        );
        printer.block(
          'if resp.StatusCode >= 400 {',
          () => {
            printer.line('return nil, resp, apiErrorFrom(resp, requestURL)');
          },
          '}'
        );
        printer.line('var raw any');
        printer.block(
          'if err := decodeJSON(resp, &raw); err != nil {',
          () => {
            printer.line('return nil, resp, err');
          },
          '}'
        );
        printer.line('return raw, resp, nil');
      },
      '}'
    );
    printer.line('pages := iterPages(call, *op.Pagination, base)');
  };

  printer.line(
    `// ${ident}Pages iterates ${ident} response pages; use with \`for page, err := range\`.`
  );
  printer.block(
    `func (c *Client) ${ident}Pages(${args}) func(yield func(${pageType}, error) bool) {`,
    () => {
      writeCallClosure();
      printer.block(
        `return func(yield func(${pageType}, error) bool) {`,
        () => {
          printer.block(
            'pages(func(raw any, err error) bool {',
            () => {
              printer.line(`var page ${pageType}`);
              printer.block(
                'if err == nil {',
                () => {
                  printer.line('err = reencode(raw, &page)');
                },
                '}'
              );
              printer.line('return yield(page, err)');
            },
            '})'
          );
        },
        '}'
      );
    },
    '}'
  );
  printer.blank();

  printer.line(`// ${ident}Items iterates the items of every ${ident} page.`);
  printer.block(
    `func (c *Client) ${ident}Items(${args}) func(yield func(${itemType}, error) bool) {`,
    () => {
      writeCallClosure();
      printer.block(
        `return func(yield func(${itemType}, error) bool) {`,
        () => {
          printer.block(
            'pages(func(raw any, err error) bool {',
            () => {
              printer.block(
                'if err != nil {',
                () => {
                  printer.line(`var zero ${itemType}`);
                  printer.line('return yield(zero, err)');
                },
                '}'
              );
              printer.line('pageItems, _ := resolvePointer(raw, op.Pagination.Items).([]any)');
              printer.block(
                'for _, item := range pageItems {',
                () => {
                  printer.line(`var typed ${itemType}`);
                  printer.block(
                    'if err := reencode(item, &typed); err != nil {',
                    () => {
                      printer.line('return yield(typed, err)');
                    },
                    '}'
                  );
                  printer.block(
                    'if !yield(typed, nil) {',
                    () => {
                      printer.line('return false');
                    },
                    '}'
                  );
                },
                '}'
              );
              printer.line('return true');
            },
            '})'
          );
        },
        '}'
      );
    },
    '}'
  );
  printer.blank();
}

/** The server URL as a Go expression: literals concatenated with declared-variable args. */
function serverUrlExpression(server: ServerModel): string {
  const parts = serverUrlParts(server).map((part) =>
    part.kind === 'literal'
      ? JSON.stringify(part.value)
      : identifierFor(part.name, { style: 'camel', reserved: GO })
  );
  return parts.join(' + ');
}

/** One `<Name>URL` function per declared server; server variables become parameters. */
function writeGoServers(printer: Printer, model: ApiModel): void {
  const servers = model.servers ?? [];
  if (servers.length === 0) return;
  const usedNames = new Set<string>();
  servers.forEach((server, index) => {
    let name = `${exported(server.description ?? `server${index + 1}`)}URL`;
    if (usedNames.has(name)) name = `${name}${index + 1}`;
    usedNames.add(name);
    const params = server.variables.map(
      (variable) => `${identifierFor(variable.name, { style: 'camel', reserved: GO })} string`
    );
    const defaults = server.variables
      .map(
        (variable) =>
          `${identifierFor(variable.name, { style: 'camel', reserved: GO })} default: ${JSON.stringify(variable.default)}`
      )
      .join(', ');
    printer.line(
      `// ${name} returns the ${JSON.stringify(server.description ?? server.url)} base URL${defaults === '' ? '.' : ` (${defaults}).`}`
    );
    printer.block(
      `func ${name}(${params.join(', ')}) string {`,
      () => {
        printer.line(`return ${serverUrlExpression(server)}`);
      },
      '}'
    );
    printer.blank();
  });
}

/** The whole generated file: models + embedded runtime + operations table + Client. */
export const goGenerator: Generator = ({ model, outputPath, emit }) => {
  const printer = new Printer('\t');
  const dateType = emit.dateType ?? 'string';
  const packageName = goPackageName(emit.goPackage);
  const paginationRules = new Map<string, NeutralPaginationRule>();
  for (const { op, ident } of goOperationIdents(model)) {
    const rule = paginationRuleFor(op, emit.pagination as Record<string, unknown> | undefined);
    if (rule !== undefined) paginationRules.set(ident, rule);
  }
  printer.line(
    `// Code generated by @redocly/client-generator (go) from "${model.title}" ${model.version}. DO NOT EDIT.`
  );
  printer.line(
    '// Regenerate with `redocly generate-client`. Standard library only — zero dependencies.'
  );
  printer.line(`package ${packageName}`);
  printer.blank();
  // One merged import block: the runtime uses every entry; generated code uses a subset.
  printer.block(
    'import (',
    () => {
      for (const spec of [
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
      ]) {
        printer.line(JSON.stringify(spec));
      }
    },
    ')'
  );
  printer.blank();

  printer.line(stripHeader(renderGoModels(model, dateType)));
  printer.blank();
  writeGoServers(printer, model);
  printer.line('// ─── Embedded runtime (@redocly/client-generator go runtime) ───');
  printer.line(stripHeader(GO_RUNTIME_SOURCE));
  printer.blank();

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
          `ID: ${JSON.stringify(id)}`,
          `Method: ${JSON.stringify(op.method.toUpperCase())}`,
          `Path: ${JSON.stringify(op.path)}`,
          ...(security !== undefined ? [`Security: ${security}`] : []),
          ...(rule !== undefined ? [`Pagination: ${goPaginationLiteral(rule)}`] : []),
        ];
        printer.line(`${JSON.stringify(id)}: {${fields.join(', ')}},`);
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

  writeDocComment(printer, 'Client', `Client for ${model.title} (${model.version}).`);
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
            `config.ServerURL = ${JSON.stringify(emit.serverUrl ?? model.serverUrl ?? '')}`
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

  return [
    {
      path: outputPath.replace(/\.[^.\\/]+$/, '.go'),
      // Sections are stitched with their own trailing blanks; gofmt allows at most one
      // between declarations and none at the end of the file.
      content: gofmtShape(alignGoColumns(printer.toString())),
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
export const goDocs: Generator = ({ model, outputPath, emit }) => [
  {
    path: outputPath.replace(/\.[^.\\/]+$/, '.go.md'),
    content: renderReferencePage(model, {
      title: `${model.title} Go SDK reference`,
      frontmatter: emit.docsFrontmatter === true,
      language: {
        name: 'go',
        label: 'Go',
        fence: 'go',
        requires: 'The SDK needs the standard library only.',
      },
      sample: (op) => goSample(op, { model, emit, outputPath }),
      pagination: emit.pagination,
    }),
  },
];

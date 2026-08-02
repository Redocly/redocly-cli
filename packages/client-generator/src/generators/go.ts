// The built-in `go` generator — the second non-TypeScript library entry,
// authored with the language-neutral toolkit only (same dogfooding invariant as
// the python generator, pinned by its guard test). Output is a single
// stdlib-only Go file: structs with json tags, typed-const enums, discriminated
// unions with unmarshal dispatchers, and a Client over the embedded runtime.

import {
  casing,
  CodeWriter,
  discriminatorCases,
  docText,
  enumValues,
  flattenAllOf,
  identifierFor,
  isNullable,
  paginationRuleFor,
  RESERVED_WORDS,
  schemaAtPointer,
  unwrapNullable,
  type NeutralPaginationRule,
} from '../authoring/index.js';
import { GO_RUNTIME_SOURCE } from '../emitters/go-runtime-sources.js';
import type {
  ApiModel,
  OperationModel,
  PropertyModel,
  SchemaModel,
} from '../intermediate-representation/model.js';
import type { CodeSample, Generator, SampleContext } from './types.js';

const GO = RESERVED_WORDS.go;

/** An exported Go identifier (PascalCase; keywords can't collide since these start uppercase). */
function exported(name: string): string {
  const ident = identifierFor(name, { style: 'pascal', reserved: GO });
  // A digit-leading name gets `_`-prefixed by identifierFor, which in Go means
  // UNexported — encoding/json would silently skip the field. `N` (number) keeps it exported.
  return ident.startsWith('_') ? `N${ident.slice(1)}` : ident;
}

/** The Go type for a schema; `required=false` optionals become pointers at the field site. */
export function goType(schema: SchemaModel): string {
  if (isNullable(schema)) {
    const inner = goType(unwrapNullable(schema));
    return inner.startsWith('*') || inner === 'any' ? inner : `*${inner}`;
  }
  switch (schema.kind) {
    case 'scalar':
      return { string: 'string', integer: 'int64', number: 'float64', boolean: 'bool' }[
        schema.scalar
      ];
    case 'array':
      return `[]${goType(schema.items)}`;
    case 'record':
      return `map[string]${goType(schema.value)}`;
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

function writeDocComment(writer: CodeWriter, name: string, description?: string): void {
  const lines = docText(description);
  if (lines.length === 0) return;
  writer.line(`// ${name} — ${lines[0]}`);
  for (const line of lines.slice(1)) writer.line(`// ${line}`);
}

function writeStruct(
  writer: CodeWriter,
  name: string,
  properties: PropertyModel[],
  description?: string
): void {
  writeDocComment(writer, exported(name), description);
  writer.block(
    `type ${exported(name)} struct {`,
    () => {
      for (const property of properties) {
        const field = exported(property.name);
        let fieldType = goType(property.schema);
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
        writer.line(`${field} ${fieldType} ${tag}`);
      }
    },
    '}'
  );
  writer.blank();
}

/** Render every named schema: typed-const enums, structs (allOf flattened), union dispatchers. */
export function renderGoModels(model: ApiModel): string {
  const writer = new CodeWriter('\t');
  writer.line('package client');
  writer.blank();
  const needsJSON = model.schemas.some(
    ({ schema }) => discriminatorCases(schema, model) !== undefined
  );
  if (needsJSON) {
    writer.line('import "encoding/json"');
    writer.blank();
  }

  for (const { name, schema } of model.schemas) {
    const asEnum = enumValues(schema);
    if (asEnum !== undefined) {
      const base = asEnum.scalar === 'string' ? 'string' : 'int64';
      writeDocComment(writer, exported(name), schema.description);
      writer.line(`type ${exported(name)} ${base}`);
      writer.blank();
      writer.block(
        'const (',
        () => {
          asEnum.values.forEach((value) => {
            const member = exported(name) + casing.pascal(String(value));
            writer.line(`${member} ${exported(name)} = ${JSON.stringify(value)}`);
          });
        },
        ')'
      );
      writer.blank();
      continue;
    }
    if (schema.kind === 'object' || schema.kind === 'intersection') {
      const flat = flattenAllOf(schema, model);
      if (flat !== undefined) {
        writeStruct(writer, name, flat.properties, flat.description ?? schema.description);
        continue;
      }
    }
    const cases = discriminatorCases(schema, model);
    if (cases !== undefined) {
      const typeName = exported(name);
      const table = cases.cases
        .map((entry) => `${entry.value} -> ${exported(entry.schemaName)}`)
        .join(', ');
      writer.line(`// ${typeName} is a discriminated union ("${cases.property}"): ${table}.`);
      writer.line(`type ${typeName} = any`);
      writer.blank();
      writer.line(
        `// Unmarshal${typeName} decodes into the member selected by "${cases.property}".`
      );
      writer.block(
        `func Unmarshal${typeName}(data []byte) (${typeName}, error) {`,
        () => {
          writer.block(
            'var probe struct {',
            () => {
              writer.line(`Discriminant string \`json:"${cases.property}"\``);
            },
            '}'
          );
          writer.block(
            'if err := json.Unmarshal(data, &probe); err != nil {',
            () => {
              writer.line('return nil, err');
            },
            '}'
          );
          writer.block(
            'switch probe.Discriminant {',
            () => {
              for (const entry of cases.cases) {
                writer.block(`case ${JSON.stringify(entry.value)}:`, () => {
                  writer.line(`var value ${exported(entry.schemaName)}`);
                  writer.line('err := json.Unmarshal(data, &value)');
                  writer.line('return value, err');
                });
              }
            },
            '}'
          );
          writer.line('var fallback any');
          writer.line('err := json.Unmarshal(data, &fallback)');
          writer.line('return fallback, err');
        },
        '}'
      );
      writer.blank();
      continue;
    }
    // Everything else (plain unions, scalar aliases, records) becomes a type alias.
    writeDocComment(writer, exported(name), schema.description);
    writer.line(`type ${exported(name)} = ${goType(schema)}`);
    writer.blank();
  }
  return writer.toString();
}

/** The operation's primary JSON success schema, or undefined for void/no-body ops. */
function successSchema(op: OperationModel): SchemaModel | undefined {
  return op.successResponses.find((r) => r.contentType.toLowerCase().includes('json'))?.schema;
}

/** Go composite literal for one operation's security OR-alternatives. */
function goSecurityLiteral(op: OperationModel, model: ApiModel): string | undefined {
  const alternatives = op.security
    .map((alternative) =>
      alternative.flatMap((key): string[] => {
        const scheme = model.securitySchemes.find((s) => s.key === key);
        if (scheme === undefined) return [];
        if (scheme.kind === 'bearer' || scheme.kind === 'basic') {
          return [`{Scheme: ${JSON.stringify(key)}, Kind: ${JSON.stringify(scheme.kind)}}`];
        }
        const name =
          scheme.kind === 'apiKeyHeader'
            ? scheme.headerName
            : scheme.kind === 'apiKeyQuery'
              ? scheme.paramName
              : scheme.cookieName;
        const location =
          scheme.kind === 'apiKeyHeader'
            ? 'header'
            : scheme.kind === 'apiKeyQuery'
              ? 'query'
              : 'cookie';
        return [
          `{Scheme: ${JSON.stringify(key)}, Kind: "apiKey", Name: ${JSON.stringify(name)}, In: ${JSON.stringify(location)}}`,
        ];
      })
    )
    .filter((alternative) => alternative.length > 0);
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
  if (type === 'int64') return `strconv.FormatInt(${expr}, 10)`;
  if (type === 'float64') return `strconv.FormatFloat(${expr}, 'f', -1, 64)`;
  if (type === 'bool') return `strconv.FormatBool(${expr})`;
  return `fmt.Sprint(${expr})`;
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

/** The op's SSE success response, when it streams text/event-stream. */
function sseResponse(op: OperationModel) {
  return op.successResponses.find((response) =>
    response.contentType.toLowerCase().includes('text/event-stream')
  );
}

function isMultipart(op: OperationModel): boolean {
  return op.requestBody?.contentType.toLowerCase().includes('multipart') ?? false;
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

function writeGoMethod(writer: CodeWriter, op: OperationModel, ident: string): void {
  const pathArgs = op.pathParams.map((param) => ({
    param,
    go: identifierFor(param.name, { style: 'camel', reserved: GO }),
    type: goType(param.schema),
  }));
  const hasParams = op.queryParams.length > 0;
  const success = successSchema(op);
  const returnType = success === undefined ? undefined : goType(success);
  const args = [
    'ctx context.Context',
    ...pathArgs.map(({ go, type }) => `${go} ${type}`),
    ...(op.requestBody ? [`body ${goType(op.requestBody.schema)}`] : []),
    ...(hasParams ? [`params *${ident}Params`] : []),
  ];
  const sse = sseResponse(op);
  const returns =
    sse !== undefined
      ? 'func(yield func(ServerSentEvent, error) bool)'
      : returnType === undefined
        ? 'error'
        : `(${returnType}, error)`;
  const fail = (errExpr: string) =>
    returnType === undefined ? `return ${errExpr}` : `return out, ${errExpr}`;
  writeDocComment(writer, ident, op.summary);
  writer.block(
    `func (c *Client) ${ident}(${args.join(', ')}) ${returns} {`,
    () => {
      if (sse === undefined && returnType !== undefined) writer.line(`var out ${returnType}`);
      writer.line(`op := operations[${JSON.stringify(op.specName ?? op.name)}]`);
      writer.line('authHeaders, query := resolveAuth(op.Security, c.config.Auth)');
      if (hasParams) {
        writer.block(
          'if params != nil {',
          () => {
            for (const param of op.queryParams) {
              const field = exported(param.name);
              writer.block(
                `if params.${field} != nil {`,
                () => {
                  writer.line(
                    `query.Set(${JSON.stringify(param.name)}, ${goQueryFormat(`*params.${field}`, goType(param.schema))})`
                  );
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
      writer.line(
        `requestURL := buildURL(c.config.ServerURL, op.Path, map[string]string{${pathDict}})`
      );
      if (sse !== undefined) {
        writer.block(
          'open := func(extraHeaders map[string]string) (*http.Response, error) {',
          () => {
            writer.line('merged := map[string]string{}');
            writer.block(
              'for key, value := range authHeaders {',
              () => {
                writer.line('merged[key] = value');
              },
              '}'
            );
            writer.block(
              'for key, value := range extraHeaders {',
              () => {
                writer.line('merged[key] = value');
              },
              '}'
            );
            writer.line(
              'return send(ctx, &c.config, requestSpec{OperationID: op.ID, Method: op.Method, URL: requestURL, Headers: merged, Query: query})'
            );
          },
          '}'
        );
        writer.line(
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
      if (op.requestBody && isMultipart(op)) {
        writer.line('contentType, reader, err := toMultipart(body)');
        writer.block(
          'if err != nil {',
          () => {
            writer.line(fail('err'));
          },
          '}'
        );
        specFields.push('Body: reader');
        specFields.push('ContentType: contentType');
      } else if (op.requestBody) {
        writer.line('payload, err := json.Marshal(body)');
        writer.block(
          'if err != nil {',
          () => {
            writer.line(fail('err'));
          },
          '}'
        );
        specFields.push('Body: bytes.NewReader(payload)');
        specFields.push(`ContentType: ${JSON.stringify(op.requestBody.contentType)}`);
      }
      writer.line(`resp, err := send(ctx, &c.config, requestSpec{${specFields.join(', ')}})`);
      writer.block(
        'if err != nil {',
        () => {
          writer.line(fail('err'));
        },
        '}'
      );
      writer.block(
        'if resp.StatusCode >= 400 {',
        () => {
          writer.line(fail('apiErrorFrom(resp, requestURL)'));
        },
        '}'
      );
      if (returnType === undefined) {
        writer.line('return decodeJSON(resp, nil)');
      } else {
        writer.block(
          'if err := decodeJSON(resp, &out); err != nil {',
          () => {
            writer.line('return out, err');
          },
          '}'
        );
        writer.line('return out, nil');
      }
    },
    '}'
  );
  writer.blank();
}

/** `<Op>Pages` / `<Op>Items` iterators over the runtime's `iterPages`, hydrated via `reencode`. */
function writeGoPaginationWrappers(
  writer: CodeWriter,
  op: OperationModel,
  ident: string,
  pageType: string,
  itemType: string
): void {
  const pathArgs = op.pathParams.map((param) => ({
    param,
    go: identifierFor(param.name, { style: 'camel', reserved: GO }),
    type: goType(param.schema),
  }));
  const hasParams = op.queryParams.length > 0;
  const args = [
    'ctx context.Context',
    ...pathArgs.map(({ go, type }) => `${go} ${type}`),
    ...(hasParams ? [`params *${ident}Params`] : []),
  ].join(', ');

  const writeCallClosure = () => {
    writer.line(`op := operations[${JSON.stringify(op.specName ?? op.name)}]`);
    writer.line('base := url.Values{}');
    if (hasParams) {
      writer.block(
        'if params != nil {',
        () => {
          for (const param of op.queryParams) {
            const field = exported(param.name);
            writer.block(
              `if params.${field} != nil {`,
              () => {
                writer.line(
                  `base.Set(${JSON.stringify(param.name)}, ${goQueryFormat(`*params.${field}`, goType(param.schema))})`
                );
              },
              '}'
            );
          }
        },
        '}'
      );
    }
    writer.block(
      'call := func(pageParams url.Values) (any, *http.Response, error) {',
      () => {
        writer.line('authHeaders, query := resolveAuth(op.Security, c.config.Auth)');
        writer.block(
          'for key, values := range pageParams {',
          () => {
            writer.block(
              'for _, value := range values {',
              () => {
                writer.line('query.Set(key, value)');
              },
              '}'
            );
          },
          '}'
        );
        const pathDict = pathArgs
          .map(({ param, go, type }) => `${JSON.stringify(param.name)}: ${goQueryFormat(go, type)}`)
          .join(', ');
        writer.line(
          `requestURL := buildURL(c.config.ServerURL, op.Path, map[string]string{${pathDict}})`
        );
        writer.line(
          'resp, err := send(ctx, &c.config, requestSpec{OperationID: op.ID, Method: op.Method, URL: requestURL, Headers: authHeaders, Query: query})'
        );
        writer.block(
          'if err != nil {',
          () => {
            writer.line('return nil, nil, err');
          },
          '}'
        );
        writer.block(
          'if resp.StatusCode >= 400 {',
          () => {
            writer.line('return nil, resp, apiErrorFrom(resp, requestURL)');
          },
          '}'
        );
        writer.line('var raw any');
        writer.block(
          'if err := decodeJSON(resp, &raw); err != nil {',
          () => {
            writer.line('return nil, resp, err');
          },
          '}'
        );
        writer.line('return raw, resp, nil');
      },
      '}'
    );
    writer.line('pages := iterPages(call, *op.Pagination, base)');
  };

  writer.line(
    `// ${ident}Pages iterates ${ident} response pages; use with \`for page, err := range\`.`
  );
  writer.block(
    `func (c *Client) ${ident}Pages(${args}) func(yield func(${pageType}, error) bool) {`,
    () => {
      writeCallClosure();
      writer.block(
        `return func(yield func(${pageType}, error) bool) {`,
        () => {
          writer.block(
            'pages(func(raw any, err error) bool {',
            () => {
              writer.line(`var page ${pageType}`);
              writer.block(
                'if err == nil {',
                () => {
                  writer.line('err = reencode(raw, &page)');
                },
                '}'
              );
              writer.line('return yield(page, err)');
            },
            '})'
          );
        },
        '}'
      );
    },
    '}'
  );
  writer.blank();

  writer.line(`// ${ident}Items iterates the items of every ${ident} page.`);
  writer.block(
    `func (c *Client) ${ident}Items(${args}) func(yield func(${itemType}, error) bool) {`,
    () => {
      writeCallClosure();
      writer.block(
        `return func(yield func(${itemType}, error) bool) {`,
        () => {
          writer.block(
            'pages(func(raw any, err error) bool {',
            () => {
              writer.block(
                'if err != nil {',
                () => {
                  writer.line(`var zero ${itemType}`);
                  writer.line('return yield(zero, err)');
                },
                '}'
              );
              writer.line('pageItems, _ := resolvePointer(raw, op.Pagination.Items).([]any)');
              writer.block(
                'for _, item := range pageItems {',
                () => {
                  writer.line(`var typed ${itemType}`);
                  writer.block(
                    'if err := reencode(item, &typed); err != nil {',
                    () => {
                      writer.line('return yield(typed, err)');
                    },
                    '}'
                  );
                  writer.block(
                    'if !yield(typed, nil) {',
                    () => {
                      writer.line('return false');
                    },
                    '}'
                  );
                },
                '}'
              );
              writer.line('return true');
            },
            '})'
          );
        },
        '}'
      );
    },
    '}'
  );
  writer.blank();
}

/** The whole generated file: models + embedded runtime + operations table + Client. */
export const goGenerator: Generator = ({ model, outputPath, emit }) => {
  const writer = new CodeWriter('\t');
  const paginationRules = new Map<string, NeutralPaginationRule>();
  for (const { op, ident } of goOperationIdents(model)) {
    const rule = paginationRuleFor(op, emit.pagination as Record<string, unknown> | undefined);
    if (rule !== undefined) paginationRules.set(ident, rule);
  }
  writer.line(
    `// Code generated by @redocly/client-generator (go) from "${model.title}" ${model.version}. DO NOT EDIT.`
  );
  writer.line(
    '// Regenerate with `redocly generate-client`. Standard library only — zero dependencies.'
  );
  writer.line('package client');
  writer.blank();
  // One merged import block: the runtime uses every entry; generated code uses a subset.
  writer.block(
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
        writer.line(JSON.stringify(spec));
      }
    },
    ')'
  );
  writer.blank();

  writer.line(stripHeader(renderGoModels(model)));
  writer.blank();
  writer.line('// ─── Embedded runtime (@redocly/client-generator go runtime) ───');
  writer.line(stripHeader(GO_RUNTIME_SOURCE));
  writer.blank();

  writer.block(
    'type operationMeta struct {',
    () => {
      writer.line('ID         string');
      writer.line('Method     string');
      writer.line('Path       string');
      writer.line('Security   [][]SecuritySpec');
      writer.line('Pagination *PaginationSpec');
    },
    '}'
  );
  writer.blank();
  writer.block(
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
        writer.line(`${JSON.stringify(id)}: {${fields.join(', ')}},`);
      }
    },
    '}'
  );
  writer.blank();

  // Per-operation query-parameter structs (pointer fields: absent = not sent).
  for (const { op, ident } of goOperationIdents(model)) {
    if (op.queryParams.length === 0) continue;
    writer.block(
      `type ${ident}Params struct {`,
      () => {
        for (const param of op.queryParams) {
          const fieldType = goType(param.schema);
          writer.line(
            `${exported(param.name)} ${fieldType.startsWith('*') ? fieldType : `*${fieldType}`}`
          );
        }
      },
      '}'
    );
    writer.blank();
  }

  writeDocComment(writer, 'Client', `Client for ${model.title} (${model.version}).`);
  writer.block(
    'type Client struct {',
    () => {
      writer.line('config Config');
    },
    '}'
  );
  writer.blank();
  writer.block(
    'func New(config Config) *Client {',
    () => {
      writer.block(
        'if config.ServerURL == "" {',
        () => {
          writer.line(`config.ServerURL = ${JSON.stringify(model.serverUrl ?? '')}`);
        },
        '}'
      );
      writer.line('return &Client{config: config}');
    },
    '}'
  );
  writer.blank();

  for (const { op, ident } of goOperationIdents(model)) {
    writeGoMethod(writer, op, ident);
    const rule = paginationRules.get(ident);
    if (rule === undefined) continue;
    const success = successSchema(op);
    const pageType = success === undefined ? 'any' : goType(success);
    // Resolve the items ARRAY, then take its raw element, so a `ref` element
    // keeps its name (a deref'd result would type as `any`).
    const itemsArray =
      success !== undefined && rule.items !== undefined
        ? schemaAtPointer(success, rule.items, model)
        : undefined;
    const element = itemsArray?.kind === 'array' ? itemsArray.items : undefined;
    writeGoPaginationWrappers(
      writer,
      op,
      ident,
      pageType,
      element === undefined ? 'any' : goType(element)
    );
  }

  return [{ path: outputPath.replace(/\.[^.\\/]+$/, '.go'), content: writer.toString() }];
};

/** One idiomatic Go call per operation — feeds `x-codeSamples` for docs. */
export function goSample(op: OperationModel, _ctx: SampleContext): CodeSample {
  const ident = exported(op.name);
  const args = [
    'ctx',
    ...op.pathParams.map(
      (param) => `"<${identifierFor(param.name, { style: 'camel', reserved: GO })}>"`
    ),
    ...(op.requestBody ? [`${goType(op.requestBody.schema)}{ /* … */ }`] : []),
    ...(op.queryParams.length > 0 ? ['nil'] : []),
  ];
  return {
    lang: 'go',
    label: 'Go SDK',
    source: `client := client.New(client.Config{})\nresult, err := client.${ident}(${args.join(', ')})\n`,
  };
}

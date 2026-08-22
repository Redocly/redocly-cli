// The built-in `php` generator — the third non-TypeScript library entry, authored
// with the language-neutral toolkit only (same dogfooding invariant as python/go,
// pinned by the guard test). Output is a single PHP >= 8.1 file over the curl
// extension: promoted-constructor classes with fromArray/toArray hydration, native
// backed enums, match-based discriminator dispatchers, and a Client over the
// embedded runtime. Exceptions are the error mode (`errorMode` does not apply).

import {
  discriminatorCases,
  enumValues,
  flattenAllOf,
  headerCoerceType,
  identifierFor,
  uniqueIdentifiers,
  isNullable,
  renderReferencePage,
  RESERVED_WORDS,
  unwrapNullable,
  type NeutralPaginationRule,
  type DateType,
  isMultipartBody,
  jsonSuccessSchema,
  sseResponse,
  deref,
  serverUrlParts,
  securityRequirements,
  paginationItemSchema,
} from '../../authoring/index.js';
import { PHP_RUNTIME_SOURCE } from '../../emitters/php-runtime-sources.js';
import type {
  ApiModel,
  OperationModel,
  PropertyModel,
  SchemaModel,
  ServerModel,
} from '../../intermediate-representation/model.js';
import { PhpPrinter } from '../../printers/php.js';
import type { CodeSample, Generator, SampleContext } from '../types.js';

const PHP = RESERVED_WORDS.php;

// Naming and escaping delegate to the printer — one implementation, one policy.
const naming = new PhpPrinter();

function className(name: string): string {
  return naming.typeName(name);
}

function propertyName(name: string): string {
  return naming.memberName(name);
}

/** `'…'` with backslashes and quotes escaped — safe for any spec-supplied text. */
function phpString(value: string): string {
  return naming.string(value);
}

/** What a named schema renders as: a class, a native enum, or nothing (alias). */
function classify(name: string, model: ApiModel): 'class' | 'enum' | 'other' {
  const named = model.schemas.find((candidate) => candidate.name === name);
  if (named === undefined) return 'other';
  const schema = named.schema;
  const asEnum = enumValues(schema);
  if (asEnum !== undefined && (asEnum.scalar === 'string' || asEnum.scalar === 'integer')) {
    return 'enum';
  }
  if (
    (schema.kind === 'object' || schema.kind === 'intersection') &&
    flattenAllOf(schema, model) !== undefined
  ) {
    return 'class';
  }
  return 'other';
}

/** The PHP type declaration for a schema (arrays and unions widen to array/mixed). */
export function phpType(
  schema: SchemaModel,
  model: ApiModel,
  dateType: DateType = 'string'
): string {
  if (isNullable(schema)) {
    const inner = phpType(unwrapNullable(schema), model, dateType);
    return phpNullable(inner);
  }
  switch (schema.kind) {
    case 'scalar':
      // Under `dateType: Date`, date and date-time become DateTimeImmutable — PHP's
      // immutable date object parses and formats both wire shapes.
      if (dateType === 'Date' && schema.scalar === 'string' && isDateFormat(schema)) {
        return '\\DateTimeImmutable';
      }
      return { string: 'string', integer: 'int', number: 'float', boolean: 'bool' }[schema.scalar];
    case 'array':
    case 'record':
      return 'array';
    case 'ref': {
      const kind = classify(schema.name, model);
      if (kind === 'class' || kind === 'enum') return className(schema.name);
      const target = deref(schema, model);
      return target === undefined ? 'mixed' : phpType(target, model, dateType);
    }
    case 'enum':
      // Anonymous (inline) enums keep the wire scalar; only NAMED enums get types.
      return { string: 'string', integer: 'int', number: 'float', boolean: 'bool' }[schema.scalar];
    case 'literal':
      return typeof schema.value === 'string'
        ? 'string'
        : typeof schema.value === 'boolean'
          ? 'bool'
          : 'float';
    case 'omit':
      // PHP has no Omit; the base class is the honest annotation.
      return className(schema.base);
    case 'union':
      return phpUnionType(schema.members, model, dateType);
    case 'null':
    case 'object':
    case 'intersection':
    case 'unknown':
      return 'mixed';
  }
}

/** True when the named schema renders as an `unmarshalX` union dispatcher. */
function isDiscriminatedUnion(name: string, model: ApiModel): boolean {
  const named = model.schemas.find((candidate) => candidate.name === name);
  return named !== undefined && discriminatorCases(named.schema, model) !== undefined;
}

/** `date` or `date-time` — the two formats `dateType: Date` turns into objects. */
function isDateFormat(schema: SchemaModel): boolean {
  const format = schema.metadata?.format;
  return format === 'date' || format === 'date-time';
}

/**
 * The nullable form of a PHP type. `?T` for a single type, `A|B|null` for a union — PHP
 * forbids mixing `?` with `|`, and `mixed` already includes null.
 */
function phpNullable(type: string): string {
  if (type === 'mixed' || type.startsWith('?') || type.endsWith('|null')) return type;
  return type.includes('|') ? `${type}|null` : `?${type}`;
}

/**
 * A union as a native PHP 8.1 union type (`int|string`, `PromotionType|array`). Rich list
 * filters are usually unions, and collapsing them to `mixed` throws away the typing that
 * makes the SDK worth generating. `mixed` cannot be a union member, so a member without a
 * PHP type of its own (inline object, intersection, unknown) forces the whole union to
 * `mixed`. Members that map to the same PHP type collapse to one.
 */
function phpUnionType(members: SchemaModel[], model: ApiModel, dateType: DateType): string {
  const rendered: string[] = [];
  for (const member of members) {
    // `null` is handled by the caller's nullability check, never as a member here.
    if (member.kind === 'null') continue;
    const type = phpType(member, model, dateType);
    if (type === 'mixed') return 'mixed';
    // A nullable member inside a union contributes its bare type plus null.
    const bare = type.startsWith('?') ? type.slice(1) : type;
    if (!rendered.includes(bare)) rendered.push(bare);
    if (type.startsWith('?') && !rendered.includes('null')) rendered.push('null');
  }
  if (rendered.length === 0) return 'mixed';
  return rendered.join('|');
}

/** Wire value → typed value expression, or undefined when the raw value is already right. */
function hydration(
  schema: SchemaModel,
  expr: string,
  model: ApiModel,
  // Required on purpose: a defaulted `'string'` let a call site forget it, and the method
  // then returned a raw string where its own signature declared `\DateTimeImmutable`.
  dateType: DateType
): string | undefined {
  const bare = unwrapNullable(schema);
  if (dateType === 'Date' && bare.kind === 'scalar' && bare.scalar === 'string') {
    if (isDateFormat(bare)) return `new \\DateTimeImmutable(${expr})`;
  }
  if (bare.kind === 'omit')
    return hydration({ kind: 'ref', name: bare.base }, expr, model, dateType);
  if (bare.kind === 'ref') {
    const kind = classify(bare.name, model);
    if (kind === 'class') return `${className(bare.name)}::fromArray(${expr})`;
    if (kind === 'enum') return `${className(bare.name)}::from(${expr})`;
    if (isDiscriminatedUnion(bare.name, model)) return `unmarshal${className(bare.name)}(${expr})`;
    const target = deref(bare, model);
    return target === undefined ? undefined : hydration(target, expr, model, dateType);
  }
  if (bare.kind === 'array') {
    const item = hydration(bare.items, '$item', model, dateType);
    if (item === undefined) return undefined;
    return `array_map(static fn ($item) => ${item}, ${expr})`;
  }
  if (bare.kind === 'record') {
    const item = hydration(bare.value, '$item', model, dateType);
    if (item === undefined) return undefined;
    return `array_map(static fn ($item) => ${item}, ${expr})`;
  }
  return undefined;
}

/** Typed value → wire value expression, or undefined when it serializes as-is. */
function serialization(
  schema: SchemaModel,
  expr: string,
  model: ApiModel,
  dateType: DateType = 'string'
): string | undefined {
  const bare = unwrapNullable(schema);
  if (dateType === 'Date' && bare.kind === 'scalar' && bare.scalar === 'string') {
    // A date-only value must not gain a time component on the way out.
    if (bare.metadata?.format === 'date') return `${expr}->format('Y-m-d')`;
    if (bare.metadata?.format === 'date-time') {
      return `${expr}->format(\\DateTimeInterface::ATOM)`;
    }
  }
  if (bare.kind === 'omit') {
    return serialization({ kind: 'ref', name: bare.base }, expr, model, dateType);
  }
  if (bare.kind === 'ref') {
    const kind = classify(bare.name, model);
    if (kind === 'class') return `${expr}->toArray()`;
    if (kind === 'enum') return `${expr}->value`;
    // A union value may be a hydrated member instance or a raw (default-case) array.
    if (isDiscriminatedUnion(bare.name, model)) {
      return `is_object(${expr}) ? ${expr}->toArray() : ${expr}`;
    }
    const target = deref(bare, model);
    return target === undefined ? undefined : serialization(target, expr, model, dateType);
  }
  if (bare.kind === 'array' || bare.kind === 'record') {
    const inner = bare.kind === 'array' ? bare.items : bare.value;
    const item = serialization(inner, '$item', model, dateType);
    if (item === undefined) return undefined;
    return `array_map(static fn ($item) => ${item}, ${expr})`;
  }
  return undefined;
}

/**
 * The element type behind a PHP type that erases it. `array` and `\Generator` are as
 * specific as PHP's syntax gets, so the docblock carries what they hold — that is what
 * static analysis and readers actually go by.
 */
function phpElementType(
  schema: SchemaModel | undefined,
  model: ApiModel,
  dateType: DateType
): string | undefined {
  if (schema === undefined) return undefined;
  const bare = unwrapNullable(schema);
  if (bare.kind === 'ref') {
    const target = deref(bare, model);
    // A named schema that IS an array (a collection alias) keeps its element type.
    return classify(bare.name, model) === 'other'
      ? phpElementType(target, model, dateType)
      : undefined;
  }
  if (bare.kind !== 'array') return undefined;
  const element = phpType(bare.items, model, dateType);
  return element === 'mixed' ? undefined : element;
}

function writeClass(
  printer: PhpPrinter,
  name: string,
  properties: PropertyModel[],
  model: ApiModel,
  dateType: DateType,
  description?: string
): void {
  // PHP requires defaulted parameters after required ones.
  const ordered = [
    ...properties.filter((property) => property.required),
    ...properties.filter((property) => !property.required),
  ];
  printer.doc(className(name), description);
  printer.line(`final class ${className(name)}`);
  printer.block(
    '{',
    () => {
      printer.block(
        'public function __construct(',
        () => {
          for (const property of ordered) {
            const type = phpType(property.schema, model, dateType);
            if (property.required) {
              printer.line(`public ${type} ${'$'}${propertyName(property.name)},`);
            } else {
              const nullable = phpNullable(type);
              printer.line(`public ${nullable} ${'$'}${propertyName(property.name)} = null,`);
            }
          }
        },
        ') {'
      );
      printer.line('}');
      printer.blank();

      printer.line('public static function fromArray(array $data): self');
      printer.block(
        '{',
        () => {
          printer.block(
            'return new self(',
            () => {
              for (const property of ordered) {
                const raw = `$data[${phpString(property.name)}]`;
                const typed = hydration(property.schema, raw, model, dateType);
                const php = propertyName(property.name);
                if (property.required) {
                  printer.line(`${php}: ${typed ?? raw},`);
                } else if (typed === undefined) {
                  printer.line(`${php}: ${raw} ?? null,`);
                } else {
                  printer.line(`${php}: isset(${raw}) ? ${typed} : null,`);
                }
              }
            },
            ');'
          );
        },
        '}'
      );
      printer.blank();

      printer.line('public function toArray(): array');
      printer.block(
        '{',
        () => {
          printer.line('$data = [];');
          for (const property of ordered) {
            const value = `$this->${propertyName(property.name)}`;
            const wire = serialization(property.schema, value, model, dateType) ?? value;
            if (property.required) {
              printer.line(`$data[${phpString(property.name)}] = ${wire};`);
            } else {
              printer.block(
                `if (${value} !== null) {`,
                () => {
                  printer.line(`$data[${phpString(property.name)}] = ${wire};`);
                },
                '}'
              );
            }
          }
          printer.line('return $data;');
        },
        '}'
      );
    },
    '}'
  );
  printer.blank();
}

/** Render every named schema: classes (allOf flattened), native enums, union dispatchers. */
export function renderPhpModels(model: ApiModel, dateType: DateType = 'string'): string {
  const printer = new PhpPrinter();
  for (const { name, schema } of model.schemas) {
    const asEnum = enumValues(schema);
    if (asEnum !== undefined && (asEnum.scalar === 'string' || asEnum.scalar === 'integer')) {
      const backing = asEnum.scalar === 'string' ? 'string' : 'int';
      printer.doc(className(name), schema.description);
      printer.line(`enum ${className(name)}: ${backing}`);
      printer.block(
        '{',
        () => {
          // `1.5` and `15` fold to one pascal name; PHP rejects a duplicate case.
          const members = uniqueIdentifiers(
            asEnum.values.map((value) => String(value)),
            { style: 'pascal', reserved: PHP }
          );
          asEnum.values.forEach((value, index) => {
            const literal = typeof value === 'string' ? phpString(value) : String(value);
            printer.line(`case ${members[index]} = ${literal};`);
          });
        },
        '}'
      );
      printer.blank();
      continue;
    }
    if (schema.kind === 'object' || schema.kind === 'intersection') {
      const flat = flattenAllOf(schema, model);
      if (flat !== undefined) {
        writeClass(
          printer,
          name,
          flat.properties,
          model,
          dateType,
          flat.description ?? schema.description
        );
        continue;
      }
    }
    const cases = discriminatorCases(schema, model);
    if (cases !== undefined) {
      const typeName = className(name);
      const table = cases.cases
        .map((entry) => `${entry.value} -> ${className(entry.schemaName)}`)
        .join(', ');
      printer.line(
        `/** ${typeName} is a discriminated union (${phpString(cases.property)}): ${table}. */`
      );
      printer.line(`function unmarshal${typeName}(array $data): mixed`);
      printer.block(
        '{',
        () => {
          printer.block(
            `return match ($data[${phpString(cases.property)}] ?? null) {`,
            () => {
              for (const entry of cases.cases) {
                printer.line(
                  `${phpString(entry.value)} => ${className(entry.schemaName)}::fromArray($data),`
                );
              }
              printer.line('default => $data,');
            },
            '};'
          );
        },
        '}'
      );
      printer.blank();
      continue;
    }
    // Everything else (plain unions, aliases, records) has no PHP declaration;
    // references resolve to the underlying type via phpType.
  }
  return printer.toString();
}

function methodName(op: OperationModel): string {
  return identifierFor(op.name, { style: 'camel', reserved: PHP });
}

/**
 * The method name for every operation, unique across the client — PHP fatals on a
 * redeclared method, and two operationIds may camel-case to one name (`get-user`,
 * `getUser`). Keyed by the IR name, which the sanitizer already made unique.
 */
function methodIdents(model: ApiModel): Map<string, string> {
  const operations = model.services.flatMap((service) => service.operations);
  const names = uniqueIdentifiers(
    operations.map((op) => op.name),
    { style: 'camel', reserved: PHP }
  );
  return new Map(operations.map((op, index) => [op.name, names[index]]));
}

const MUTATING = new Set(['post', 'put', 'patch']);

/** Security literal for the operations table, denormalized from the model's schemes. */
function phpSecurityLiteral(op: OperationModel, model: ApiModel): string | undefined {
  const alternatives = securityRequirements(op, model).map((alternative) => {
    const specs = alternative.map((spec) =>
      spec.kind === 'apiKey'
        ? `['kind' => 'apiKey', 'scheme' => ${phpString(spec.scheme)}, 'name' => ${phpString(spec.name)}, 'in' => ${phpString(spec.in)}]`
        : `['kind' => ${phpString(spec.kind)}, 'scheme' => ${phpString(spec.scheme)}]`
    );
    return `[${specs.join(', ')}]`;
  });
  if (alternatives.length === 0) return undefined;
  return `[${alternatives.join(', ')}]`;
}

function phpPaginationLiteral(rule: NeutralPaginationRule): string {
  const fields = [
    `'style' => ${phpString(rule.style)}`,
    ...(rule.param !== undefined ? [`'param' => ${phpString(rule.param)}`] : []),
    ...(rule.nextCursor !== undefined ? [`'nextCursor' => ${phpString(rule.nextCursor)}`] : []),
    ...(rule.hasMore !== undefined ? [`'hasMore' => ${phpString(rule.hasMore)}`] : []),
    ...(rule.limitParam !== undefined ? [`'limitParam' => ${phpString(rule.limitParam)}`] : []),
    ...(rule.items !== undefined ? [`'items' => ${phpString(rule.items)}`] : []),
  ];
  return `[${fields.join(', ')}]`;
}

type MethodArgs = {
  pathArgs: Array<{ php: string; wire: string; type: string }>;
  /** `value` is the expression to send: a date object formats itself, everything else is the variable. */
  queryArgs: Array<{ php: string; wire: string; type: string; value: string }>;
  signature: string[];
};

/**
 * The argument names a request method declares beside its parameters. A parameter named
 * after one of them takes a suffixed variable instead, so the slot keeps its meaning.
 */
const SIGNATURE_ARG_SLOTS = ['body', 'headers', 'idempotencyKey'];

function methodArgs(
  op: OperationModel,
  model: ApiModel,
  includeBody: boolean,
  dateType: DateType
): MethodArgs {
  // Each parameter is its own argument, so path and query names share one namespace with
  // the slots this signature declares itself (`$body`, `$headers`, `$idempotencyKey`).
  // A repeat moves aside (`$id`, `$id_2`): PHP rejects a redefined parameter outright, and
  // a description may legally use one name in two locations.
  const names = uniqueIdentifiers(
    [...op.pathParams, ...op.queryParams].map((param) => param.name),
    { style: 'camel', reserved: PHP, taken: SIGNATURE_ARG_SLOTS }
  );
  const pathArgs = op.pathParams.map((param, index) => ({
    php: names[index],
    wire: param.name,
    type: phpType(param.schema, model, dateType),
  }));
  const queryArgs = op.queryParams.map((param, index) => {
    const php = names[op.pathParams.length + index];
    return {
      php,
      wire: param.name,
      type: phpType(param.schema, model, dateType),
      value: serialization(param.schema, `${'$'}${php}`, model, dateType) ?? `${'$'}${php}`,
    };
  });
  const signature = [
    ...pathArgs.map(({ php, type }) => `${type} ${'$'}${php}`),
    ...(includeBody && op.requestBody
      ? [
          `${isMultipartBody(op) ? 'array' : phpType(op.requestBody.schema, model, dateType)} ${'$'}body`,
        ]
      : []),
    ...queryArgs.map(({ php, type }) => {
      const nullable = phpNullable(type);
      return `${nullable} ${'$'}${php} = null`;
    }),
    '?array $headers = null',
    ...(includeBody && MUTATING.has(op.method.toLowerCase())
      ? ['?string $idempotencyKey = null']
      : []),
  ];
  return { pathArgs, queryArgs, signature };
}

/** The shared prologue: resolve auth, build query/url, merge headers. */
function writeRequestSetup(printer: PhpPrinter, op: OperationModel, args: MethodArgs): void {
  printer.line(`$op = OPERATIONS[${phpString(op.specName ?? op.name)}];`);
  printer.line(
    "[$authHeaders, $query, $cookies] = resolveAuth($op['security'] ?? [], $this->config->auth);"
  );
  for (const { php, wire, value } of args.queryArgs) {
    printer.block(
      `if (${'$'}${php} !== null) {`,
      () => {
        printer.line(`$query[${phpString(wire)}] = ${value};`);
      },
      '}'
    );
  }
  const pathDict = args.pathArgs
    .map(({ php, wire }) => `${phpString(wire)} => ${'$'}${php}`)
    .join(', ');
  printer.line(`$url = buildUrl($this->config->serverUrl, $op['path'], [${pathDict}]);`);
  printer.line('$requestHeaders = array_merge($authHeaders, $headers ?? []);');
  printer.block(
    'if ($cookies !== []) {',
    () => {
      printer.line("$requestHeaders['Cookie'] = implode('; ', $cookies);");
    },
    '}'
  );
}

/** Declared response headers as runtime coerce specs: `[wire name, camelCase key, type]`. */
function envelopeHeaderSpecs(op: OperationModel, model: ApiModel): string {
  const used = new Set<string>();
  const specs = (op.successResponseHeaders ?? []).map((header) => {
    let key = identifierFor(header.name, { style: 'camel', reserved: PHP });
    let suffix = 2;
    while (used.has(key))
      key = `${identifierFor(header.name, { style: 'camel', reserved: PHP })}_${suffix++}`;
    used.add(key);
    const type = headerCoerceType(header.schema, model);
    return `[${phpString(header.name)}, ${phpString(key)}, ${phpString(type)}]`;
  });
  return `[${specs.join(', ')}]`;
}

function writePhpMethod(
  printer: PhpPrinter,
  op: OperationModel,
  ident: string,
  model: ApiModel,
  dateType: DateType,
  envelope = false
): void {
  const args = methodArgs(op, model, true, dateType);
  const sse = sseResponse(op);
  const success = jsonSuccessSchema(op);
  // Non-JSON success bodies (PDFs, images, octet streams) return the raw body string.
  const rawBody =
    sse === undefined &&
    success === undefined &&
    op.successResponses.some((response) => response.contentType !== '');
  const returnType = envelope
    ? 'Envelope'
    : sse !== undefined
      ? '\\Generator'
      : success !== undefined
        ? phpType(success, model, dateType)
        : rawBody
          ? 'string'
          : 'void';
  const name = envelope ? `${ident}WithHeaders` : ident;
  const element = envelope ? undefined : phpElementType(success, model, dateType);
  printer.doc(
    name,
    envelope
      ? `Like ${ident}(), returning an Envelope with the declared response headers.`
      : (op.summary ?? `${op.method.toUpperCase()} ${op.path}`),
    element === undefined ? [] : [`@return ${element}[]`]
  );
  printer.line(`public function ${name}(${args.signature.join(', ')}): ${returnType}`);
  printer.block(
    '{',
    () => {
      writeRequestSetup(printer, op, args);
      if (sse !== undefined) {
        const jsonData = sse.schema !== undefined && sse.schema.kind !== 'unknown';
        printer.line('$url = appendQuery($url, $query);');
        printer.block(
          '$open = function (array $extraHeaders) use ($url, $requestHeaders): \\CurlHandle {',
          () => {
            printer.line('$handle = curl_init($url);');
            printer.line('$lines = [];');
            printer.block(
              'foreach (array_merge($requestHeaders, $extraHeaders) as $name => $value) {',
              () => {
                printer.line("$lines[] = $name . ': ' . $value;");
              },
              '}'
            );
            printer.line('curl_setopt($handle, CURLOPT_HTTPHEADER, $lines);');
            printer.line('return $handle;');
          },
          '};'
        );
        printer.line(`yield from iterSse($open, ${jsonData ? 'true' : 'false'});`);
        return;
      }
      const request = [
        `'operationId' => $op['id']`,
        `'method' => $op['method']`,
        `'url' => $url`,
        `'headers' => $requestHeaders`,
        `'query' => $query`,
      ];
      if (op.requestBody && isMultipartBody(op)) {
        printer.line('[$contentType, $encoded] = toMultipart($body);');
        request.push(`'body' => $encoded`, `'contentType' => $contentType`);
      } else if (op.requestBody) {
        const wire = serialization(op.requestBody.schema, '$body', model, dateType) ?? '$body';
        printer.line(`$payload = json_encode(${wire});`);
        request.push(
          `'body' => $payload`,
          `'contentType' => ${phpString(op.requestBody.contentType)}`
        );
      }
      if (MUTATING.has(op.method.toLowerCase()) && op.requestBody) {
        request.push(`'idempotencyKey' => $idempotencyKey`);
      }
      printer.line(`$response = send($this->config, [${request.join(', ')}]);`);
      printer.block(
        "if ($response['status'] >= 400) {",
        () => {
          printer.line('throw apiErrorFrom($response);');
        },
        '}'
      );
      const decoded = rawBody
        ? "$response['body']"
        : ((success === undefined
            ? undefined
            : hydration(success, 'decodeJson($response)', model, dateType)) ??
          'decodeJson($response)');
      if (envelope) {
        printer.line(`$data = ${decoded};`);
        printer.line(
          `return new Envelope(data: $data, headers: readEnvelopeHeaders($response, ${envelopeHeaderSpecs(op, model)}), status: $response['status']);`
        );
        return;
      }
      if (rawBody) {
        printer.line("return $response['body'];");
        return;
      }
      if (returnType === 'void') {
        printer.line('decodeJson($response);');
        return;
      }
      printer.line(`return ${decoded};`);
    },
    '}'
  );
  printer.blank();
}

/** `<op>Pages()` / `<op>Items()` generators over the runtime's iterPages. */
function writePhpPaginationWrappers(
  printer: PhpPrinter,
  op: OperationModel,
  ident: string,
  model: ApiModel,
  dateType: DateType,
  pageHydration: string | undefined,
  itemHydration: string | undefined,
  itemsPointer: string | undefined,
  itemYield: string
): void {
  const args = methodArgs(op, model, false, dateType);
  const name = ident;

  const writeCall = () => {
    printer.line(`$op = OPERATIONS[${phpString(op.specName ?? op.name)}];`);
    printer.line('$base = [];');
    for (const { php, wire, value } of args.queryArgs) {
      printer.block(
        `if (${'$'}${php} !== null) {`,
        () => {
          printer.line(`$base[${phpString(wire)}] = ${value};`);
        },
        '}'
      );
    }
    const pathDict = args.pathArgs
      .map(({ php, wire }) => `${phpString(wire)} => ${'$'}${php}`)
      .join(', ');
    printer.block(
      '$call = function (array $params) use ($op, $headers): array {',
      () => {
        printer.line(
          "[$authHeaders, $authQuery, $cookies] = resolveAuth($op['security'] ?? [], $this->config->auth);"
        );
        printer.line(`$url = buildUrl($this->config->serverUrl, $op['path'], [${pathDict}]);`);
        printer.line('$requestHeaders = array_merge($authHeaders, $headers ?? []);');
        printer.block(
          'if ($cookies !== []) {',
          () => {
            printer.line("$requestHeaders['Cookie'] = implode('; ', $cookies);");
          },
          '}'
        );
        printer.line(
          "$response = send($this->config, ['operationId' => $op['id'], 'method' => $op['method'], 'url' => $url, 'headers' => $requestHeaders, 'query' => array_merge($params, $authQuery)]);"
        );
        printer.block(
          "if ($response['status'] >= 400) {",
          () => {
            printer.line('throw apiErrorFrom($response);');
          },
          '}'
        );
        printer.line('return [decodeJson($response), $response];');
      },
      '};'
    );
  };

  const pageType = phpType(jsonSuccessSchema(op) ?? { kind: 'unknown' }, model, dateType);
  const pageYield = pageType === 'mixed' ? 'mixed' : pageType;
  printer.line('/**');
  printer.line(` * ${name} response pages, following the pagination rule automatically.`);
  printer.line(' *');
  printer.line(` * @return \\Generator<int, ${pageYield}>`);
  printer.line(' */');
  printer.line(`public function ${name}Pages(${args.signature.join(', ')}): \\Generator`);
  printer.block(
    '{',
    () => {
      writeCall();
      printer.block(
        "foreach (iterPages($call, $op['pagination'], $base) as $page) {",
        () => {
          printer.line(`yield ${pageHydration ?? '$page'};`);
        },
        '}'
      );
    },
    '}'
  );
  printer.blank();

  printer.line('/**');
  printer.line(` * The items of every ${name} page.`);
  printer.line(' *');
  printer.line(` * @return \\Generator<int, ${itemYield}>`);
  printer.line(' */');
  printer.line(`public function ${name}Items(${args.signature.join(', ')}): \\Generator`);
  printer.block(
    '{',
    () => {
      writeCall();
      printer.block(
        "foreach (iterPages($call, $op['pagination'], $base) as $page) {",
        () => {
          printer.line(`$items = resolvePointer($page, ${phpString(itemsPointer ?? '')});`);
          printer.block(
            'foreach (is_array($items) ? $items : [] as $item) {',
            () => {
              printer.line(`yield ${itemHydration ?? '$item'};`);
            },
            '}'
          );
        },
        '}'
      );
    },
    '}'
  );
  printer.blank();
}

/** The server URL as a PHP expression: literals concatenated with declared-variable args. */
function serverUrlExpression(server: ServerModel): string {
  const parts = serverUrlParts(server).map((part) =>
    part.kind === 'literal' ? phpString(part.value) : `${'$'}${propertyName(part.name)}`
  );
  return parts.join(' . ');
}

/** One static method per declared server; server variables become named string arguments. */
function writeServers(printer: PhpPrinter, model: ApiModel): void {
  const servers = model.servers ?? [];
  if (servers.length === 0) return;
  const usedNames = new Set<string>();
  printer.line(
    '/** The declared servers; variables default to the values from the description. */'
  );
  printer.line('final class Servers');
  printer.block(
    '{',
    () => {
      servers.forEach((server, index) => {
        let name = identifierFor(server.description ?? `server${index + 1}`, {
          style: 'camel',
          reserved: PHP,
        });
        if (usedNames.has(name)) name = `${name}${index + 1}`;
        usedNames.add(name);
        const params = server.variables.map(
          (variable) =>
            `string ${'$'}${propertyName(variable.name)} = ${phpString(variable.default)}`
        );
        if (index > 0) printer.blank();
        printer.line(`public static function ${name}(${params.join(', ')}): string`);
        printer.block(
          '{',
          () => {
            printer.line(`return ${serverUrlExpression(server)};`);
          },
          '}'
        );
      });
    },
    '}'
  );
  printer.blank();
}

/** Drop the standalone header (<?php, declare, namespace, leading comments) for stitching. */
function stripPhpHeader(source: string): string {
  const lines = source.split('\n');
  let start = 0;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (line.startsWith('namespace ')) {
      start = index + 1;
      break;
    }
  }
  return lines.slice(start).join('\n').trim();
}

/** The whole generated file: namespace + models + embedded runtime + operations + Client. */
export const phpGenerator: Generator = ({ model, outputPath, emit, pagination }) => {
  const printer = new PhpPrinter();
  const dateType = emit.dateType ?? 'string';
  const namespace = identifierFor(model.title, { style: 'pascal', reserved: PHP });
  printer.line('<?php');
  printer.blank();
  printer.line(
    `// Code generated by @redocly/client-generator (php) from ${phpString(model.title)} ${model.version}. DO NOT EDIT.`
  );
  printer.line(
    '// Regenerate with `redocly generate-client`. PHP >= 8.1, curl extension — zero Composer dependencies.'
  );
  printer.blank();
  printer.line('declare(strict_types=1);');
  printer.blank();
  printer.line(`namespace ${namespace};`);
  printer.blank();
  printer.line(renderPhpModels(model, dateType));
  writeServers(printer, model);
  printer.line('// ─── Embedded runtime (@redocly/client-generator php runtime) ───');
  printer.line(stripPhpHeader(PHP_RUNTIME_SOURCE));
  printer.blank();

  const operations = model.services.flatMap((service) => service.operations);
  const idents = methodIdents(model);
  // Pagination arrives RESOLVED from the pipeline — one fit-verified answer per run.
  const paginationRules = new Map<string, NeutralPaginationRule>();
  for (const op of operations) {
    const spec = pagination?.get(op.name)?.spec;
    if (spec !== undefined) paginationRules.set(op.name, spec);
  }

  printer.block(
    'const OPERATIONS = [',
    () => {
      for (const op of operations) {
        const id = op.specName ?? op.name;
        const security = phpSecurityLiteral(op, model);
        const rule = paginationRules.get(op.name);
        const fields = [
          `'id' => ${phpString(id)}`,
          `'method' => ${phpString(op.method.toUpperCase())}`,
          `'path' => ${phpString(op.path)}`,
          ...(security !== undefined ? [`'security' => ${security}`] : []),
          ...(rule !== undefined ? [`'pagination' => ${phpPaginationLiteral(rule)}`] : []),
        ];
        printer.line(`${phpString(id)} => [${fields.join(', ')}],`);
      }
    },
    '];'
  );
  printer.blank();

  printer.doc('Client', `Client for ${model.title} (${model.version}).`);
  // Not final: PHP test suites mock concrete classes (createMock(Client::class)).
  printer.line('class Client');
  printer.block(
    '{',
    () => {
      printer.line('public function __construct(private Config $config)');
      printer.block(
        '{',
        () => {
          printer.block(
            "if ($this->config->serverUrl === '') {",
            () => {
              printer.line(
                `$this->config->serverUrl = ${phpString(emit.serverUrl ?? model.serverUrl ?? '')};`
              );
            },
            '}'
          );
        },
        '}'
      );
      printer.blank();

      for (const op of operations) {
        const ident = idents.get(op.name)!;
        writePhpMethod(printer, op, ident, model, dateType);
        if (sseResponse(op) === undefined && (op.successResponseHeaders?.length ?? 0) > 0) {
          writePhpMethod(printer, op, ident, model, dateType, true);
        }
        const rule = paginationRules.get(op.name);
        if (rule === undefined) continue;
        const success = jsonSuccessSchema(op);
        const pageHydration =
          success === undefined ? undefined : hydration(success, '$page', model, dateType);
        const element = paginationItemSchema(success, rule.items, model);
        const itemHydration =
          element === undefined ? undefined : hydration(element, '$item', model, dateType);
        writePhpPaginationWrappers(
          printer,
          op,
          ident,
          model,
          dateType,
          pageHydration,
          itemHydration,
          rule.items,
          element === undefined ? 'mixed' : phpType(element, model, dateType)
        );
      }
    },
    '}'
  );

  return [{ path: outputPath.replace(/\.[^.\\/]+$/, '.php'), content: printer.toString() }];
};

/** One idiomatic PHP call per operation — feeds `x-codeSamples` for docs. */
export function phpSample(op: OperationModel, ctx: SampleContext): CodeSample {
  const args = [
    ...op.pathParams.map((param) => `${phpString(`<${propertyName(param.name)}>`)}`),
    ...(op.requestBody ? ['$body'] : []),
    ...(op.queryParams.length > 0
      ? [`${propertyName(op.queryParams[0].name)}: ${phpString('<value>')}`]
      : []),
  ];
  const namespace = identifierFor(ctx.model.title, { style: 'pascal', reserved: PHP });
  // The file this run writes, so the snippet requires something that exists.
  const file = ctx.outputPath.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '.php');
  return {
    lang: 'php',
    label: 'PHP SDK',
    source: `require '${file}';\n\nuse ${namespace}\\{Client, Config};\n\n$client = new Client(new Config());\n$result = $client->${methodIdents(ctx.model).get(op.name) ?? methodName(op)}(${args.join(', ')});\n`,
  };
}

/**
 * The SDK's own reference page, written when `client.docs` is on. The call snippets come
 * from `phpSample` — this generator's own hook — so the page can only ever show the syntax
 * of the SDK beside it, and ejecting this generator takes the page with it.
 */
export const phpDocs: Generator = ({ model, outputPath, emit, pagination }) => [
  {
    path: outputPath.replace(/\.[^.\\/]+$/, '.php.md'),
    content: renderReferencePage(model, {
      title: `${model.title} PHP SDK reference`,
      frontmatter: emit.docsFrontmatter === true,
      language: {
        name: 'php',
        label: 'PHP',
        fence: 'php',
        requires: 'The SDK needs the curl extension.',
      },
      sample: (op) => phpSample(op, { model, emit, outputPath }),
      paginated: new Set(pagination?.keys() ?? []),
    }),
  },
];

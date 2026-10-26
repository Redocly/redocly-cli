// The `operations` stage: one typed request method per operation, the `<Op>Params`
// class its optional query parameters travel in, and the argument planning and request
// prologue it shares with the pagination wrappers.

import {
  type ApiModel,
  type DateType,
  isBinaryContentType,
  isMultipartBody,
  isUntypedMultipartBody,
  jsonSuccessSchema,
  type NeutralPaginationRule,
  type OperationModel,
  sseResponse,
  uniqueIdentifiers,
} from '@redocly/client-generator';
import type { JavaPrinter } from '@redocly/client-generator/printers/java';

import { envelopeHeaderSpecs, javaOperationLiteral } from './descriptor.ts';
import { hydration } from './models.ts';
import { JAVA, javaString } from './naming.ts';
import { javaType } from './types.ts';

type MethodArgs = {
  pathArgs: Array<{ java: string; wire: string }>;
  /** The optional query parameters, as fields of the `<Op>Params` class. */
  queryFields: Array<{ java: string; wire: string; type: string; isArray: boolean }>;
  paramsClass: string | undefined;
  signature: string[];
};

/**
 * The argument and local names a request method declares beside its path parameters. A
 * parameter named after one of them takes a suffixed name instead, so each keeps its meaning.
 */
// prettier-ignore
const METHOD_ARG_SLOTS = [
  'body', 'params', 'op', 'auth', 'query', 'url', 'spec', 'payload', 'response', 'data',
  'headers', 'extraHeaders', 'pageParams', 'call', 'base', 'item', 'page', 'config', 'this',
];

/** Whether the body is `Object` and the runtime sorts out what it got (`multipartBody` / `binaryBody`). */
function passesThrough(op: OperationModel): boolean {
  return (
    isUntypedMultipartBody(op) ||
    (op.requestBody !== undefined && isBinaryContentType(op.requestBody.contentType))
  );
}

/** The `<Op>Params` class name, when the operation has query parameters. */
export function paramsClassName(op: OperationModel, ident: string): string | undefined {
  if (op.queryParams.length === 0) return undefined;
  return `${ident.charAt(0).toUpperCase()}${ident.slice(1)}Params`;
}

export function methodArgs(
  op: OperationModel,
  ident: string,
  model: ApiModel,
  includeBody: boolean,
  dateType: DateType
): MethodArgs {
  // Path parameters are arguments, so their names share one namespace with the locals the
  // method declares itself; a repeat moves aside (`body`, `body2`). Query parameters live in
  // their own class, so they only need to be unique among themselves.
  const pathNames = uniqueIdentifiers(
    op.pathParams.map((param) => param.name),
    { style: 'camel', reserved: JAVA, taken: METHOD_ARG_SLOTS }
  );
  const queryNames = uniqueIdentifiers(
    op.queryParams.map((param) => param.name),
    { style: 'camel', reserved: JAVA }
  );
  const pathArgs = op.pathParams.map((param, index) => ({
    java: pathNames[index],
    wire: param.name,
  }));
  const queryFields = op.queryParams.map((param, index) => ({
    java: queryNames[index],
    wire: param.name,
    type: javaType(param.schema, model, dateType),
    isArray: param.schema.kind === 'array',
  }));
  const paramsClass = paramsClassName(op, ident);
  const signature = [
    ...op.pathParams.map(
      (param, index) => `${javaType(param.schema, model, dateType)} ${pathNames[index]}`
    ),
    ...(includeBody && op.requestBody
      ? [`${passesThrough(op) ? 'Object' : javaType(op.requestBody.schema, model, dateType)} body`]
      : []),
    ...(paramsClass === undefined ? [] : [`${paramsClass} params`]),
  ];
  return { pathArgs, queryFields, paramsClass, signature };
}

/** The `<Op>Params` class: one nullable field per query parameter, with a fluent setter each. */
export function writeParamsClass(
  printer: JavaPrinter,
  op: OperationModel,
  ident: string,
  model: ApiModel,
  dateType: DateType
): void {
  const { queryFields, paramsClass } = methodArgs(op, ident, model, false, dateType);
  if (paramsClass === undefined) return;
  printer.line(`/** The query parameters of ${ident}; an unset field is not sent. */`);
  printer.block(
    `public static final class ${paramsClass} {`,
    () => {
      for (const field of queryFields) printer.line(`public ${field.type} ${field.java};`);
      for (const field of queryFields) {
        printer.blank();
        printer.block(
          `public ${paramsClass} ${field.java}(${field.type} ${field.java}) {`,
          () => {
            printer.line(`this.${field.java} = ${field.java};`);
            printer.line('return this;');
          },
          '}'
        );
      }
    },
    '}'
  );
  printer.blank();
}

/** Add the set query parameters to `target` (a `Map<String, List<String>>`). */
export function writeQueryParams(printer: JavaPrinter, args: MethodArgs, target: string): void {
  if (args.paramsClass === undefined) return;
  printer.block(
    'if (params != null) {',
    () => {
      for (const field of args.queryFields) {
        printer.block(
          `if (params.${field.java} != null) {`,
          () => {
            // An array repeats the key per element (OpenAPI `form` + `explode`, the default).
            if (field.isArray) {
              printer.block(
                `for (Object item : params.${field.java}) {`,
                () => {
                  printer.line(`addQuery(${target}, ${javaString(field.wire)}, item);`);
                },
                '}'
              );
            } else {
              printer.line(`addQuery(${target}, ${javaString(field.wire)}, params.${field.java});`);
            }
          },
          '}'
        );
      }
    },
    '}'
  );
}

/** The `buildUrl(…)` expression for the operation's path. */
export function urlExpression(args: MethodArgs): string {
  const pairs = args.pathArgs
    .map(({ java, wire }) => `${javaString(wire)}, textValue(${java})`)
    .join(', ');
  return `buildUrl(config.serverUrl, op.path(), pathParams(${pairs}))`;
}

export function writeJavaMethod(
  printer: JavaPrinter,
  op: OperationModel,
  ident: string,
  model: ApiModel,
  dateType: DateType,
  rule: NeutralPaginationRule | undefined,
  envelope = false
): void {
  const args = methodArgs(op, ident, model, true, dateType);
  const sse = sseResponse(op);
  const success = jsonSuccessSchema(op);
  // Non-JSON success bodies (PDFs, images, octet streams) return the raw bytes.
  const rawBody =
    sse === undefined &&
    success === undefined &&
    op.successResponses.some((response) => response.contentType !== '');
  const dataType =
    success !== undefined ? javaType(success, model, dateType) : rawBody ? 'byte[]' : 'void';
  const returnType = envelope
    ? `Envelope<${dataType === 'void' ? 'Void' : dataType}>`
    : sse !== undefined
      ? 'Iterable<ServerSentEvent>'
      : dataType;
  const name = envelope ? `${ident}WithHeaders` : ident;
  printer.doc(
    name,
    envelope
      ? `Like ${ident}, returning an Envelope with the declared response headers.`
      : (op.summary ?? `${op.method.toUpperCase()} ${op.path}`)
  );
  printer.block(
    `public ${returnType} ${name}(${args.signature.join(', ')}) {`,
    () => {
      printer.line(`Operation op = ${javaOperationLiteral(op, model, rule)};`);
      printer.line('ResolvedAuth auth = resolveAuth(op.security(), config.auth);');
      printer.line('Map<String, List<String>> query = auth.query();');
      writeQueryParams(printer, args, 'query');
      printer.line(`String url = ${urlExpression(args)};`);
      if (sse !== undefined) {
        const jsonData = sse.schema !== undefined && sse.schema.kind !== 'unknown';
        printer.block(
          'return iterSse(extraHeaders -> {',
          () => {
            printer.line('Map<String, String> headers = new LinkedHashMap<>(auth.headers());');
            printer.line('headers.putAll(extraHeaders);');
            printer.line(
              'return send(config, new RequestSpec(op.id(), op.method(), url).headers(headers).query(query));'
            );
          },
          `}, ${jsonData});`
        );
        return;
      }
      printer.line(
        'RequestSpec spec = new RequestSpec(op.id(), op.method(), url).headers(auth.headers()).query(query);'
      );
      if (op.requestBody !== undefined) {
        const contentType = javaString(op.requestBody.contentType);
        const payload = isUntypedMultipartBody(op)
          ? 'multipartBody(body)'
          : passesThrough(op)
            ? `binaryBody(body, ${contentType})`
            : isMultipartBody(op)
              ? 'multipartBody(body)'
              : `jsonBody(body, ${contentType})`;
        printer.line(`Body payload = ${payload};`);
        printer.line('spec.body(payload.body(), payload.contentType());');
      }
      printer.line('HttpResponse<InputStream> response = send(config, spec);');
      printer.block(
        'if (response.statusCode() >= 400) {',
        () => {
          printer.line('throw apiErrorFrom(response, url);');
        },
        '}'
      );
      const decoded = rawBody
        ? 'readBody(response)'
        : success === undefined
          ? undefined
          : (hydration(success, 'decodeJson(response)', model, dateType) ?? 'decodeJson(response)');
      if (envelope) {
        if (decoded === undefined) {
          printer.line('readBody(response);');
          printer.line(
            `return new Envelope<>(null, readEnvelopeHeaders(response, ${envelopeHeaderSpecs(op, model)}), response.statusCode());`
          );
        } else {
          printer.line(`${dataType} data = ${decoded};`);
          printer.line(
            `return new Envelope<>(data, readEnvelopeHeaders(response, ${envelopeHeaderSpecs(op, model)}), response.statusCode());`
          );
        }
        return;
      }
      if (decoded === undefined) {
        printer.line('readBody(response);');
        return;
      }
      printer.line(`return ${decoded};`);
    },
    '}'
  );
  printer.blank();
}

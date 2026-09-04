// The `operations` stage: one typed request method per operation, plus the
// argument planning and request prologue it shares with the pagination wrappers.

import {
  type ApiModel,
  type DateType,
  isMultipartBody,
  jsonSuccessSchema,
  type OperationModel,
  sseResponse,
  uniqueIdentifiers,
} from '@redocly/client-generator';
import type { PhpPrinter } from '@redocly/client-generator/printers/php';

import { envelopeHeaderSpecs } from './descriptor.ts';
import { hydration, serialization } from './models.ts';
import { PHP, phpString } from './naming.ts';
import { phpElementType, phpNullable, phpType } from './types.ts';

const MUTATING = new Set(['post', 'put', 'patch']);

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

export function methodArgs(
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

export function writePhpMethod(
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

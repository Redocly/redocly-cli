// The `operations` stage: one typed request method per operation, plus the
// argument and envelope-header planning it shares with the pagination wrappers.

import {
  headerCoerceType,
  isMultipartBody,
  jsonSuccessSchema,
  sseResponse,
  uniqueIdentifiers,
  type DateType,
} from '../../authoring/index.js';
import type {
  ApiModel,
  OperationModel,
  ParamModel,
} from '../../intermediate-representation/model.js';
import { exported, type GoPrinter } from '../../printers/go.js';
import { GO, naming } from './naming.js';
import { goType } from './types.js';

/** A query-value expression formatted to string for url.Values. */
export function goQueryFormat(expr: string, type: string): string {
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
 * The argument names a method declares beside its path parameters: the receiver, the
 * context, the request body, and the query struct.
 */
const METHOD_ARG_SLOTS = ['c', 'ctx', 'body', 'params', 'out', 'op'];

/**
 * Path parameters as Go arguments, uniquely named. A parameter named after one of the
 * method's own arguments (or a name a description reuses across locations) moves aside as
 * `id2` — Go rejects a duplicate parameter, and the wire name is untouched either way.
 */
export function pathArguments(
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

export function writeGoMethod(
  printer: GoPrinter,
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
  printer.doc(
    funcName,
    envelope ? `Like ${ident}, also returning the declared response headers.` : op.summary
  );
  printer.block(
    `func (c *Client) ${funcName}(${args.join(', ')}) ${returns} {`,
    () => {
      if (sse === undefined && returnType !== undefined) printer.line(`var out ${returnType}`);
      if (envelope) printer.line(`var headers ${ident}Headers`);
      printer.line(`op := operations[${naming.string(op.specName ?? op.name)}]`);
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
                          `query.Add(${naming.string(param.name)}, ${goQueryFormat('item', elementType)})`
                        );
                      },
                      '}'
                    );
                  } else {
                    printer.line(
                      `query.Set(${naming.string(param.name)}, ${goQueryFormat(`*params.${field}`, goType(param.schema, dateType))})`
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
        .map(({ param, go, type }) => `${naming.string(param.name)}: ${goQueryFormat(go, type)}`)
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
        specFields.push(`ContentType: ${naming.string(op.requestBody.contentType)}`);
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
            `headers.${planned.field} = ${planned.helper}(resp.Header, ${naming.string(planned.name)})`
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

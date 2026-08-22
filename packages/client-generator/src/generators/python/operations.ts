// The `operations` stage: one typed request method per operation (sync and async),
// with the optional `_with_headers` envelope variant.

import {
  type ApiModel,
  type DateType,
  isMultipartBody,
  jsonSuccessSchema,
  type OperationModel,
  sseResponse,
  uniqueIdentifiers,
} from '@redocly/client-generator';
import type { PythonPrinter } from '@redocly/client-generator/printers/python';

import { envelopeHeaderSpecs } from './descriptor.ts';
import { METHOD_ARG_SLOTS, naming, PY } from './naming.ts';
import { pythonType } from './types.ts';

export function writeMethod(
  printer: PythonPrinter,
  op: OperationModel,
  ident: string,
  errorMode: 'throw' | 'result',
  isAsync: boolean,
  dateType: DateType,
  model?: ApiModel,
  envelope = false
): void {
  // Every parameter is a separate argument, so path and query names share one namespace
  // with the slots this method declares itself. `uniqueIdentifiers` moves a repeat aside
  // (`id`, `id_2`) — a description may legally use one name in two locations, and a
  // signature that declared it twice would not even parse.
  const argNames = uniqueIdentifiers(
    [...op.pathParams, ...op.queryParams].map((param) => param.name),
    { style: 'snake', reserved: PY, taken: METHOD_ARG_SLOTS }
  );
  const pathArgs = op.pathParams.map((param, index) => ({ param, python: argNames[index] }));
  const queryArgs = op.queryParams.map((param, index) => ({
    param,
    python: argNames[op.pathParams.length + index],
  }));
  const positional = pathArgs.map(
    ({ param, python }) => `${python}: ${pythonType(param.schema, dateType)}`
  );
  const bodyArg = op.requestBody ? [`body: ${pythonType(op.requestBody.schema, dateType)}`] : [];
  const kwargs = [
    ...queryArgs.map(({ param, python }) => {
      const annotation = pythonType(param.schema, dateType);
      const optional = annotation.startsWith('Optional[') ? annotation : `Optional[${annotation}]`;
      return `${python}: ${optional} = None`;
    }),
    'headers: Optional[Dict[str, str]] = None',
    'timeout: Optional[float] = None',
    'retry: Optional[Dict[str, Any]] = None',
    'idempotency_key: Any = None',
  ];
  const success = jsonSuccessSchema(op);
  const sse = sseResponse(op);
  const returns = envelope
    ? `Envelope[${success === undefined ? 'None' : pythonType(success, dateType)}]`
    : sse !== undefined
      ? `${isAsync ? 'AsyncIterator' : 'Iterator'}[ServerSentEvent]`
      : errorMode === 'result'
        ? 'Result'
        : success === undefined
          ? 'None'
          : pythonType(success, dateType);
  // Streaming methods are plain defs returning an (async) iterator — an `async def`
  // would force awaiting the call before iterating it.
  const prefix = isAsync && sse === undefined ? 'async def' : 'def';
  const awaitKw = isAsync ? 'await ' : '';
  const sendFn = isAsync ? 'send_async' : 'send';
  const signature = ['self', ...positional, ...bodyArg, '*', ...kwargs].join(', ');
  const defName = envelope ? `${ident}_with_headers` : ident;
  printer.block(`${prefix} ${defName}(${signature}) -> ${returns}:`, () => {
    printer.doc(
      envelope
        ? `Like ${ident}(), returning an Envelope with the declared response headers.`
        : op.summary
    );
    printer.line(`op = _OPERATIONS["${ident}"]`);
    printer.line('auth_headers, auth_query = resolve_auth(op.get("security") or [], self._auth)');
    printer.line('params: Dict[str, Any] = dict(auth_query)');
    for (const { param, python } of queryArgs) {
      printer.block(`if ${python} is not None:`, () => {
        printer.line(`params[${naming.string(param.name)}] = encode(${python})`);
      });
    }
    const pathDict = pathArgs
      .map(({ param, python }) => `${naming.string(param.name)}: ${python}`)
      .join(', ');
    printer.line(`url = build_url(self._server_url, op["path"], {${pathDict}})`);
    if (sse !== undefined) {
      const dataKind = sse.schema !== undefined && sse.schema.kind !== 'unknown' ? 'json' : 'text';
      printer.block('def _open(extra_headers: Dict[str, str]):', () => {
        printer.line(
          'return self._http.stream(op["method"], url, ' +
            'headers={**auth_headers, **(headers or {}), **extra_headers}, params=params, timeout=timeout)'
        );
      });
      printer.line(`return ${isAsync ? 'aiter_sse' : 'iter_sse'}(_open, data_kind="${dataKind}")`);
      return;
    }
    if (isMultipartBody(op)) printer.line('form_data, form_files = to_multipart(body)');
    const bodyKw = op.requestBody
      ? isMultipartBody(op)
        ? ', data=form_data, files=form_files'
        : ', json_body=encode(body)'
      : '';
    printer.line(
      `response = ${awaitKw}${sendFn}(self._http, self._config, op, url, method=op["method"], ` +
        `headers={**auth_headers, **(headers or {})}, params=params${bodyKw}, ` +
        'timeout=timeout, retry=retry, idempotency_key=idempotency_key)'
    );
    const decoded =
      success === undefined
        ? 'None'
        : `decode(${pythonType(success, dateType)}, _safe_json(response))`;
    if (envelope) {
      printer.block('if not response.is_success:', () => {
        printer.line(
          'raise ApiError(url, response.status_code, response.reason_phrase, _safe_json(response))'
        );
      });
      printer.line(
        `return Envelope(data=${decoded}, headers=read_envelope_headers(response, ${envelopeHeaderSpecs(op, model!)}), response=response)`
      );
    } else if (errorMode === 'result') {
      printer.block('if not response.is_success:', () => {
        printer.line('return Result(data=None, error=_safe_json(response), response=response)');
      });
      printer.line(`return Result(data=${decoded}, error=None, response=response)`);
    } else {
      printer.block('if not response.is_success:', () => {
        printer.line(
          'raise ApiError(url, response.status_code, response.reason_phrase, _safe_json(response))'
        );
      });
      printer.line(success === undefined ? 'return None' : `return ${decoded}`);
    }
  });
  printer.blank();
}

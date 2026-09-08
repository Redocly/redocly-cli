// The `pagination` stage: `<ident>_pages` / `<ident>_items` iterator methods for
// paginated operations, sync and async.

import {
  type DateType,
  jsonSuccessSchema,
  type OperationModel,
  uniqueIdentifiers,
} from '@redocly/client-generator';
import type { PythonPrinter } from '@redocly/client-generator/printers/python';

import { METHOD_ARG_SLOTS, naming, PY } from './naming.ts';
import { pythonType } from './types.ts';

/** `<ident>_pages` / `<ident>_items` iterator methods for a paginated operation. */
export function writePaginationWrappers(
  printer: PythonPrinter,
  op: OperationModel,
  ident: string,
  isAsync: boolean,
  itemType: string,
  dateType: DateType
): void {
  const success = jsonSuccessSchema(op);
  const pageType = success === undefined ? 'Any' : pythonType(success, dateType);
  // The iterators take the same arguments as the operation itself, computed the same way,
  // so a name the method moved aside (`id_2`) is the same name here — copying a call from
  // one to the other has to keep working. Path values are substituted, not dropped.
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
  const kwargs = [
    ...queryArgs.map(({ param, python }) => {
      const annotation = pythonType(param.schema, dateType);
      const optional = annotation.startsWith('Optional[') ? annotation : `Optional[${annotation}]`;
      return `${python}: ${optional} = None`;
    }),
    'headers: Optional[Dict[str, str]] = None',
    'timeout: Optional[float] = None',
    'retry: Optional[Dict[str, Any]] = None',
  ];
  const signature = ['self', ...positional, '*', ...kwargs].join(', ');
  const iterType = isAsync ? 'AsyncIterator' : 'Iterator';
  const pagesFn = isAsync ? 'aiter_pages' : 'iter_pages';
  const itemsFn = isAsync ? 'aiter_items' : 'iter_items';

  const writeCallClosure = () => {
    printer.line('base: Dict[str, Any] = {}');
    for (const { param, python } of queryArgs) {
      printer.block(`if ${python} is not None:`, () => {
        printer.line(`base[${naming.string(param.name)}] = encode(${python})`);
      });
    }
    const prefix = isAsync ? 'async def' : 'def';
    const awaitKw = isAsync ? 'await ' : '';
    printer.block(`${prefix} _page(page_params: Dict[str, Any]) -> Tuple[Any, Any]:`, () => {
      printer.line('auth_headers, auth_query = resolve_auth(op.get("security") or [], self._auth)');
      const pathDict = pathArgs
        .map(({ param, python }) => `${naming.string(param.name)}: ${python}`)
        .join(', ');
      printer.line(`url = build_url(self._server_url, op["path"], {${pathDict}})`);
      printer.line(
        `response = ${awaitKw}${isAsync ? 'send_async' : 'send'}(self._http, self._config, op, url, method=op["method"], ` +
          'headers={**auth_headers, **(headers or {})}, params={**page_params, **auth_query}, ' +
          'timeout=timeout, retry=retry)'
      );
      printer.block('if not response.is_success:', () => {
        printer.line(
          'raise ApiError(url, response.status_code, response.reason_phrase, _safe_json(response))'
        );
      });
      printer.line('return _safe_json(response), response');
    });
  };

  // pages: raw page JSON decoded into the page model per page.
  if (isAsync) {
    printer.block(`async def ${ident}_pages(${signature}) -> ${iterType}[${pageType}]:`, () => {
      printer.line(`op = _OPERATIONS["${ident}"]`);
      writeCallClosure();
      printer.block(`async for page in ${pagesFn}(_page, op["pagination"], base):`, () => {
        printer.line(pageType === 'Any' ? 'yield page' : `yield decode(${pageType}, page)`);
      });
    });
    printer.blank();
    printer.block(`async def ${ident}_items(${signature}) -> ${iterType}[${itemType}]:`, () => {
      printer.line(`op = _OPERATIONS["${ident}"]`);
      writeCallClosure();
      printer.block(`async for item in ${itemsFn}(_page, op["pagination"], base):`, () => {
        printer.line(itemType === 'Any' ? 'yield item' : `yield decode(${itemType}, item)`);
      });
    });
  } else {
    printer.block(`def ${ident}_pages(${signature}) -> ${iterType}[${pageType}]:`, () => {
      printer.line(`op = _OPERATIONS["${ident}"]`);
      writeCallClosure();
      printer.line(
        pageType === 'Any'
          ? `return ${pagesFn}(_page, op["pagination"], base)`
          : `return (decode(${pageType}, page) for page in ${pagesFn}(_page, op["pagination"], base))`
      );
    });
    printer.blank();
    printer.block(`def ${ident}_items(${signature}) -> ${iterType}[${itemType}]:`, () => {
      printer.line(`op = _OPERATIONS["${ident}"]`);
      writeCallClosure();
      printer.line(
        itemType === 'Any'
          ? `return ${itemsFn}(_page, op["pagination"], base)`
          : `return (decode(${itemType}, item) for item in ${itemsFn}(_page, op["pagination"], base))`
      );
    });
  }
  printer.blank();
}

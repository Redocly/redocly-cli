// The built-in `python` generator — the first non-TypeScript library entry,
// authored the way the AGENTS.md skill teaches users' agents to author theirs:
// with the language-neutral toolkit only (Printer + schema/naming helpers).
// A guard test pins that this module never imports the TS emitter toolkit.

import {
  Printer,
  paginationRuleFor,
  schemaAtPointer,
  discriminatorCases,
  docText,
  enumValues,
  flattenAllOf,
  identifierFor,
  isNullable,
  RESERVED_WORDS,
  unwrapNullable,
} from '../authoring/index.js';
import { PYTHON_RUNTIME_SOURCES } from '../emitters/python-runtime-sources.js';
import type {
  ApiModel,
  OperationModel,
  PropertyModel,
  SchemaModel,
} from '../intermediate-representation/model.js';
import type { CodeSample, Generator, SampleContext } from './types.js';

const PY = RESERVED_WORDS.python;

/** A named schema's Python class name. */
function className(name: string): string {
  return identifierFor(name, { style: 'pascal', reserved: PY });
}

/** A field/parameter name, with the wire name preserved when sanitization renames it. */
function fieldName(name: string): { python: string; renamed: boolean } {
  const python = identifierFor(name, { style: 'snake', reserved: PY });
  return { python, renamed: python !== name };
}

/** The Python type annotation for a schema (anonymous complex shapes collapse to Any-ish). */
export function pythonType(schema: SchemaModel): string {
  if (isNullable(schema)) {
    return `Optional[${pythonType(unwrapNullable(schema))}]`;
  }
  switch (schema.kind) {
    case 'scalar':
      return { string: 'str', integer: 'int', number: 'float', boolean: 'bool' }[schema.scalar];
    case 'array':
      return `List[${pythonType(schema.items)}]`;
    case 'record':
      return `Dict[str, ${pythonType(schema.value)}]`;
    case 'ref':
      return className(schema.name);
    case 'literal':
      return `Literal[${JSON.stringify(schema.value)}]`;
    case 'enum':
      // Anonymous (inline) enums keep the wire scalar; only NAMED enums get classes.
      return { string: 'str', integer: 'int', number: 'float', boolean: 'bool' }[schema.scalar];
    case 'union':
      return `Union[${schema.members.map(pythonType).join(', ')}]`;
    case 'null':
      return 'None';
    case 'omit':
      // Python has no Omit; the base class is the honest annotation (readOnly
      // fields are server-managed and simply absent on requests).
      return className(schema.base);
    case 'object':
    case 'intersection':
    case 'unknown':
      return 'Any';
  }
}

function writeDocstring(writer: Printer, description?: string): void {
  const lines = docText(description);
  if (lines.length === 0) return;
  if (lines.length === 1) {
    writer.line(`"""${lines[0]}"""`);
    return;
  }
  writer.line(`"""${lines[0]}`);
  for (const line of lines.slice(1)) writer.line(line);
  writer.line('"""');
}

function writeDataclass(
  writer: Printer,
  name: string,
  properties: PropertyModel[],
  description?: string
): void {
  writer.line('@dataclass');
  writer.block(`class ${className(name)}:`, () => {
    writeDocstring(writer, description);
    // Required fields first — a dataclass field without a default may not follow one with.
    const ordered = [
      ...properties.filter((property) => property.required),
      ...properties.filter((property) => !property.required),
    ];
    const fieldMap: Array<[string, string]> = [];
    if (ordered.length === 0) writer.line('pass');
    for (const property of ordered) {
      const { python, renamed } = fieldName(property.name);
      if (renamed) fieldMap.push([python, property.name]);
      const baseType = pythonType(property.schema);
      if (property.required) {
        writer.line(`${python}: ${baseType}`);
      } else {
        const optional = baseType.startsWith('Optional[') ? baseType : `Optional[${baseType}]`;
        writer.line(`${python}: ${optional} = None`);
      }
    }
    if (fieldMap.length > 0) {
      writer.blank();
      writer.line('# Python field name -> wire (JSON) name, for (de)serialization.');
      const entries = fieldMap.map(([py, wire]) => `"${py}": ${JSON.stringify(wire)}`).join(', ');
      writer.line(`_field_map: ClassVar[Dict[str, str]] = {${entries}}`);
    }
  });
  writer.blank();
  writer.blank();
}

/** Render every named schema: Enum classes, dataclasses (allOf flattened), union aliases. */
export function renderPythonModels(model: ApiModel): string {
  const writer = new Printer('    ');
  writer.line('from __future__ import annotations');
  writer.blank();
  writer.line('from dataclasses import dataclass');
  writer.line('from enum import Enum');
  writer.line(
    'from typing import Any, AsyncIterator, ClassVar, Dict, Iterator, List, Literal, Optional, Tuple, Union'
  );
  writer.blank();
  writer.blank();

  const aliases: Array<() => void> = [];
  for (const { name, schema } of model.schemas) {
    const asEnum = enumValues(schema);
    if (asEnum !== undefined) {
      const base = asEnum.scalar === 'string' ? 'str, Enum' : 'int, Enum';
      writer.block(`class ${className(name)}(${base}):`, () => {
        writeDocstring(writer, schema.description);
        asEnum.values.forEach((value, index) => {
          writer.line(`${asEnum.memberNames[index]} = ${JSON.stringify(value)}`);
        });
      });
      writer.blank();
      writer.blank();
      continue;
    }
    if (schema.kind === 'object' || schema.kind === 'intersection') {
      const flat = flattenAllOf(schema, model);
      if (flat !== undefined) {
        writeDataclass(writer, name, flat.properties, flat.description ?? schema.description);
        continue;
      }
    }
    // Everything else (unions, scalar aliases, records) becomes a module-level alias,
    // emitted AFTER the classes it references so the assignment evaluates.
    aliases.push(() => {
      const cases = discriminatorCases(schema, model);
      if (cases !== undefined) {
        const table = cases.cases
          .map((entry) => `${entry.value} -> ${className(entry.schemaName)}`)
          .join(', ');
        writer.line(`# Discriminated by "${cases.property}": ${table}`);
      }
      writer.line(`${className(name)} = ${pythonType(schema)}`);
      writer.blank();
    });
  }
  for (const emit of aliases) emit();
  return writer.toString();
}

/** The operation's primary JSON success schema, or undefined for void/no-body ops. */
function successSchema(op: OperationModel): SchemaModel | undefined {
  return op.successResponses.find((r) => r.contentType.toLowerCase().includes('json'))?.schema;
}

/** Security specs for the descriptor dict — the wire shape resolve_auth consumes. */
function securitySpecs(op: OperationModel, model: ApiModel): unknown[][] {
  return op.security
    .map((alternative) =>
      alternative.flatMap((key): Array<Record<string, string>> => {
        const scheme = model.securitySchemes.find((s) => s.key === key);
        if (scheme === undefined) return [];
        if (scheme.kind === 'bearer' || scheme.kind === 'basic') {
          return [{ scheme: key, kind: scheme.kind }];
        }
        if (scheme.kind === 'apiKeyHeader') {
          return [{ scheme: key, kind: 'apiKey', name: scheme.headerName, in: 'header' }];
        }
        if (scheme.kind === 'apiKeyQuery') {
          return [{ scheme: key, kind: 'apiKey', name: scheme.paramName, in: 'query' }];
        }
        return [{ scheme: key, kind: 'apiKey', name: scheme.cookieName, in: 'cookie' }];
      })
    )
    .filter((alternative) => alternative.length > 0);
}

/** JSON → Python literal (dicts/lists/strings/numbers/bools/None). */
function pythonLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'None';
  if (value === true) return 'True';
  if (value === false) return 'False';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(pythonLiteral).join(', ')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .map(([key, entry]) => `${JSON.stringify(key)}: ${pythonLiteral(entry)}`)
    .join(', ');
  return `{${entries}}`;
}

/** Every operation with its collision-free snake_case Python method name. */
function operationIdents(model: ApiModel): Array<{ op: OperationModel; ident: string }> {
  const used = new Set<string>();
  const out: Array<{ op: OperationModel; ident: string }> = [];
  for (const service of model.services) {
    for (const op of service.operations) {
      let ident = identifierFor(op.name, { style: 'snake', reserved: PY });
      let suffix = 2;
      while (used.has(ident))
        ident = `${identifierFor(op.name, { style: 'snake', reserved: PY })}_${suffix++}`;
      used.add(ident);
      out.push({ op, ident });
    }
  }
  return out;
}

/** The op's SSE success response, when it streams text/event-stream. */
function sseResponse(op: OperationModel) {
  return op.successResponses.find((r) => r.contentType.toLowerCase().includes('text/event-stream'));
}

function isMultipart(op: OperationModel): boolean {
  return op.requestBody?.contentType.toLowerCase().includes('multipart') ?? false;
}

/** The neutral pagination rule mapped to the snake_case spec dict the embedded
 * Python runtime consumes. */
function paginationSpec(
  op: OperationModel,
  emit: { pagination?: Record<string, unknown> }
): Record<string, unknown> | undefined {
  const rule = paginationRuleFor(op, emit.pagination);
  if (rule === undefined) return undefined;
  return {
    style: rule.style,
    ...(rule.param !== undefined ? { param: rule.param } : {}),
    ...(rule.nextCursor !== undefined ? { next_cursor: rule.nextCursor } : {}),
    ...(rule.hasMore !== undefined ? { has_more: rule.hasMore } : {}),
    ...(rule.limitParam !== undefined ? { limit_param: rule.limitParam } : {}),
    ...(rule.items !== undefined ? { items: rule.items } : {}),
  };
}

function writeMethod(
  writer: Printer,
  op: OperationModel,
  ident: string,
  errorMode: 'throw' | 'result',
  isAsync: boolean
): void {
  const pathArgs = op.pathParams.map((param) => ({
    param,
    python: identifierFor(param.name, { style: 'snake', reserved: PY }),
  }));
  const queryArgs = op.queryParams.map((param) => ({
    param,
    python: identifierFor(param.name, { style: 'snake', reserved: PY }),
  }));
  const positional = pathArgs.map(({ param, python }) => `${python}: ${pythonType(param.schema)}`);
  const bodyArg = op.requestBody ? [`body: ${pythonType(op.requestBody.schema)}`] : [];
  const kwargs = [
    ...queryArgs.map(({ param, python }) => {
      const annotation = pythonType(param.schema);
      const optional = annotation.startsWith('Optional[') ? annotation : `Optional[${annotation}]`;
      return `${python}: ${optional} = None`;
    }),
    'headers: Optional[Dict[str, str]] = None',
    'timeout: Optional[float] = None',
    'retry: Optional[Dict[str, Any]] = None',
    'idempotency_key: Any = None',
  ];
  const success = successSchema(op);
  const sse = sseResponse(op);
  const returns =
    sse !== undefined
      ? `${isAsync ? 'AsyncIterator' : 'Iterator'}[ServerSentEvent]`
      : errorMode === 'result'
        ? 'Result'
        : success === undefined
          ? 'None'
          : pythonType(success);
  // Streaming methods are plain defs returning an (async) iterator — an `async def`
  // would force awaiting the call before iterating it.
  const prefix = isAsync && sse === undefined ? 'async def' : 'def';
  const awaitKw = isAsync ? 'await ' : '';
  const sendFn = isAsync ? 'send_async' : 'send';
  const signature = ['self', ...positional, ...bodyArg, '*', ...kwargs].join(', ');
  writer.block(`${prefix} ${ident}(${signature}) -> ${returns}:`, () => {
    writeDocstring(writer, op.summary);
    writer.line(`op = _OPERATIONS["${ident}"]`);
    writer.line('auth_headers, auth_query = resolve_auth(op.get("security") or [], self._auth)');
    writer.line('params: Dict[str, Any] = dict(auth_query)');
    for (const { param, python } of queryArgs) {
      writer.block(`if ${python} is not None:`, () => {
        writer.line(`params[${JSON.stringify(param.name)}] = encode(${python})`);
      });
    }
    const pathDict = pathArgs
      .map(({ param, python }) => `${JSON.stringify(param.name)}: ${python}`)
      .join(', ');
    writer.line(`url = build_url(self._server_url, op["path"], {${pathDict}})`);
    if (sse !== undefined) {
      const dataKind = sse.schema !== undefined && sse.schema.kind !== 'unknown' ? 'json' : 'text';
      writer.block('def _open(extra_headers: Dict[str, str]):', () => {
        writer.line(
          'return self._http.stream(op["method"], url, ' +
            'headers={**auth_headers, **(headers or {}), **extra_headers}, params=params, timeout=timeout)'
        );
      });
      writer.line(`return ${isAsync ? 'aiter_sse' : 'iter_sse'}(_open, data_kind="${dataKind}")`);
      return;
    }
    if (isMultipart(op)) writer.line('form_data, form_files = to_multipart(body)');
    const bodyKw = op.requestBody
      ? isMultipart(op)
        ? ', data=form_data, files=form_files'
        : ', json_body=encode(body)'
      : '';
    writer.line(
      `response = ${awaitKw}${sendFn}(self._http, self._config, op, url, method=op["method"], ` +
        `headers={**auth_headers, **(headers or {})}, params=params${bodyKw}, ` +
        'timeout=timeout, retry=retry, idempotency_key=idempotency_key)'
    );
    const decoded =
      success === undefined ? 'None' : `decode(${pythonType(success)}, _safe_json(response))`;
    if (errorMode === 'result') {
      writer.block('if not response.is_success:', () => {
        writer.line('return Result(data=None, error=_safe_json(response), response=response)');
      });
      writer.line(`return Result(data=${decoded}, error=None, response=response)`);
    } else {
      writer.block('if not response.is_success:', () => {
        writer.line(
          'raise ApiError(url, response.status_code, response.reason_phrase, _safe_json(response))'
        );
      });
      writer.line(success === undefined ? 'return None' : `return ${decoded}`);
    }
  });
  writer.blank();
}

/** `<ident>_pages` / `<ident>_items` iterator methods for a paginated operation. */
function writePaginationWrappers(
  writer: Printer,
  op: OperationModel,
  ident: string,
  isAsync: boolean,
  itemType: string
): void {
  const success = successSchema(op);
  const pageType = success === undefined ? 'Any' : pythonType(success);
  const queryArgs = op.queryParams.map((param) => ({
    param,
    python: identifierFor(param.name, { style: 'snake', reserved: PY }),
  }));
  const kwargs = [
    ...queryArgs.map(({ param, python }) => {
      const annotation = pythonType(param.schema);
      const optional = annotation.startsWith('Optional[') ? annotation : `Optional[${annotation}]`;
      return `${python}: ${optional} = None`;
    }),
    'headers: Optional[Dict[str, str]] = None',
    'timeout: Optional[float] = None',
    'retry: Optional[Dict[str, Any]] = None',
  ];
  const signature = ['self', '*', ...kwargs].join(', ');
  const iterType = isAsync ? 'AsyncIterator' : 'Iterator';
  const pagesFn = isAsync ? 'aiter_pages' : 'iter_pages';
  const itemsFn = isAsync ? 'aiter_items' : 'iter_items';

  const writeCallClosure = () => {
    writer.line('base: Dict[str, Any] = {}');
    for (const { param, python } of queryArgs) {
      writer.block(`if ${python} is not None:`, () => {
        writer.line(`base[${JSON.stringify(param.name)}] = encode(${python})`);
      });
    }
    const prefix = isAsync ? 'async def' : 'def';
    const awaitKw = isAsync ? 'await ' : '';
    writer.block(`${prefix} _page(page_params: Dict[str, Any]) -> Tuple[Any, Any]:`, () => {
      writer.line('auth_headers, auth_query = resolve_auth(op.get("security") or [], self._auth)');
      writer.line('url = build_url(self._server_url, op["path"], {})');
      writer.line(
        `response = ${awaitKw}${isAsync ? 'send_async' : 'send'}(self._http, self._config, op, url, method=op["method"], ` +
          'headers={**auth_headers, **(headers or {})}, params={**page_params, **auth_query}, ' +
          'timeout=timeout, retry=retry)'
      );
      writer.block('if not response.is_success:', () => {
        writer.line(
          'raise ApiError(url, response.status_code, response.reason_phrase, _safe_json(response))'
        );
      });
      writer.line('return _safe_json(response), response');
    });
  };

  // pages: raw page JSON decoded into the page model per page.
  if (isAsync) {
    writer.block(`async def ${ident}_pages(${signature}) -> ${iterType}[${pageType}]:`, () => {
      writer.line(`op = _OPERATIONS["${ident}"]`);
      writeCallClosure();
      writer.block(`async for page in ${pagesFn}(_page, op["pagination"], base):`, () => {
        writer.line(pageType === 'Any' ? 'yield page' : `yield decode(${pageType}, page)`);
      });
    });
    writer.blank();
    writer.block(`async def ${ident}_items(${signature}) -> ${iterType}[${itemType}]:`, () => {
      writer.line(`op = _OPERATIONS["${ident}"]`);
      writeCallClosure();
      writer.block(`async for item in ${itemsFn}(_page, op["pagination"], base):`, () => {
        writer.line(itemType === 'Any' ? 'yield item' : `yield decode(${itemType}, item)`);
      });
    });
  } else {
    writer.block(`def ${ident}_pages(${signature}) -> ${iterType}[${pageType}]:`, () => {
      writer.line(`op = _OPERATIONS["${ident}"]`);
      writeCallClosure();
      writer.line(
        pageType === 'Any'
          ? `return ${pagesFn}(_page, op["pagination"], base)`
          : `return (decode(${pageType}, page) for page in ${pagesFn}(_page, op["pagination"], base))`
      );
    });
    writer.blank();
    writer.block(`def ${ident}_items(${signature}) -> ${iterType}[${itemType}]:`, () => {
      writer.line(`op = _OPERATIONS["${ident}"]`);
      writeCallClosure();
      writer.line(
        itemType === 'Any'
          ? `return ${itemsFn}(_page, op["pagination"], base)`
          : `return (decode(${itemType}, item) for item in ${itemsFn}(_page, op["pagination"], base))`
      );
    });
  }
  writer.blank();
}

function writeClientClass(
  writer: Printer,
  model: ApiModel,
  errorMode: 'throw' | 'result',
  isAsync: boolean,
  paginationSpecs: Map<string, Record<string, unknown> | undefined>
): void {
  const name = isAsync ? 'AsyncClient' : 'Client';
  const httpType = isAsync ? 'httpx.AsyncClient' : 'httpx.Client';
  writer.block(`class ${name}:`, () => {
    writeDocstring(
      writer,
      `${isAsync ? 'Async ' : ''}client for ${model.title} (${model.version}).`
    );
    writer.block(
      `def __init__(self, server_url: str = ${JSON.stringify(model.serverUrl ?? '')}, *, ` +
        'auth: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None, ' +
        'timeout: Optional[float] = None, retry: Optional[Dict[str, Any]] = None, ' +
        'middleware: Optional[List[Any]] = None, idempotency_key: Any = None, ' +
        `http_client: Optional[${httpType}] = None) -> None:`,
      () => {
        writer.line('self._server_url = server_url');
        writer.line('self._auth = auth or {}');
        writer.line('self._config: Dict[str, Any] = {');
        writer.indent(() => {
          writer.line('"headers": headers or {},');
          writer.line('"timeout": timeout,');
          writer.line('"retry": retry or {},');
          writer.line('"middleware": middleware or [],');
          writer.line('"idempotency_key": idempotency_key,');
        });
        writer.line('}');
        writer.line(`self._http = http_client or ${httpType}()`);
      }
    );
    writer.blank();
    for (const { op, ident } of operationIdents(model)) {
      writeMethod(writer, op, ident, errorMode, isAsync);
      const spec = paginationSpecs.get(ident);
      if (spec !== undefined) {
        const success = successSchema(op);
        // Resolve the items ARRAY, then take its raw element schema — a `ref`
        // element keeps its name (a deref'd result would type as Any).
        const itemsArray =
          success !== undefined && typeof spec.items === 'string'
            ? schemaAtPointer(success, spec.items, model)
            : undefined;
        const element = itemsArray?.kind === 'array' ? itemsArray.items : undefined;
        writePaginationWrappers(
          writer,
          op,
          ident,
          isAsync,
          element === undefined ? 'Any' : pythonType(element)
        );
      }
    }
  });
  writer.blank();
}

/** The whole generated file: header, models, embedded runtime, descriptors, clients. */
export const pythonGenerator: Generator = ({ model, outputPath, emit }) => {
  const errorMode = emit.errorMode ?? 'throw';
  const writer = new Printer('    ');
  writer.line(
    `# Generated by @redocly/client-generator (python) from "${model.title}" ${model.version}.`
  );
  writer.line('# Do not edit by hand — regenerate with `redocly generate-client`.');
  writer.line('# Requires Python >= 3.9 and httpx: pip install httpx');
  writer.blank();

  // Models (with the shared imports header).
  writer.line(renderPythonModels(model).trimEnd());
  writer.blank();
  writer.blank();

  // The embedded runtime, stitched into one module: `from __future__` may appear
  // only at the top of a file, and the intra-runtime relative imports resolve to
  // this same file — both are dropped; duplicate stdlib imports are legal Python.
  writer.line('# ─── Embedded runtime (@redocly/client-generator python runtime) ───');
  for (const source of Object.values(PYTHON_RUNTIME_SOURCES)) {
    const stitched = source
      .split('\n')
      .filter((line) => !line.startsWith('from __future__') && !line.startsWith('from ._'))
      .join('\n')
      .trim();
    writer.line(stitched);
    writer.blank();
  }
  writer.blank();
  writer.block('def _safe_json(response: httpx.Response) -> Any:', () => {
    writer.block('try:', () => {
      writer.line('return response.json()');
    });
    writer.block('except Exception:', () => {
      writer.line('return None');
    });
  });
  writer.blank();

  // The wire-shape descriptor table the runtime routes by.
  const paginationSpecs = new Map<string, Record<string, unknown> | undefined>();
  for (const { op, ident } of operationIdents(model)) {
    paginationSpecs.set(
      ident,
      paginationSpec(op, emit as { pagination?: Record<string, unknown> })
    );
  }
  writer.line('_OPERATIONS = {');
  writer.indent(() => {
    for (const { op, ident } of operationIdents(model)) {
      const descriptor = {
        id: op.specName ?? op.name,
        method: op.method.toUpperCase(),
        path: op.path,
        ...(securitySpecs(op, model).length > 0 ? { security: securitySpecs(op, model) } : {}),
        ...(paginationSpecs.get(ident) !== undefined
          ? { pagination: paginationSpecs.get(ident) }
          : {}),
      };
      writer.line(`"${ident}": ${pythonLiteral(descriptor)},`);
    }
  });
  writer.line('}');
  writer.blank();
  writer.blank();

  writeClientClass(writer, model, errorMode, false, paginationSpecs);
  writeClientClass(writer, model, errorMode, true, paginationSpecs);

  return [{ path: outputPath.replace(/\.[^.\\/]+$/, '.py'), content: writer.toString() }];
};

/** One idiomatic Python call per operation — feeds `x-codeSamples` for docs. */
export function pythonSample(op: OperationModel, _ctx: SampleContext): CodeSample {
  const ident = identifierFor(op.name, { style: 'snake', reserved: PY });
  const args = [
    ...op.pathParams.map((param) => {
      const python = identifierFor(param.name, { style: 'snake', reserved: PY });
      return `${python}="<${python}>"`;
    }),
    ...op.queryParams
      .filter((param) => param.required)
      .map((param) => {
        const python = identifierFor(param.name, { style: 'snake', reserved: PY });
        return `${python}=...`;
      }),
    ...(op.requestBody ? ['body=...'] : []),
  ];
  return {
    lang: 'python',
    label: 'Python SDK',
    source: `from client import Client\n\nclient = Client()\nresult = client.${ident}(${args.join(', ')})\n`,
  };
}

// The built-in `python` generator — the first non-TypeScript library entry,
// authored the way the AGENTS.md skill teaches users' agents to author theirs:
// with the language-neutral toolkit only (Printer + schema/naming helpers).
// A guard test pins that this module never imports the TS emitter toolkit.

import {
  type NeutralPaginationRule,
  renderReferencePage,
  discriminatorCases,
  enumValues,
  flattenAllOf,
  headerCoerceType,
  identifierFor,
  isNullable,
  RESERVED_WORDS,
  uniqueIdentifiers,
  unwrapNullable,
  type DateType,
  isMultipartBody,
  jsonSuccessSchema,
  sseResponse,
  serverUrlParts,
  securityRequirements,
  paginationItemSchema,
} from '../../authoring/index.js';
import { PYTHON_RUNTIME_SOURCES } from '../../emitters/python-runtime-sources.js';
import type {
  ApiModel,
  OperationModel,
  PropertyModel,
  SchemaModel,
  ServerModel,
} from '../../intermediate-representation/model.js';
import { PythonPrinter } from '../../printers/python.js';
import type { CodeSample, Generator, GeneratorOptionsSchema, SampleContext } from '../types.js';

const PY = RESERVED_WORDS.python;

// Naming delegates to the printer — one implementation, used here and by any ejected copy.
const naming = new PythonPrinter();

/** A named schema's Python class name. */
function className(name: string): string {
  return naming.typeName(name);
}

/** A field/parameter name, with the wire name preserved when sanitization renames it. */
function fieldName(name: string): { python: string; renamed: boolean } {
  const { identifier, renamed } = naming.memberName(name);
  return { python: identifier, renamed };
}

/** The Python type annotation for a schema (anonymous complex shapes collapse to Any-ish). */
export function pythonType(schema: SchemaModel, dateType: DateType = 'string'): string {
  if (isNullable(schema)) {
    return `Optional[${pythonType(unwrapNullable(schema), dateType)}]`;
  }
  switch (schema.kind) {
    case 'scalar':
      // `dateType: Date` annotates date/date-time as stdlib objects; `_decode.py`
      // converts them from and to ISO strings on the wire.
      if (dateType === 'Date' && schema.scalar === 'string') {
        if (schema.metadata?.format === 'date-time') return 'datetime';
        if (schema.metadata?.format === 'date') return 'date';
      }
      return { string: 'str', integer: 'int', number: 'float', boolean: 'bool' }[schema.scalar];
    case 'array':
      return `List[${pythonType(schema.items, dateType)}]`;
    case 'record':
      return `Dict[str, ${pythonType(schema.value, dateType)}]`;
    case 'ref':
      return className(schema.name);
    case 'literal':
      return `Literal[${naming.literal(schema.value)}]`;
    case 'enum':
      // Anonymous (inline) enums keep the wire scalar; only NAMED enums get classes.
      return { string: 'str', integer: 'int', number: 'float', boolean: 'bool' }[schema.scalar];
    case 'union':
      return `Union[${schema.members.map((member) => pythonType(member, dateType)).join(', ')}]`;
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

/** The model style the generator emits: plain dataclasses, or pydantic `BaseModel`s. */
export type PythonModels = 'dataclass' | 'pydantic';

export const pythonOptions: GeneratorOptionsSchema = {
  type: 'object',
  properties: {
    models: {
      enum: ['dataclass', 'pydantic'],
      default: 'dataclass',
      description:
        'Model style: standard-library dataclasses (default, httpx is the only dependency), or pydantic BaseModel classes (adds pydantic).',
    },
  },
  additionalProperties: false,
};

/** The wire property and value a union's discriminator mapping pins on one member class. */
type DiscriminatorPin = { property: string; value: string };

/**
 * Under `models: pydantic` the decoder hands a whole object tree to `model_validate`, so a
 * union nested in a model is resolved by pydantic and never reaches the `DISCRIMINATORS`
 * table. Pydantic resolves it correctly when the annotation carries the discriminator, which
 * it accepts only if every member types that property as a `Literal` — and the mapping
 * already pins one value per member. This pass works out which unions qualify: every member
 * must declare the property, and no member may be pinned to two different values (a schema
 * reused by two unions).
 */
function pydanticDiscriminators(model: ApiModel): {
  pins: Map<string, DiscriminatorPin>;
  unions: Map<string, string>;
} {
  const pins = new Map<string, DiscriminatorPin>();
  const conflicted = new Set<string>();
  const candidates: Array<{ name: string; property: string; members: string[] }> = [];
  for (const { name, schema } of model.schemas) {
    const cases = discriminatorCases(schema, model);
    if (cases === undefined) continue;
    const declares = cases.cases.every(
      (entry) =>
        flattenAllOf(entry.schema, model)?.properties.some(
          (property) => property.name === cases.property
        ) === true
    );
    if (!declares) continue;
    for (const entry of cases.cases) {
      const existing = pins.get(entry.schemaName);
      if (existing !== undefined && existing.value !== entry.value) {
        conflicted.add(entry.schemaName);
        continue;
      }
      pins.set(entry.schemaName, { property: cases.property, value: entry.value });
    }
    candidates.push({
      name,
      property: cases.property,
      members: cases.cases.map((entry) => entry.schemaName),
    });
  }
  const unions = new Map<string, string>();
  for (const candidate of candidates) {
    if (candidate.members.some((member) => conflicted.has(member))) continue;
    unions.set(candidate.name, fieldName(candidate.property).python);
  }
  for (const member of conflicted) pins.delete(member);
  return { pins, unions };
}

/**
 * The argument names every request method declares itself. A parameter named after one of
 * them takes a suffixed binding instead, so the slot keeps its meaning.
 */
const METHOD_ARG_SLOTS = ['self', 'body', 'headers', 'timeout', 'retry', 'idempotency_key'];

function writeDataclass(
  printer: PythonPrinter,
  name: string,
  properties: PropertyModel[],
  dateType: DateType,
  models: PythonModels,
  description?: string,
  /** The discriminator value this class is mapped to, pinned as a `Literal` (pydantic). */
  pinned?: DiscriminatorPin
): void {
  const pydantic = models === 'pydantic';
  if (!pydantic) printer.line('@dataclass');
  const header = pydantic ? `class ${className(name)}(BaseModel):` : `class ${className(name)}:`;
  printer.block(header, () => {
    printer.doc(description);
    // A wire name that is not a legal field name travels as an alias, so the model
    // accepts both spellings; without this, populating by field name would fail.
    if (pydantic) {
      printer.line('model_config = ConfigDict(populate_by_name=True)');
      printer.blank();
    }
    // Required fields first — a dataclass field without a default may not follow one with.
    const ordered = [
      ...properties.filter((property) => property.required),
      ...properties.filter((property) => !property.required),
    ];
    const fieldMap: Array<[string, string]> = [];
    if (ordered.length === 0) printer.line('pass');
    for (const property of ordered) {
      const { python, renamed } = fieldName(property.name);
      if (renamed && !pydantic) fieldMap.push([python, property.name]);
      const alias = renamed && pydantic ? `alias=${naming.string(property.name)}` : undefined;
      const baseType =
        pinned?.property === property.name
          ? `Literal[${naming.literal(pinned.value)}]`
          : pythonType(property.schema, dateType);
      if (property.required) {
        const value = alias === undefined ? '' : ` = Field(${alias})`;
        printer.line(`${python}: ${baseType}${value}`);
      } else {
        const optional = baseType.startsWith('Optional[') ? baseType : `Optional[${baseType}]`;
        const value = alias === undefined ? 'None' : `Field(default=None, ${alias})`;
        printer.line(`${python}: ${optional} = ${value}`);
      }
    }
    if (fieldMap.length > 0) {
      printer.blank();
      printer.line('# Python field name -> wire (JSON) name, for (de)serialization.');
      const entries = fieldMap.map(([py, wire]) => `"${py}": ${naming.string(wire)}`).join(', ');
      printer.line(`_field_map: ClassVar[Dict[str, str]] = {${entries}}`);
    }
  });
  printer.blank();
  printer.blank();
}

/** Render every named schema: Enum classes, dataclasses (allOf flattened), union aliases. */
export function renderPythonModels(
  model: ApiModel,
  dateType: DateType = 'string',
  models: PythonModels = 'dataclass'
): string {
  const printer = new PythonPrinter();
  const { pins, unions } =
    models === 'pydantic'
      ? pydanticDiscriminators(model)
      : { pins: new Map<string, DiscriminatorPin>(), unions: new Map<string, string>() };
  printer.line('from __future__ import annotations');
  printer.blank();
  if (models === 'dataclass') printer.line('from dataclasses import dataclass');
  printer.line('from enum import Enum');
  // `ClassVar` types the `_field_map` of a dataclass model, which pydantic mode
  // replaces with field aliases — importing it there would be an unused import.
  const typingNames = [
    'Any',
    'AsyncIterator',
    'Dict',
    'Iterator',
    'List',
    'Literal',
    'Optional',
    'Tuple',
    'Union',
  ];
  if (models === 'dataclass') typingNames.splice(2, 0, 'ClassVar');
  if (unions.size > 0) typingNames.unshift('Annotated');
  printer.line(`from typing import ${typingNames.join(', ')}`);
  if (models === 'pydantic') printer.line('from pydantic import BaseModel, ConfigDict, Field');
  // Only under `dateType: Date` — an unused import in every other client would be noise.
  if (dateType === 'Date') printer.line('from datetime import date, datetime');
  printer.blank();
  printer.blank();

  const aliases: Array<() => void> = [];
  for (const { name, schema } of model.schemas) {
    const asEnum = enumValues(schema);
    if (asEnum !== undefined) {
      const base = asEnum.scalar === 'string' ? 'str, Enum' : 'int, Enum';
      printer.block(`class ${className(name)}(${base}):`, () => {
        printer.doc(schema.description);
        asEnum.values.forEach((value, index) => {
          printer.line(`${asEnum.memberNames[index]} = ${naming.literal(value)}`);
        });
      });
      printer.blank();
      printer.blank();
      continue;
    }
    if (schema.kind === 'object' || schema.kind === 'intersection') {
      const flat = flattenAllOf(schema, model);
      if (flat !== undefined) {
        writeDataclass(
          printer,
          name,
          flat.properties,
          dateType,
          models,
          flat.description ?? schema.description,
          pins.get(name)
        );
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
        printer.line(`# Discriminated by "${cases.property}": ${table}`);
      }
      const field = unions.get(name);
      const union =
        field === undefined
          ? pythonType(schema, dateType)
          : `Annotated[${pythonType(schema, dateType)}, Field(discriminator=${naming.string(field)})]`;
      printer.line(`${className(name)} = ${union}`);
      printer.blank();
    });
  }
  for (const emit of aliases) emit();
  return printer.toString();
}

/** The server URL as a Python expression: literals concatenated with declared-variable args. */
function serverUrlExpression(server: ServerModel): string {
  const parts = serverUrlParts(server).map((part) =>
    part.kind === 'literal' ? naming.string(part.value) : fieldName(part.name).python
  );
  return parts.join(' + ');
}

/** One static method per declared server; server variables become keyword arguments. */
function writePythonServers(printer: PythonPrinter, model: ApiModel): void {
  const servers = model.servers ?? [];
  if (servers.length === 0) return;
  const usedNames = new Set<string>();
  printer.block('class Servers:', () => {
    printer.line(
      '"""The declared servers; variables default to the values from the description."""'
    );
    printer.blank();
    servers.forEach((server, index) => {
      let name = identifierFor(server.description ?? `server${index + 1}`, {
        style: 'snake',
        reserved: PY,
      });
      if (usedNames.has(name)) name = `${name}_${index + 1}`;
      usedNames.add(name);
      const params = server.variables.map(
        (variable) => `${fieldName(variable.name).python}: str = ${naming.string(variable.default)}`
      );
      if (index > 0) printer.blank();
      printer.line('@staticmethod');
      printer.block(`def ${name}(${params.join(', ')}) -> str:`, () => {
        printer.line(`return ${serverUrlExpression(server)}`);
      });
    });
  });
  printer.blank();
}

/**
 * `DISCRIMINATORS[Pet] = ("petType", {"cat": Cat, ...})` registration lines, which `decode`
 * dispatches through. A union whose annotation already carries the discriminator is left
 * out: pydantic resolves it at any depth, and the `Literal` on each member makes the
 * decoder's member probe exact.
 */
function discriminatorRegistrations(model: ApiModel, annotated: Set<string>): string[] {
  const lines: string[] = [];
  for (const { name, schema } of model.schemas) {
    if (annotated.has(name)) continue;
    const cases = discriminatorCases(schema, model);
    if (cases === undefined) continue;
    const mapping = cases.cases
      .map((entry) => `${naming.string(entry.value)}: ${className(entry.schemaName)}`)
      .join(', ');
    lines.push(
      `DISCRIMINATORS[${className(name)}] = (${naming.string(cases.property)}, {${mapping}})`
    );
  }
  return lines;
}

/** JSON → Python literal (dicts/lists/strings/numbers/bools/None). */
function pythonLiteral(value: unknown): string {
  return naming.literal(value);
}

/** Every operation with its collision-free snake_case Python method name. */
function operationIdents(model: ApiModel): Array<{ op: OperationModel; ident: string }> {
  const operations = model.services.flatMap((service) => service.operations);
  const idents = uniqueIdentifiers(
    operations.map((op) => op.name),
    { style: 'snake', reserved: PY }
  );
  return operations.map((op, index) => ({ op, ident: idents[index] }));
}

/** The resolved pagination rule mapped to the snake_case spec dict the embedded
 * Python runtime consumes. */
function paginationSpec(
  rule: NeutralPaginationRule | undefined
): Record<string, unknown> | undefined {
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

/** Declared response headers as runtime coerce specs: `("wire-name", "snake_key", "type")`. */
function envelopeHeaderSpecs(op: OperationModel, model: ApiModel): string {
  const used = new Set<string>();
  const specs = (op.successResponseHeaders ?? []).map((header) => {
    const base = identifierFor(header.name, { style: 'snake', reserved: PY });
    let key = base;
    let suffix = 2;
    while (used.has(key)) key = `${base}_${suffix++}`;
    used.add(key);
    const type = headerCoerceType(header.schema, model);
    return `(${naming.string(header.name)}, ${naming.string(key)}, ${naming.string(type)})`;
  });
  return `[${specs.join(', ')}]`;
}

function writeMethod(
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

/** `<ident>_pages` / `<ident>_items` iterator methods for a paginated operation. */
function writePaginationWrappers(
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

function writeClientClass(
  printer: PythonPrinter,
  model: ApiModel,
  errorMode: 'throw' | 'result',
  isAsync: boolean,
  paginationSpecs: Map<string, Record<string, unknown> | undefined>,
  serverUrl: string,
  dateType: DateType
): void {
  const name = isAsync ? 'AsyncClient' : 'Client';
  const httpType = isAsync ? 'httpx.AsyncClient' : 'httpx.Client';
  printer.block(`class ${name}:`, () => {
    printer.doc(`${isAsync ? 'Async ' : ''}client for ${model.title} (${model.version}).`);
    printer.block(
      `def __init__(self, server_url: str = ${naming.string(serverUrl)}, *, ` +
        'auth: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None, ' +
        'timeout: Optional[float] = None, retry: Optional[Dict[str, Any]] = None, ' +
        'middleware: Optional[List[Any]] = None, idempotency_key: Any = None, ' +
        `http_client: Optional[${httpType}] = None) -> None:`,
      () => {
        printer.line('self._server_url = server_url');
        printer.line('self._auth = auth or {}');
        printer.line('self._config: Dict[str, Any] = {');
        printer.indent(() => {
          printer.line('"headers": headers or {},');
          printer.line('"timeout": timeout,');
          printer.line('"retry": retry or {},');
          printer.line('"middleware": middleware or [],');
          printer.line('"idempotency_key": idempotency_key,');
        });
        printer.line('}');
        printer.line(`self._http = http_client or ${httpType}()`);
      }
    );
    printer.blank();
    for (const { op, ident } of operationIdents(model)) {
      writeMethod(printer, op, ident, errorMode, isAsync, dateType);
      if (sseResponse(op) === undefined && (op.successResponseHeaders?.length ?? 0) > 0) {
        writeMethod(printer, op, ident, errorMode, isAsync, dateType, model, true);
      }
      const spec = paginationSpecs.get(ident);
      if (spec !== undefined) {
        const success = jsonSuccessSchema(op);
        const element = paginationItemSchema(
          success,
          typeof spec.items === 'string' ? spec.items : undefined,
          model
        );
        writePaginationWrappers(
          printer,
          op,
          ident,
          isAsync,
          element === undefined ? 'Any' : pythonType(element, dateType),
          dateType
        );
      }
    }
  });
  printer.blank();
}

/**
 * The output path with an IMPORTABLE module name. The `--output` stem follows the
 * TypeScript convention (`openapi.client.ts`), and `openapi.client.py` cannot be
 * imported by name — nor can a hyphen or a leading digit — so the stem is converted
 * to a legal module identifier (`openapi_client.py`). The directory is untouched.
 */
function pythonModulePath(outputPath: string): string {
  const separator = outputPath.lastIndexOf('/') >= 0 ? '/' : '\\';
  const cut = outputPath.lastIndexOf(separator);
  const dir = cut >= 0 ? outputPath.slice(0, cut + 1) : '';
  const stem = (cut >= 0 ? outputPath.slice(cut + 1) : outputPath).replace(/\.[^.]+$/, '');
  return `${dir}${identifierFor(stem, { style: 'snake', reserved: PY })}.py`;
}

/** The whole generated file: header, models, embedded runtime, descriptors, clients. */
export const pythonGenerator: Generator = ({ model, output, emit, options, pagination }) => {
  const errorMode = emit.errorMode ?? 'throw';
  const dateType = emit.dateType ?? 'string';
  const models = (options?.models as PythonModels | undefined) ?? 'dataclass';
  const pydantic = models === 'pydantic' ? pydanticDiscriminators(model) : undefined;
  const printer = new PythonPrinter();
  printer.line(
    `# Generated by @redocly/client-generator (python) from "${model.title}" ${model.version}.`
  );
  printer.line('# Do not edit by hand — regenerate with `redocly generate-client`.');
  printer.line(
    models === 'pydantic'
      ? '# Requires Python >= 3.9, httpx, and pydantic: pip install httpx pydantic'
      : '# Requires Python >= 3.9 and httpx: pip install httpx'
  );
  printer.blank();

  // Models (with the shared imports header).
  printer.line(renderPythonModels(model, dateType, models).trimEnd());
  printer.blank();
  printer.blank();
  writePythonServers(printer, model);

  // The embedded runtime, stitched into one module: `from __future__` may appear
  // only at the top of a file, and the intra-runtime relative imports resolve to
  // this same file — both are dropped; duplicate stdlib imports are legal Python.
  printer.line('# ─── Embedded runtime (@redocly/client-generator python runtime) ───');
  for (const source of Object.values(PYTHON_RUNTIME_SOURCES)) {
    const stitched = source
      .split('\n')
      .filter((line) => !line.startsWith('from __future__') && !line.startsWith('from ._'))
      .join('\n')
      .trim();
    printer.line(stitched);
    printer.blank();
  }
  printer.blank();
  const registrations = discriminatorRegistrations(model, new Set(pydantic?.unions.keys()));
  if (registrations.length > 0) {
    printer.line('# Discriminated unions dispatch by their property inside decode().');
    for (const registration of registrations) printer.line(registration);
    printer.blank();
  }
  printer.block('def _safe_json(response: httpx.Response) -> Any:', () => {
    printer.block('try:', () => {
      printer.line('return response.json()');
    });
    printer.block('except Exception:', () => {
      printer.line('return None');
    });
  });
  printer.blank();

  // The wire-shape descriptor table the runtime routes by.
  const paginationSpecs = new Map<string, Record<string, unknown> | undefined>();
  for (const { op, ident } of operationIdents(model)) {
    paginationSpecs.set(ident, paginationSpec(pagination?.get(op.name)?.spec));
  }
  printer.line('_OPERATIONS = {');
  printer.indent(() => {
    for (const { op, ident } of operationIdents(model)) {
      const descriptor = {
        id: op.specName ?? op.name,
        method: op.method.toUpperCase(),
        path: op.path,
        ...(securityRequirements(op, model).length > 0
          ? { security: securityRequirements(op, model) }
          : {}),
        ...(paginationSpecs.get(ident) !== undefined
          ? { pagination: paginationSpecs.get(ident) }
          : {}),
      };
      printer.line(`"${ident}": ${pythonLiteral(descriptor)},`);
    }
  });
  printer.line('}');
  printer.blank();
  printer.blank();

  // The `serverUrl` option overrides the description's server, like the TS sdk.
  const serverUrl = emit.serverUrl ?? model.serverUrl ?? '';
  writeClientClass(printer, model, errorMode, false, paginationSpecs, serverUrl, dateType);
  writeClientClass(printer, model, errorMode, true, paginationSpecs, serverUrl, dateType);

  return [{ path: pythonModulePath(output.path), content: printer.toString() }];
};

/** One idiomatic Python call per operation — feeds `x-codeSamples` for docs. */
export function pythonSample(op: OperationModel, ctx: SampleContext): CodeSample {
  // The module name this run writes, not a guess: `openapi.client.ts` becomes
  // `openapi_client.py`, so `from client import Client` would not import.
  const module = pythonModulePath(ctx.outputPath)
    .replace(/^.*[\\/]/, '')
    .replace(/\.py$/, '');
  // The DEDUPED name: on a collision the method is `get_user_2`, and a snippet naming
  // the raw `get_user` would show a call that goes to a different operation.
  const ident =
    operationIdents(ctx.model).find((entry) => entry.op.name === op.name)?.ident ??
    identifierFor(op.name, { style: 'snake', reserved: PY });
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
    source: `from ${module} import Client\n\nclient = Client()\nresult = client.${ident}(${args.join(', ')})\n`,
  };
}

/**
 * The SDK's own reference page, written when `client.docs` is on. The call snippets come
 * from `pythonSample` — this generator's own hook — so the page can only ever show the syntax
 * of the SDK beside it, and ejecting this generator takes the page with it.
 */
export const pythonDocs: Generator = ({ model, output, emit, pagination }) => [
  {
    path: output.path.replace(/\.[^.\\/]+$/, '.python.md'),
    content: renderReferencePage(model, {
      title: `${model.title} Python SDK reference`,
      frontmatter: emit.docsFrontmatter === true,
      language: {
        name: 'python',
        label: 'Python',
        fence: 'python',
        requires: 'The SDK needs `httpx`.',
      },
      sample: (op) => pythonSample(op, { model, emit, outputPath: output.path }),
      paginated: new Set(pagination?.keys() ?? []),
    }),
  },
];

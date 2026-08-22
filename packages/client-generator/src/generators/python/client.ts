// The `client` stage: the `Servers` helper class and the `Client`/`AsyncClient`
// classes that assemble the per-operation methods.

import {
  type ApiModel,
  type DateType,
  identifierFor,
  jsonSuccessSchema,
  paginationItemSchema,
  type ServerModel,
  serverUrlParts,
  sseResponse,
} from '@redocly/client-generator';
import type { PythonPrinter } from '@redocly/client-generator/printers/python';

import { fieldName, naming, operationIdents, PY } from './naming.js';
import { writeMethod } from './operations.js';
import { writePaginationWrappers } from './pagination.js';
import { pythonType } from './types.js';

/** The server URL as a Python expression: literals concatenated with declared-variable args. */
function serverUrlExpression(server: ServerModel): string {
  const parts = serverUrlParts(server).map((part) =>
    part.kind === 'literal' ? naming.string(part.value) : fieldName(part.name).python
  );
  return parts.join(' + ');
}

/** One static method per declared server; server variables become keyword arguments. */
export function writePythonServers(printer: PythonPrinter, model: ApiModel): void {
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

export function writeClientClass(
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

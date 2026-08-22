// The `client` stage: one `<Name>URL` function per declared server.

import { identifierFor, serverUrlParts } from '../../authoring/index.js';
import type { ApiModel, ServerModel } from '../../intermediate-representation/model.js';
import { exported, type GoPrinter } from '../../printers/go.js';
import { GO, naming } from './naming.js';

/** The server URL as a Go expression: literals concatenated with declared-variable args. */
function serverUrlExpression(server: ServerModel): string {
  const parts = serverUrlParts(server).map((part) =>
    part.kind === 'literal'
      ? naming.string(part.value)
      : identifierFor(part.name, { style: 'camel', reserved: GO })
  );
  return parts.join(' + ');
}

/** One `<Name>URL` function per declared server; server variables become parameters. */
export function writeGoServers(printer: GoPrinter, model: ApiModel): void {
  const servers = model.servers ?? [];
  if (servers.length === 0) return;
  const usedNames = new Set<string>();
  servers.forEach((server, index) => {
    let name = `${exported(server.description ?? `server${index + 1}`)}URL`;
    if (usedNames.has(name)) name = `${name}${index + 1}`;
    usedNames.add(name);
    const params = server.variables.map(
      (variable) => `${identifierFor(variable.name, { style: 'camel', reserved: GO })} string`
    );
    const defaults = server.variables
      .map(
        (variable) =>
          `${identifierFor(variable.name, { style: 'camel', reserved: GO })} default: ${naming.string(variable.default)}`
      )
      .join(', ');
    printer.line(
      `// ${name} returns the ${naming.string(server.description ?? server.url)} base URL${defaults === '' ? '.' : ` (${defaults}).`}`
    );
    printer.block(
      `func ${name}(${params.join(', ')}) string {`,
      () => {
        printer.line(`return ${serverUrlExpression(server)}`);
      },
      '}'
    );
    printer.blank();
  });
}

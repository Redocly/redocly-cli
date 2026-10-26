// The `client` stage: the `Servers` helper class of one static method per
// declared server.

import {
  type ApiModel,
  identifierFor,
  type ServerModel,
  serverUrlParts,
} from '@redocly/client-generator';
import type { JavaPrinter } from '@redocly/client-generator/printers/java';

import { JAVA, javaString, memberName } from './naming.ts';

/** The server URL as a Java expression: literals concatenated with declared-variable args. */
function serverUrlExpression(server: ServerModel): string {
  const parts = serverUrlParts(server).map((part) =>
    part.kind === 'literal' ? javaString(part.value) : memberName(part.name)
  );
  return parts.join(' + ');
}

/** One static method per declared server; server variables become String arguments. */
export function writeServers(printer: JavaPrinter, model: ApiModel): void {
  const servers = model.servers ?? [];
  if (servers.length === 0) return;
  const usedNames = new Set<string>();
  printer.line("/** The declared servers; the description's defaults are in each method's doc. */");
  printer.block(
    'public static final class Servers {',
    () => {
      servers.forEach((server, index) => {
        let name = identifierFor(server.description ?? `server${index + 1}`, {
          style: 'camel',
          reserved: JAVA,
        });
        if (usedNames.has(name)) name = `${name}${index + 1}`;
        usedNames.add(name);
        const params = server.variables.map((variable) => `String ${memberName(variable.name)}`);
        // Java has no default arguments; the spec default lives in the doc comment.
        const defaults = server.variables
          .map(
            (variable) => `${memberName(variable.name)} default: ${javaString(variable.default)}`
          )
          .join(', ');
        if (index > 0) printer.blank();
        printer.doc(
          name,
          `The ${javaString(server.description ?? server.url)} base URL${defaults === '' ? '.' : ` (${defaults}).`}`
        );
        printer.block(
          `public static String ${name}(${params.join(', ')}) {`,
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

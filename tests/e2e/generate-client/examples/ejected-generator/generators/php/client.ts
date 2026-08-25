// Ejected from @redocly/client-generator@0.3.8 — the built-in "php" generator.
// This file is yours: edit freely; the generated client stays machine-owned and is
// rebuilt by `redocly generate-client`. Newer generator versions merge in with
// `redocly eject-generator php --update`.
// The `client` stage: the `Servers` helper class of one static method per
// declared server.

import {
  type ApiModel,
  identifierFor,
  type ServerModel,
  serverUrlParts,
} from '@redocly/client-generator';
import type { PhpPrinter } from '@redocly/client-generator/printers/php';

import { PHP, phpString, propertyName } from './naming.ts';

/** The server URL as a PHP expression: literals concatenated with declared-variable args. */
function serverUrlExpression(server: ServerModel): string {
  const parts = serverUrlParts(server).map((part) =>
    part.kind === 'literal' ? phpString(part.value) : `${'$'}${propertyName(part.name)}`
  );
  return parts.join(' . ');
}

/** One static method per declared server; server variables become named string arguments. */
export function writeServers(printer: PhpPrinter, model: ApiModel): void {
  const servers = model.servers ?? [];
  if (servers.length === 0) return;
  const usedNames = new Set<string>();
  printer.line(
    '/** The declared servers; variables default to the values from the description. */'
  );
  printer.line('final class Servers');
  printer.block(
    '{',
    () => {
      servers.forEach((server, index) => {
        let name = identifierFor(server.description ?? `server${index + 1}`, {
          style: 'camel',
          reserved: PHP,
        });
        if (usedNames.has(name)) name = `${name}${index + 1}`;
        usedNames.add(name);
        const params = server.variables.map(
          (variable) =>
            `string ${'$'}${propertyName(variable.name)} = ${phpString(variable.default)}`
        );
        if (index > 0) printer.blank();
        printer.line(`public static function ${name}(${params.join(', ')}): string`);
        printer.block(
          '{',
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

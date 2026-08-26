// Ejected from @redocly/client-generator@0.4.0 — the built-in "php" generator.
// This file is yours: edit freely; the generated client stays machine-owned and is
// rebuilt by `redocly generate-client`. Newer generator versions merge in with
// `redocly eject-generator php --update`.
// The `naming` stage: the shared printer/naming instance, the string escaper, and
// the collision-free class/property/method identifiers every other stage builds on.

import {
  type ApiModel,
  identifierFor,
  type OperationModel,
  RESERVED_WORDS,
  uniqueIdentifiers,
} from '@redocly/client-generator';
import { PhpPrinter } from '@redocly/client-generator/printers/php';

export const PHP = RESERVED_WORDS.php;

// Naming and escaping delegate to the printer — one implementation, one policy.
export const naming = new PhpPrinter();

export function className(name: string): string {
  return naming.typeName(name);
}

export function propertyName(name: string): string {
  return naming.memberName(name);
}

/** `'…'` with backslashes and quotes escaped — safe for any spec-supplied text. */
export function phpString(value: string): string {
  return naming.string(value);
}

export function methodName(op: OperationModel): string {
  return identifierFor(op.name, { style: 'camel', reserved: PHP });
}

/**
 * The method name for every operation, unique across the client — PHP fatals on a
 * redeclared method, and two operationIds may camel-case to one name (`get-user`,
 * `getUser`). Keyed by the IR name, which the sanitizer already made unique.
 */
export function methodIdents(model: ApiModel): Map<string, string> {
  const operations = model.services.flatMap((service) => service.operations);
  const names = uniqueIdentifiers(
    operations.map((op) => op.name),
    { style: 'camel', reserved: PHP }
  );
  return new Map(operations.map((op, index) => [op.name, names[index]]));
}

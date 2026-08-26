// The `naming` stage: the shared printer/naming instance, the package clause, and
// the collision-free operation identifiers every other stage builds on.

import {
  type ApiModel,
  NotSupportedError,
  type OperationModel,
  RESERVED_WORDS,
} from '@redocly/client-generator';
import { exported, GoPrinter } from '@redocly/client-generator/printers/go';

// One escaping policy for every Go string literal this generator prints.
export const naming = new GoPrinter();

export const GO = RESERVED_WORDS.go;

/**
 * The package clause the output declares. Rewriting an invalid name would hide the
 * publisher's typo behind a package their imports don't mention, so this rejects it.
 */
export function goPackageName(configured: string | undefined): string {
  if (configured === undefined) return 'client';
  if (!/^[a-z_][a-z0-9_]*$/.test(configured) || GO.has(configured)) {
    throw new NotSupportedError(
      `goPackage "${configured}" is not a valid Go package name: use lowercase letters, digits, and underscores, don't start with a digit, and avoid Go keywords.`
    );
  }
  return configured;
}

/** Every operation with its collision-free exported Go method name. */
export function goOperationIdents(model: ApiModel): Array<{ op: OperationModel; ident: string }> {
  const used = new Set<string>();
  const out: Array<{ op: OperationModel; ident: string }> = [];
  for (const service of model.services) {
    for (const op of service.operations) {
      let ident = exported(op.name);
      let suffix = 2;
      while (used.has(ident)) ident = `${exported(op.name)}${suffix++}`;
      used.add(ident);
      out.push({ op, ident });
    }
  }
  return out;
}

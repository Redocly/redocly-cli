// The `naming` stage: the shared printer/naming instance and the collision-free
// identifier derivations every other stage builds on.

import {
  type ApiModel,
  type OperationModel,
  RESERVED_WORDS,
  uniqueIdentifiers,
} from '@redocly/client-generator';
import { PythonPrinter } from '@redocly/client-generator/printers/python';

export const PY = RESERVED_WORDS.python;

// Naming delegates to the printer — one implementation, used here and by any ejected copy.
export const naming = new PythonPrinter();

/** A named schema's Python class name. */
export function className(name: string): string {
  return naming.typeName(name);
}

/** A field/parameter name, with the wire name preserved when sanitization renames it. */
export function fieldName(name: string): { python: string; renamed: boolean } {
  const { identifier, renamed } = naming.memberName(name);
  return { python: identifier, renamed };
}

/** Every operation with its collision-free snake_case Python method name. */
export function operationIdents(model: ApiModel): Array<{ op: OperationModel; ident: string }> {
  const operations = model.services.flatMap((service) => service.operations);
  const idents = uniqueIdentifiers(
    operations.map((op) => op.name),
    { style: 'snake', reserved: PY }
  );
  return operations.map((op, index) => ({ op, ident: idents[index] }));
}

/**
 * The argument names every request method declares itself. A parameter named after one of
 * them takes a suffixed binding instead, so the slot keeps its meaning.
 */
export const METHOD_ARG_SLOTS = ['self', 'body', 'headers', 'timeout', 'retry', 'idempotency_key'];

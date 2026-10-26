// The `naming` stage: the shared printer/naming instance, the string escaper, the
// enclosing class name, and the collision-free type/member/method identifiers every
// other stage builds on.

import {
  type ApiModel,
  casing,
  identifierFor,
  NotSupportedError,
  type OperationModel,
  RESERVED_WORDS,
} from '@redocly/client-generator';
import { JavaPrinter } from '@redocly/client-generator/printers/java';
import { JAVA_RUNTIME_SOURCE } from '@redocly/client-generator/runtime-sources';

export const JAVA = RESERVED_WORDS.java;

// Naming and escaping delegate to the printer — one implementation, one policy.
export const naming = new JavaPrinter();

/**
 * The type names the runtime already uses inside the generated class — its own nested
 * types and every JDK type it references, read off its source — plus the names the
 * generated methods add. A schema that folds to one of them gets a `Model` suffix: a
 * nested `record Config` would shadow the runtime's `Config`, and a nested `record Thread`
 * (GitHub has one) would shadow `java.lang.Thread` for the runtime's retry sleep.
 */
const TAKEN_TYPE_NAMES = new Set([
  ...[
    // Comments, char literals (a `'"'` would otherwise open a string), then strings go.
    ...JAVA_RUNTIME_SOURCE.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
      .replace(/'(?:[^'\\]|\\.)'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .matchAll(/\b[A-Z][A-Za-z0-9]*\b/g),
  ].map((match) => match[0]),
  'Servers',
  'Void',
]);

export function typeName(name: string): string {
  const ident = naming.typeName(name);
  return TAKEN_TYPE_NAMES.has(ident) ? `${ident}Model` : ident;
}

export function memberName(name: string): string {
  return naming.memberName(name);
}

/** `"…"` with the escapes javac needs — safe for any spec-supplied text. */
export function javaString(value: string): string {
  return naming.string(value);
}

/**
 * The enclosing class — Java puts one public class per file, named after it — derived
 * from the `--output` stem the way Python derives its module name (`openapi.client` →
 * `OpenapiClient`). A schema of the same name cannot nest inside it, so that is rejected
 * with the fix rather than renamed behind the user's back.
 */
export function javaClassName(stem: string, model: ApiModel): string {
  const name = identifierFor(stem, { style: 'pascal', reserved: JAVA }) || 'Client';
  // Inside a class named `Config` or `List`, those names mean the class itself.
  if (TAKEN_TYPE_NAMES.has(name)) {
    throw new NotSupportedError(
      `The output file name "${stem}" gives the Java class the name "${name}", which the SDK already uses for one of its own types. Choose another --output name, for example "${stem}-sdk.ts".`
    );
  }
  const clash = model.schemas.find((schema) => typeName(schema.name) === name);
  if (clash !== undefined) {
    throw new NotSupportedError(
      `The output file name "${stem}" gives the Java class the same name as the "${clash.name}" schema, which cannot nest inside it. Choose another --output name, for example "${stem}-sdk.ts".`
    );
  }
  return name;
}

/**
 * The package clause the output declares, derived from the API title the way the PHP
 * generator derives its namespace: the title's words in lowercase, run together, as Java
 * package names are written (`Cafe Orders API` → `cafeordersapi`). A class in the default
 * package cannot be imported from any named package, so there is always one. A name that
 * cannot be a package as is follows Oracle's package-naming convention: a keyword gets a
 * trailing underscore (`class_`), and so does `java`, which the JVM keeps for the JDK; a
 * leading digit gets a leading underscore (`_3dprintingapi`).
 */
export function javaPackageName(title: string): string {
  const plain = plainPackageName(title);
  if (plain === '') return 'api';
  if (/^[0-9]/.test(plain)) return `_${plain}`;
  return JAVA.has(plain) || plain === 'java' ? `${plain}_` : plain;
}

/** The title's words in lowercase, run together — the package before any convention applies. */
export function plainPackageName(title: string): string {
  return casing.pascal(title).toLowerCase();
}

export function methodName(op: OperationModel): string {
  return identifierFor(op.name, { style: 'camel', reserved: JAVA });
}

/** The methods every class inherits from `Object`; an operation named after one would override it. */
// prettier-ignore
const OBJECT_METHODS = [
  'getClass', 'hashCode', 'equals', 'clone', 'toString', 'notify', 'notifyAll', 'wait',
  'finalize',
];

/** The methods an operation may add beside its own, all named after it. */
const METHOD_VARIANTS = ['', 'WithHeaders', 'Pages', 'Items'];

/**
 * The method name for every operation, unique across the client — two operationIds may
 * camel-case to one name (`get-user`, `getUser`). Each name also books its `WithHeaders`,
 * `Pages`, and `Items` variants, so a later operation named like one of them moves aside
 * (`listOrdersPages2`). Keyed by the IR name, which the sanitizer already made unique.
 */
export function methodIdents(model: ApiModel): Map<string, string> {
  const used = new Set(OBJECT_METHODS);
  const idents = new Map<string, string>();
  for (const op of model.services.flatMap((service) => service.operations)) {
    const base = identifierFor(op.name, { style: 'camel', reserved: JAVA });
    let ident = base;
    for (let suffix = 2; METHOD_VARIANTS.some((variant) => used.has(ident + variant)); suffix++) {
      ident = `${base}${suffix}`;
    }
    for (const variant of METHOD_VARIANTS) used.add(ident + variant);
    idents.set(op.name, ident);
  }
  return idents;
}

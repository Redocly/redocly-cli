// The four language printers (ADR-0021): the common `Printer` owns structure, each of
// these owns one language's syntax. They fill the same slots — `typeName`, `memberName`,
// `identifier`, `identifiers`, `string`, `literal`, `comment`, `doc`, a baked-in indent
// unit, and (where the language demands one) a `layout` pass applied by `toString()`.

export { GoPrinter, exported } from './go.js';
export { PhpPrinter } from './php.js';
export { PythonPrinter } from './python.js';
export { TypeScriptPrinter } from './typescript.js';

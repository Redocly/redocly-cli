import { NotSupportedError } from '../errors.js';
import { ts } from './ts.js';

const SETUP_IMPORT = '@redocly/client-generator';

/**
 * Transform a publisher `--setup` module into the neutral **setup expression** the emitters splice
 * into a client as `const __redoclySetup = <expr>` — applied per-facade (functions → `configure`/
 * `use`; service-class → constructor merge). Strips the (package-only) imports, extracts the default
 * export's `defineClientSetup({ config, middleware })` argument, and — when the file declares
 * helpers — wraps them in an IIFE so they are preserved yet scoped (only `__redoclySetup` lands in
 * module scope, avoiding collisions):
 *
 *   (() => { <file helpers…> return <arg>; })()
 *
 * The transform is textual (`node.getText()`): re-printing parsed nodes through the TS printer
 * loses string-literal text, so we preserve the publisher's exact source for each kept node.
 */
export function bakeSetup(source: string): string {
  const sf = ts.createSourceFile(
    'setup.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const kept: string[] = [];
  let argText: string | undefined;
  // The local name `defineClientSetup` is imported as (it may be aliased:
  // `import { defineClientSetup as setup }`), so `unwrap` matches the right callee.
  let defineClientSetupLocal = 'defineClientSetup';

  for (const stmt of sf.statements) {
    if (ts.isImportDeclaration(stmt)) {
      const spec = (stmt.moduleSpecifier as ts.StringLiteral).text;
      if (spec !== SETUP_IMPORT) {
        throw new NotSupportedError(
          `A --setup file may only import from "${SETUP_IMPORT}"; found "${spec}". ` +
            `Setup code may use web globals and the client contract only (keeps the client zero-dependency).`
        );
      }
      const named = stmt.importClause?.namedBindings;
      if (named && ts.isNamedImports(named)) {
        for (const el of named.elements) {
          if ((el.propertyName?.text ?? el.name.text) === 'defineClientSetup') {
            defineClientSetupLocal = el.name.text;
          }
        }
      }
      continue; // drop — the symbols resolve in the baked client's own scope
    }
    if (ts.isExportAssignment(stmt) && !stmt.isExportEquals) {
      argText = unwrap(stmt.expression, defineClientSetupLocal).getText(sf);
      continue;
    }
    kept.push(stmt.getText(sf));
  }

  if (argText === undefined) {
    throw new NotSupportedError(
      'A --setup file must `export default defineClientSetup({ config, middleware })` (or a setup object).'
    );
  }

  if (kept.length === 0) return argText;
  return `(() => {\n${kept.join('\n')}\nreturn ${argText};\n})()`;
}

/** `defineClientSetup(<arg>)` → `<arg>`; a bare object literal passes through unchanged.
 * `localName` is the (possibly aliased) local binding the setup module imported it as. */
function unwrap(expr: ts.Expression, localName: string): ts.Expression {
  if (
    ts.isCallExpression(expr) &&
    ts.isIdentifier(expr.expression) &&
    expr.expression.text === localName &&
    expr.arguments.length === 1
  ) {
    return expr.arguments[0];
  }
  return expr;
}

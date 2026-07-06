// Foundation for AST-based code emission: a shared TypeScript printer plus
// `ts.factory` ergonomics. Emitters build `ts.Node`s and print them through
// `printNodes`; hand-authored reference TypeScript is embedded via
// `parseStatements`. The compiler (`ts`) is re-exported so emitters import the
// factory from one place.

import ts from 'typescript';

export { ts };

const printer = ts.createPrinter({
  newLine: ts.NewLineKind.LineFeed,
  removeComments: false,
});

const blankFile = ts.createSourceFile('', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);

/** Print a list of nodes to source, tight (one per line) — for import/export groups and single nodes. */
export function printNodes(nodes: readonly ts.Node[]): string {
  return nodes.map(printOne).join('\n');
}

/** Print top-level declarations separated by one blank line, for readable declaration bodies. */
export function printStatements(nodes: readonly ts.Node[]): string {
  return nodes.map(printOne).join('\n\n');
}

function printOne(node: ts.Node): string {
  return printer.printNode(ts.EmitHint.Unspecified, node, sourceFileOf(node));
}

// Synthesized (`ts.factory`) nodes have no parent chain — print them against the
// shared blank file. Parsed nodes (from `parseStatements`, built with parent
// nodes set) must print against their own source so literal token text survives.
function sourceFileOf(node: ts.Node): ts.SourceFile {
  let current: ts.Node | undefined = node;
  while (current) {
    if (ts.isSourceFile(current)) return current;
    current = current.parent;
  }
  return blankFile;
}

/** Parse a source string into its top-level statements (for embedding hand-authored code). */
export function parseStatements(source: string): ts.Statement[] {
  return [
    ...ts.createSourceFile('__embed.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
      .statements,
  ];
}

/** Parse a single source expression into a ts.Expression (for emitting generator-authored
 *  expressions like `new Blob([])` that aren't plain data literals). */
export function parseExpression(source: string): ts.Expression {
  const stmt = ts.createSourceFile(
    '__expr.ts',
    `(${source});`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  ).statements[0];
  const parenthesized = (stmt as ts.ExpressionStatement).expression as ts.ParenthesizedExpression;
  return parenthesized.expression;
}

/**
 * Attach a block JSDoc leading comment to `node` so it prints as a `/** … *​/`
 * block above the node. Multi-line `text` becomes `*`-prefixed lines.
 */
export function jsdoc<T extends ts.Node>(node: T, text: string): T {
  // Neutralize any embedded `*/` here, at the single choke point every JSDoc block
  // flows through: a spec-supplied description/summary/title containing `*/` would
  // otherwise close the comment early and turn the rest into live code (injection).
  const body = `*\n${escapeJsDoc(text)
    .split('\n')
    .map((line) => ` * ${line}`.replace(/ +$/, ''))
    .join('\n')}\n `;
  return ts.addSyntheticLeadingComment(node, ts.SyntaxKind.MultiLineCommentTrivia, body, true);
}

/** Backslash-escape any comment-closing star-slash so it cannot terminate a block comment. */
export function escapeJsDoc(text: string): string {
  return text.replace(/\*\//g, '*\\/');
}

const { factory } = ts;

/**
 * Shared `ts.factory` builders for the handful of node shapes every emitter was
 * re-implementing locally (variable statements, arrow functions, `as const`
 * arrays). Centralizing them keeps emitters terse and their output identical.
 */

/** A `const`/`let` variable statement: `[export] const|let <name>[: type] = <init>;`. */
/** `export const <name> = <init>;` */
export function exportConstStatement(name: string, init: ts.Expression): ts.Statement {
  return factory.createVariableStatement(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    factory.createVariableDeclarationList(
      [factory.createVariableDeclaration(name, undefined, undefined, init)],
      ts.NodeFlags.Const
    )
  );
}

/** An arrow function `(<params>) => <body>` (no explicit return type). */
export function arrow(params: ts.ParameterDeclaration[], body: ts.ConciseBody): ts.ArrowFunction {
  return factory.createArrowFunction(
    undefined,
    undefined,
    params,
    undefined,
    factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    body
  );
}

/** `[<elements…>] as const`. */
export function constArray(elements: ts.Expression[]): ts.Expression {
  return factory.createAsExpression(
    factory.createArrayLiteralExpression(elements, false),
    factory.createTypeReferenceNode('const')
  );
}

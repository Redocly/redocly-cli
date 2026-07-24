// Foundation for AST-based code emission: a shared TypeScript printer plus
// `ts.factory` ergonomics. Emitters build `ts.Node`s and print them through
// `printNodes`; hand-authored reference TypeScript is embedded via
// `parseStatements`. The compiler (`ts`) is re-exported so emitters import the
// factory from one place.

import ts from 'typescript';

import { isIdentifier } from './identifier.js';

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

/**
 * A plain JS value as a printable literal expression. Negative numbers print as
 * a unary minus over the positive literal (a `NumericLiteral` node cannot carry
 * the sign); arrays and objects recurse and print compact, with keys quoted only
 * when they fail the identifier GRAMMAR — reserved words (a descriptor's `in`
 * field) are legal bare object-literal keys. The primitive overload's narrower
 * return type fits `factory.createLiteralTypeNode`.
 */
export function literalExpression(
  value: string | number | boolean | null
): ts.LiteralExpression | ts.BooleanLiteral | ts.NullLiteral | ts.PrefixUnaryExpression;
export function literalExpression(value: unknown): ts.Expression;
export function literalExpression(value: unknown): ts.Expression {
  if (typeof value === 'string') return factory.createStringLiteral(value);
  if (typeof value === 'boolean') return value ? factory.createTrue() : factory.createFalse();
  if (typeof value === 'number') {
    return value < 0
      ? factory.createPrefixUnaryExpression(
          ts.SyntaxKind.MinusToken,
          factory.createNumericLiteral(-value)
        )
      : factory.createNumericLiteral(value);
  }
  if (value === null) return factory.createNull();
  if (Array.isArray(value)) {
    return factory.createArrayLiteralExpression(value.map(literalExpression), false);
  }
  return factory.createObjectLiteralExpression(
    Object.entries(value as Record<string, unknown>).map(([key, entryValue]) =>
      factory.createPropertyAssignment(
        isIdentifier(key) ? key : factory.createStringLiteral(key),
        literalExpression(entryValue)
      )
    ),
    false
  );
}

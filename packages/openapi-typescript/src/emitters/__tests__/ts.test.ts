import { jsdoc, parseExpression, parseStatements, printNodes, printStatements, ts } from '../ts.js';

describe('emitters/ts foundation', () => {
  describe('printNodes', () => {
    it('round-trips an interface declaration', () => {
      const decl = ts.factory.createInterfaceDeclaration(
        [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        'Foo',
        undefined,
        undefined,
        [
          ts.factory.createPropertySignature(
            undefined,
            'id',
            undefined,
            ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
          ),
        ]
      );
      expect(printNodes([decl])).toBe('export interface Foo {\n    id: string;\n}');
    });

    it('round-trips a const declaration', () => {
      const decl = ts.factory.createVariableStatement(
        [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createVariableDeclarationList(
          [
            ts.factory.createVariableDeclaration(
              'x',
              undefined,
              undefined,
              ts.factory.createNumericLiteral(1)
            ),
          ],
          ts.NodeFlags.Const
        )
      );
      expect(printNodes([decl])).toBe('export const x = 1;');
    });

    it('joins multiple nodes with a newline', () => {
      const lit = (n: number): ts.ExpressionStatement =>
        ts.factory.createExpressionStatement(ts.factory.createNumericLiteral(n));
      expect(printNodes([lit(1), lit(2)])).toBe('1;\n2;');
    });
  });

  describe('printStatements', () => {
    const lit = (n: number): ts.ExpressionStatement =>
      ts.factory.createExpressionStatement(ts.factory.createNumericLiteral(n));

    it('separates top-level declarations with a blank line', () => {
      expect(printStatements([lit(1), lit(2)])).toBe('1;\n\n2;');
    });

    it('prints a single node with no trailing blank line', () => {
      expect(printStatements([lit(1)])).toBe('1;');
    });
  });

  describe('parseStatements', () => {
    it('yields re-printable statements from source', () => {
      const statements = parseStatements('export const x = 1;');
      expect(statements).toHaveLength(1);
      expect(printNodes(statements)).toBe('export const x = 1;');
    });
  });

  describe('parseExpression', () => {
    it('parses a source expression into a re-printable ts.Expression', () => {
      const expr = parseExpression('new Blob([])');
      expect(ts.isNewExpression(expr)).toBe(true);
      expect(printNodes([expr])).toBe('new Blob([])');
    });
  });

  describe('jsdoc', () => {
    it('prints a single-line block comment above the node', () => {
      const decl = ts.factory.createVariableStatement(
        undefined,
        ts.factory.createVariableDeclarationList(
          [
            ts.factory.createVariableDeclaration(
              'y',
              undefined,
              undefined,
              ts.factory.createNull()
            ),
          ],
          ts.NodeFlags.Const
        )
      );
      const out = printNodes([jsdoc(decl, 'A note.')]);
      expect(out).toBe('/**\n * A note.\n */\nconst y = null;');
    });

    it('prints a multi-line block comment with one star per line', () => {
      const decl = ts.factory.createTypeAliasDeclaration(
        undefined,
        'T',
        undefined,
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
      );
      const out = printNodes([jsdoc(decl, 'line one\nline two')]);
      expect(out).toBe('/**\n * line one\n * line two\n */\ntype T = string;');
    });

    it('escapes an embedded `*/` so a hostile description cannot break out of the comment', () => {
      const decl = ts.factory.createTypeAliasDeclaration(
        undefined,
        'T',
        undefined,
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
      );
      const out = printNodes([jsdoc(decl, 'evil */ ;globalThis.PWNED=1; /*')]);
      // The `*/` is neutralized to `*\/`; no live `*/` survives inside the comment body.
      expect(out).toContain('evil *\\/ ;globalThis.PWNED=1; /*');
      expect(out).not.toContain('evil */');
      // Exactly one comment-closing `*/` (the real one the printer appends).
      expect(out.match(/\*\//g)).toHaveLength(1);
    });
  });
});

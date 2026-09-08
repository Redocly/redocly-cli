import ts from 'typescript';

import { reservedModuleNames } from '../reserved-names.js';
import { RUNTIME_SOURCES } from '../runtime-sources/typescript.js';

/**
 * Every free identifier of a source — referenced but bound in no enclosing scope, so
 * it resolves to a global (or, embedded, to the module scope a generated declaration
 * could shadow). A lean scope walk, not the full binder: enough for the runtime's
 * plain-module style, and any miss fails the assertion below loudly rather than
 * silently.
 */
function freeIdentifiers(fileName: string, source: string): Set<string> {
  const free = new Set<string>();
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const moduleScope = new Set<string>();
  for (const statement of file.statements) collectBindings(statement, moduleScope);
  walk(file, [moduleScope]);
  return free;

  function collectBindings(node: ts.Node, scope: Set<string>): void {
    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        bindPattern(declaration.name, scope);
      }
    } else if (
      (ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node)) &&
      node.name !== undefined
    ) {
      scope.add(node.name.text);
    } else if (ts.isImportDeclaration(node) && node.importClause) {
      const clause = node.importClause;
      if (clause.name) scope.add(clause.name.text);
      if (clause.namedBindings) {
        if (ts.isNamedImports(clause.namedBindings)) {
          for (const element of clause.namedBindings.elements) scope.add(element.name.text);
        } else {
          scope.add(clause.namedBindings.name.text);
        }
      }
    }
  }

  function bindPattern(name: ts.BindingName, scope: Set<string>): void {
    if (ts.isIdentifier(name)) scope.add(name.text);
    else {
      for (const element of name.elements) {
        if (ts.isBindingElement(element)) bindPattern(element.name, scope);
      }
    }
  }

  function walk(node: ts.Node, scopes: Array<Set<string>>): void {
    let next = scopes;
    if (
      ts.isFunctionLike(node) ||
      ts.isBlock(node) ||
      ts.isForStatement(node) ||
      ts.isForOfStatement(node) ||
      ts.isCatchClause(node) ||
      ts.isCaseBlock(node)
    ) {
      const scope = new Set<string>();
      if (ts.isFunctionLike(node)) {
        for (const parameter of node.parameters ?? []) bindPattern(parameter.name, scope);
        for (const typeParameter of node.typeParameters ?? []) scope.add(typeParameter.name.text);
        if (node.name && ts.isIdentifier(node.name)) scope.add(node.name.text);
      }
      if (ts.isCatchClause(node) && node.variableDeclaration) {
        bindPattern(node.variableDeclaration.name, scope);
      }
      const body = ts.isFunctionLike(node) && 'body' in node ? node.body : node;
      if (body !== undefined && (ts.isBlock(body) || ts.isCaseBlock(body))) {
        const statements = ts.isBlock(body)
          ? body.statements
          : body.clauses.flatMap((clause) => [...clause.statements]);
        for (const statement of statements) collectBindings(statement, scope);
      }
      if (
        (ts.isForStatement(node) || ts.isForOfStatement(node)) &&
        node.initializer !== undefined &&
        ts.isVariableDeclarationList(node.initializer)
      ) {
        for (const declaration of node.initializer.declarations) {
          bindPattern(declaration.name, scope);
        }
      }
      next = [...scopes, scope];
    }
    if (ts.isMappedTypeNode(node)) {
      next = [...next, new Set([node.typeParameter.name.text])];
    }
    if (
      (ts.isTypeAliasDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isClassDeclaration(node)) &&
      node.typeParameters
    ) {
      next = [
        ...next,
        new Set(node.typeParameters.map((typeParameter) => typeParameter.name.text)),
      ];
    }
    if (ts.isIdentifier(node) && isReference(node) && !next.some((scope) => scope.has(node.text))) {
      free.add(node.text);
    }
    node.forEachChild((child) => walk(child, next));
  }

  function isReference(id: ts.Identifier): boolean {
    const parent = id.parent as ts.Node | undefined;
    if (!parent) return false;
    if (id.text === 'undefined') return false; // keyword-ish; reserved explicitly anyway
    if (ts.isPropertyAccessExpression(parent) && parent.name === id) return false;
    if (ts.isQualifiedName(parent) && parent.right === id) return false;
    if (ts.isPropertyAssignment(parent) && parent.name === id) return false;
    if (ts.isPropertySignature(parent) && parent.name === id) return false;
    if (ts.isPropertyDeclaration(parent) && parent.name === id) return false;
    if (ts.isMethodDeclaration(parent) && parent.name === id) return false;
    if (ts.isMethodSignature(parent) && parent.name === id) return false;
    if (ts.isEnumMember(parent) && parent.name === id) return false;
    if (ts.isBindingElement(parent) && parent.propertyName === id) return false;
    if (ts.isImportSpecifier(parent) || ts.isImportClause(parent)) return false;
    if (ts.isVariableDeclaration(parent) && parent.name === id) return false;
    if (ts.isParameter(parent) && parent.name === id) return false;
    if (ts.isFunctionDeclaration(parent) && parent.name === id) return false;
    if (ts.isClassDeclaration(parent) && parent.name === id) return false;
    if (ts.isTypeAliasDeclaration(parent) && parent.name === id) return false;
    if (ts.isInterfaceDeclaration(parent) && parent.name === id) return false;
    if (ts.isTypeParameterDeclaration(parent) && parent.name === id) return false;
    return true;
  }
}

describe('reservedModuleNames', () => {
  it('covers every free identifier of the embedded runtime (values AND types)', () => {
    // In inline mode the runtime shares the module scope with generated declarations —
    // a schema named `Object` (whose string enum emits a const companion) would shadow
    // the global and break the runtime. Every global the runtime touches must therefore
    // be in the reserved set, so the sanitizer renames such schemas/operations.
    const reserved = reservedModuleNames();
    const missing = new Set<string>();
    for (const [name, source] of Object.entries(RUNTIME_SOURCES)) {
      for (const identifier of freeIdentifiers(name, source)) {
        if (!reserved.has(identifier)) missing.add(identifier);
      }
    }
    expect([...missing].sort()).toEqual([]);
  });

  it('reserves the wiring, satellite, and platform names alongside the runtime declarations', () => {
    const reserved = reservedModuleNames();
    for (const name of ['client', 'OPERATIONS', 'http', 'z', 'Object', 'JSON', 'fetch', 'Date']) {
      expect(reserved.has(name), name).toBe(true);
    }
  });
});

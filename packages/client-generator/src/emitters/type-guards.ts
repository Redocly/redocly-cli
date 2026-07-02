import type { DiscriminatorModel, NamedSchemaModel, SchemaModel } from '../intermediate-representation/model.js';
import { jsdoc, ts } from './ts.js';

/**
 * A discriminated union we can emit guards for, found while walking the schema
 * tree. `makeParamType` builds the guard's `value` parameter type — the named
 * union for a top-level union (`MenuItem`), or the inline member union for one
 * nested inside another schema (`SuccessItem | ErrorItem`). `label` is the same,
 * rendered for the JSDoc line. A thunk (not a cached node) avoids reusing one
 * `ts.TypeNode` across the several guard declarations a site produces.
 */
type UnionSite = {
  union: Extract<SchemaModel, { kind: 'union' }>;
  label: string;
  makeParamType: () => ts.TypeNode;
};

/**
 * Emit `is<Member>(value): value is <Member>` type guards for every discriminated
 * union with a usable discriminator — whether it is a top-level named schema
 * (`MenuItem = A | B`) or nested inside one (e.g. the `items` of an array, the
 * value of a property). Two discriminator sources:
 *
 * - Explicit: the union carries a `discriminator` (built from the spec).
 * - Implicit: no discriminator, but every member is a ref to a named schema and
 *   they all constrain one shared property to a distinct string `const`.
 *
 * Nested unions only qualify when every member is a ref to a named schema, so the
 * `value` parameter is a clean union of exported types. Guard names are globally
 * deduped (`is<Member>`), keeping the first in document order — so a top-level
 * union wins its nicer `value: <UnionName>` parameter over a nested re-occurrence.
 * Undiscriminated unions are skipped — TypeScript can't soundly narrow them.
 */
/** The type-guard function declarations as nodes (empty when no union narrows). */
export function typeGuardStatements(schemas: NamedSchemaModel[]): ts.FunctionDeclaration[] {
  const byName = new Map(schemas.map((s) => [s.name, s.schema] as const));
  const nodes: ts.FunctionDeclaration[] = [];
  const emitted = new Set<string>();

  for (const named of schemas) {
    for (const site of collectUnionSites(named)) {
      const discriminator =
        site.union.discriminator ?? detectImplicitDiscriminator(site.union, byName);
      if (!discriminator) continue;

      // Group discriminant values by target schema so two mapping keys pointing at
      // the same type produce one guard (a duplicate `is<Name>` would not compile).
      const valuesByTarget = new Map<string, string[]>();
      for (const entry of discriminator.mapping) {
        if (!byName.has(entry.schemaName)) continue;
        const existing = valuesByTarget.get(entry.schemaName);
        if (existing) existing.push(entry.value);
        else valuesByTarget.set(entry.schemaName, [entry.value]);
      }

      for (const [schemaName, values] of valuesByTarget) {
        const guardName = `is${schemaName}`;
        if (emitted.has(guardName)) continue;
        emitted.add(guardName);
        nodes.push(
          buildTypeGuard(
            site.makeParamType(),
            site.label,
            discriminator.propertyName,
            schemaName,
            values
          )
        );
      }
    }
  }

  return nodes;
}

const { factory } = ts;

/**
 * The discriminated-union sites reachable from a named schema, in a stable order:
 * the schema itself (when it is a union), then any nested unions found by walking
 * its tree. A top-level union keeps its name as the guard parameter; nested unions
 * use their inline member union.
 */
function collectUnionSites(named: NamedSchemaModel): UnionSite[] {
  const sites: UnionSite[] = [];
  const root = named.schema;
  if (root.kind === 'union') {
    sites.push({
      union: root,
      label: named.name,
      makeParamType: () => factory.createTypeReferenceNode(named.name),
    });
    for (const member of root.members) collectNestedSites(member, sites);
  } else {
    collectNestedSites(root, sites);
  }
  return sites;
}

/** Walk a schema subtree, recording each nested all-named-ref union as a site. */
function collectNestedSites(schema: SchemaModel, sites: UnionSite[]): void {
  switch (schema.kind) {
    case 'union': {
      const names = schema.members.map((m) => (m.kind === 'ref' ? m.name : undefined));
      if (names.every((n): n is string => n !== undefined)) {
        sites.push({
          union: schema,
          label: names.join(' | '),
          makeParamType: () =>
            factory.createUnionTypeNode(names.map((n) => factory.createTypeReferenceNode(n))),
        });
      }
      for (const member of schema.members) collectNestedSites(member, sites);
      break;
    }
    case 'array':
      collectNestedSites(schema.items, sites);
      break;
    case 'record':
      collectNestedSites(schema.value, sites);
      break;
    case 'object':
      for (const prop of schema.properties) collectNestedSites(prop.schema, sites);
      break;
    case 'intersection':
      for (const member of schema.members) collectNestedSites(member, sites);
      break;
    // scalar / literal / enum / ref / null / unknown / omit have no nested unions.
  }
}

/** `(value as Record<string, unknown>)[<prop>]` — the narrowed property access. */
function propertyAccess(propertyName: string): ts.Expression {
  const recordType = factory.createTypeReferenceNode('Record', [
    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
    factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
  ]);
  return factory.createElementAccessExpression(
    factory.createAsExpression(factory.createIdentifier('value'), recordType),
    factory.createStringLiteral(propertyName)
  );
}

function buildTypeGuard(
  paramType: ts.TypeNode,
  unionLabel: string,
  propertyName: string,
  schemaName: string,
  values: string[]
): ts.FunctionDeclaration {
  const access = propertyAccess(propertyName);
  const check =
    values.length === 1
      ? factory.createBinaryExpression(
          access,
          factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
          factory.createStringLiteral(values[0])
        )
      : // `([...values] as readonly unknown[]).includes(<access>)`
        factory.createCallExpression(
          factory.createPropertyAccessExpression(
            factory.createParenthesizedExpression(
              factory.createAsExpression(
                factory.createArrayLiteralExpression(
                  values.map((v) => factory.createStringLiteral(v))
                ),
                factory.createTypeOperatorNode(
                  ts.SyntaxKind.ReadonlyKeyword,
                  factory.createArrayTypeNode(
                    factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
                  )
                )
              )
            ),
            'includes'
          ),
          undefined,
          [access]
        );

  const fn = factory.createFunctionDeclaration(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    undefined,
    `is${schemaName}`,
    undefined,
    [factory.createParameterDeclaration(undefined, undefined, 'value', undefined, paramType)],
    factory.createTypePredicateNode(
      undefined,
      'value',
      factory.createTypeReferenceNode(schemaName)
    ),
    factory.createBlock([factory.createReturnStatement(check)], true)
  );

  return jsdoc(
    fn,
    `Narrow a \`${unionLabel}\` to \`${schemaName}\` via its \`${propertyName}\` discriminant.`
  );
}

/**
 * Detect an implicit discriminator: every member is a ref to a named schema,
 * and they all pin one shared property to a distinct string literal. Returns
 * `undefined` if no such property exists (so the union is left without guards).
 */
function detectImplicitDiscriminator(
  union: Extract<SchemaModel, { kind: 'union' }>,
  byName: Map<string, SchemaModel>
): DiscriminatorModel | undefined {
  const memberNames: string[] = [];
  for (const member of union.members) {
    if (member.kind !== 'ref') return undefined;
    const target = byName.get(member.name);
    if (!target) return undefined;
    memberNames.push(member.name);
  }
  if (memberNames.length < 2) return undefined;

  const literalsPerMember = memberNames.map((name) => literalPropsOf(byName.get(name)!));

  for (const propName of Object.keys(literalsPerMember[0])) {
    if (!literalsPerMember.every((props) => propName in props)) continue;
    const values = literalsPerMember.map((props) => props[propName]);
    if (!values.every((v): v is string => typeof v === 'string')) continue;
    if (new Set(values).size !== values.length) continue;
    return {
      propertyName: propName,
      mapping: memberNames.map((name, i) => ({
        value: values[i] as string,
        schemaName: name,
      })),
    };
  }
  return undefined;
}

/**
 * Collect a schema's literal-valued properties (name → const value), descending
 * through `intersection` members (the shape `allOf` produces). Only inline
 * object/intersection members are inspected; nested refs are not resolved.
 */
function literalPropsOf(schema: SchemaModel): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  const collect = (s: SchemaModel): void => {
    if (s.kind === 'object') {
      for (const prop of s.properties) {
        if (prop.schema.kind === 'literal') out[prop.name] = prop.schema.value;
      }
    } else if (s.kind === 'intersection') {
      for (const member of s.members) collect(member);
    }
  };
  collect(schema);
  return out;
}

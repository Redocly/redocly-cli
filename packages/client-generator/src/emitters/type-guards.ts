import type {
  DiscriminatorModel,
  NamedSchemaModel,
  SchemaModel,
} from '../intermediate-representation/model.js';

/**
 * A discriminated union we can emit guards for, found while walking the schema
 * tree. `label` is the guard's `value` parameter type — the union's name for a
 * top-level union (`MenuItem`), the inline member union (`SuccessItem | ErrorItem`)
 * for one nested inside another schema.
 */
type UnionSite = {
  union: Extract<SchemaModel, { kind: 'union' }>;
  label: string;
};

/** `is<Member>(value): value is <Member>` guards for every discriminated union (explicit or implicit). */
export function renderTypeGuards(schemas: NamedSchemaModel[]): string {
  const byName = new Map(schemas.map((s) => [s.name, s.schema] as const));
  const blocks: string[] = [];
  const emitted = new Set<string>();
  for (const named of schemas) {
    for (const site of collectUnionSites(named)) {
      const discriminator =
        site.union.discriminator ?? detectImplicitDiscriminator(site.union, byName);
      if (!discriminator) continue;
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
        const access = `(value as Record<string, unknown>)[${JSON.stringify(discriminator.propertyName)}]`;
        const check =
          values.length === 1
            ? `${access} === ${JSON.stringify(values[0])}`
            : `([${values.map((value) => JSON.stringify(value)).join(', ')}] as readonly unknown[]).includes(${access})`;
        blocks.push(
          [
            '/**',
            ` * Narrow a \`${site.label}\` to \`${schemaName}\` via its \`${discriminator.propertyName}\` discriminant.`,
            ' */',
            `export function ${guardName}(value: ${site.label}): value is ${schemaName} {`,
            `    return ${check};`,
            '}',
          ].join('\n')
        );
      }
    }
  }
  return blocks.join('\n\n');
}

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
    sites.push({ union: root, label: named.name });
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
        sites.push({ union: schema, label: names.join(' | ') });
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

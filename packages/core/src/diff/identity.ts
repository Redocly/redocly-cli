import type { IdentityFn, NodeEntry } from '../node-map/types.js';
import { escapePointerFragment } from '../ref-utils.js';

const TEMPLATE_EXPRESSION = /\{[^}]+\}/g;

// "Templated paths with the same hierarchy but different templated names MUST NOT exist
// as they are identical" (OpenAPI, Paths Object) — the shape is the identity, the names are not.
function templateShape(template: string): string {
  let position = 0;
  return template.replace(TEMPLATE_EXPRESSION, () => `{${position++}}`);
}

function templateParameterNames(template: string): string[] {
  return [...template.matchAll(TEMPLATE_EXPRESSION)].map(([expression]) => expression.slice(1, -1));
}

// "If `in` is 'path', the `name` field MUST correspond to a template expression occurring
// within the path" (OpenAPI, Parameter Object) — so the position of that expression is the
// identity. A name the template does not contain (an invalid document, or a callback whose
// key is a runtime expression) falls back to the name.
function pathParameterIdentity(name: string, ancestors: NodeEntry[]): string {
  const template = ancestors.findLast((entry) => entry.typeName === 'PathItem')?.properties.path;
  const position =
    typeof template === 'string' ? templateParameterNames(template).indexOf(name) : -1;
  return position === -1 ? `{path:${escapePointerFragment(name)}}` : `{path:${position}}`;
}

type ListItemIdentity = (
  node: Record<string, unknown>,
  ancestors: NodeEntry[]
) => string | undefined;

// Identity segments for list items that have a natural identity; everything else keeps
// its position. Each part is pointer-escaped so a `/` inside a name cannot forge a level.
const LIST_ITEM_IDENTITIES: Record<string, ListItemIdentity> = {
  Parameter: (parameter, ancestors) => {
    if (typeof parameter.in !== 'string' || typeof parameter.name !== 'string') return undefined;
    return parameter.in === 'path'
      ? pathParameterIdentity(parameter.name, ancestors)
      : `{${escapePointerFragment(parameter.in)}:${escapePointerFragment(parameter.name)}}`;
  },
  Server: (server) =>
    typeof server.url === 'string' ? `{${escapePointerFragment(server.url)}}` : undefined,
  Tag: (tag) => (typeof tag.name === 'string' ? `{${escapePointerFragment(tag.name)}}` : undefined),
  SecurityRequirement: (requirement) =>
    `{${Object.keys(requirement).sort().map(escapePointerFragment).join('+')}}`,
};

export const identityOf: IdentityFn = (node, { typeName, key, parent, ancestors }) => {
  if (Array.isArray(parent)) {
    const segment = LIST_ITEM_IDENTITIES[typeName]?.(node, ancestors);
    return segment === undefined ? undefined : { segment };
  }
  if (
    typeName === 'PathItem' &&
    ancestors.at(-1)?.typeName === 'Paths' &&
    typeof key === 'string'
  ) {
    return { segment: escapePointerFragment(templateShape(key)), properties: { path: key } };
  }
  return undefined;
};

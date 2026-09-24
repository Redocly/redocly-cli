import { enclosing, fieldOf, valueOf } from '../../node-tree/access.js';
import type { NodeEntry } from '../../node-tree/types.js';
import { escapePointerFragment } from '../../ref-utils.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import { templateParameterNames, templateShape } from '../../utils/path-template.js';
import { opposite } from '../direction.js';
import type { Direction, Directions, Identities } from '../types.js';

export const oas3Identities: Identities = {
  Paths: pathIdentity,
  ParameterList: parameterIdentity,
  ServerList: (server) => named(fieldOf(server, 'url')),
  TagList: (tag) => named(fieldOf(tag, 'name')),
  SecurityRequirementList: schemeNamesIdentity,
};

export const oas3Directions: Directions = {
  RequestBody: side('request'),
  ParameterList: side('request'),
  Parameter: side('request'),
  Responses: side('response'),
  Response: side('response'),
};

/**
 * The data a node describes travels `direction` — the other way round under a callback or a
 * webhook, which the API sends to the consumer itself. A component is compared at its own
 * place, so its position says nothing and only the sites that reference it tell.
 */
function side(direction: Direction) {
  return (node: NodeEntry): Direction | undefined => {
    if (enclosing(node, 'Components')) return undefined;
    const sentByApi = enclosing(node, 'CallbacksMap') ?? enclosing(node, 'WebhooksMap');
    return sentByApi ? opposite(direction) : direction;
  };
}

// "Templated paths with the same hierarchy but different templated names MUST NOT exist
// as they are identical" (OpenAPI, Paths Object) — the shape is the identity, the names are not.
function pathIdentity(path: NodeEntry): string {
  return escapePointerFragment(templateShape(String(path.key)));
}

function parameterIdentity(parameter: NodeEntry): string | undefined {
  const location = fieldOf(parameter, 'in');
  const name = fieldOf(parameter, 'name');
  if (typeof location !== 'string' || typeof name !== 'string') return undefined;
  return location === 'path'
    ? pathParameterSegment(name, parameter)
    : `{${escapePointerFragment(location)}:${escapePointerFragment(name)}}`;
}

/**
 * "If `in` is 'path', the `name` field MUST correspond to a template expression occurring
 * within the path" (OpenAPI, Parameter Object) — so the position of that expression is the
 * identity. A name the template does not contain (an invalid document, or a callback whose
 * key is a runtime expression) falls back to the name.
 */
function pathParameterSegment(name: string, parameter: NodeEntry): string {
  const pathTemplate = String(enclosing(parameter, 'PathItem')?.key ?? '');
  const position = templateParameterNames(pathTemplate).indexOf(name);
  return position === -1 ? `{path:${escapePointerFragment(name)}}` : `{path:${position}}`;
}

function schemeNamesIdentity(requirement: NodeEntry): string | undefined {
  const value = valueOf(requirement);
  if (!isPlainObject(value)) return undefined;
  return `{${Object.keys(value).sort().map(escapePointerFragment).join('+')}}`;
}

function named(value: unknown): string | undefined {
  return typeof value === 'string' ? `{${escapePointerFragment(value)}}` : undefined;
}

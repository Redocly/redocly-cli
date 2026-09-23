import type { NodeEntry } from '../../node-map/types.js';
import { escapePointerFragment } from '../../ref-utils.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import { templateParameterNames, templateShape } from '../../utils/path-template.js';
import type { DiffSpec, Direction, NodeIdentity } from '../types.js';
import { opposite } from './direction.js';

/**
 * Where the specification gives a node an identity of its own, the segment says it instead of
 * the position or the name the document happens to use.
 */
const identityByContainer: Record<string, (node: NodeEntry) => NodeIdentity | undefined> = {
  // "Templated paths with the same hierarchy but different templated names MUST NOT exist
  // as they are identical" (OpenAPI, Paths Object) — the shape is the identity, the names are not.
  Paths: (node) => ({
    segment: escapePointerFragment(templateShape(String(node.key))),
    values: { path: node.key },
  }),
  ParameterList: parameterIdentity,
  ServerList: (node) => named(stringField(node, 'url')),
  TagList: (node) => named(stringField(node, 'name')),
  SecurityRequirementList: (node) =>
    isPlainObject(node.value)
      ? { segment: `{${Object.keys(node.value).sort().map(escapePointerFragment).join('+')}}` }
      : undefined,
};

function parameterIdentity(node: NodeEntry): NodeIdentity | undefined {
  const location = stringField(node, 'in');
  const name = stringField(node, 'name');
  if (location === undefined || name === undefined) return undefined;
  return location === 'path'
    ? { segment: pathParameterSegment(name, node) }
    : { segment: `{${escapePointerFragment(location)}:${escapePointerFragment(name)}}` };
}

/**
 * "If `in` is 'path', the `name` field MUST correspond to a template expression occurring
 * within the path" (OpenAPI, Parameter Object) — so the position of that expression is the
 * identity. A name the template does not contain (an invalid document, or a callback whose
 * key is a runtime expression) falls back to the name.
 */
function pathParameterSegment(name: string, node: NodeEntry): string {
  const position = templateParameterNames(pathTemplateOf(node)).indexOf(name);
  return position === -1 ? `{path:${escapePointerFragment(name)}}` : `{path:${position}}`;
}

function pathTemplateOf(node: NodeEntry): string {
  for (let current = node.parent; current; current = current.parent) {
    if (current.type === 'PathItem') return String(current.key);
  }
  return '';
}

/**
 * The reusable component a node belongs to. Found structurally: the type tree marks the
 * container as `Components`, its children are the per-kind maps (`NamedSchemas`, …), and
 * their children are the components themselves.
 */
function componentRoot(node: NodeEntry): NodeEntry | undefined {
  for (let current: NodeEntry | null = node; current; current = current.parent) {
    if (current.parent?.parent?.type === 'Components') return current;
  }
  return undefined;
}

// Direction comes from the node types the type tree assigns, not from pointer text:
// a schema property named `responses` is a `Schema`, so it can never be mistaken
// for the `Responses` node that actually carries a direction.
const RESPONSE_TYPES = new Set(['Responses', 'Response']);
const REQUEST_TYPES = new Set(['RequestBody', 'Parameter', 'ParameterList']);

// A callback or a webhook is a request the API sends to the consumer, so every direction
// below it is flipped: its request body reaches the consumer the way a response does. Only
// the containing map is listed, never the entry inside it — counting both would flip twice.
const INVERTING_TYPES = new Set(['CallbacksMap', 'WebhooksMap']);

// Walking out to the root, the outermost answer wins and every inversion above it applies.
function positionDirection(node: NodeEntry): Direction {
  let direction: Direction = 'neutral';

  for (let current: NodeEntry | null = node; current; current = current.parent) {
    if (RESPONSE_TYPES.has(current.type)) direction = 'response';
    else if (REQUEST_TYPES.has(current.type)) direction = 'request';
    else if (INVERTING_TYPES.has(current.type)) direction = opposite(direction);
  }

  return direction;
}

export const oas3Spec: DiffSpec = {
  identityOf: (node, container) => identityByContainer[container]?.(node),
  referenceTarget: componentRoot,
  // A component is compared at its own place, so its direction comes from the sites that
  // reference it rather than from its own position.
  directionOf: (node, fromUsage) => {
    const component = componentRoot(node);
    return component ? fromUsage(component) : positionDirection(node);
  },
};

function stringField(node: NodeEntry, name: string): string | undefined {
  const value = isPlainObject(node.value) ? node.value[name] : undefined;
  return typeof value === 'string' ? value : undefined;
}

function named(value: string | undefined): NodeIdentity | undefined {
  return value === undefined ? undefined : { segment: `{${escapePointerFragment(value)}}` };
}

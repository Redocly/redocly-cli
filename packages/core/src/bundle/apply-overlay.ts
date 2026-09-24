import { paths, type JsonValue } from 'jsonpath-rfc9535';
import parseJsonPath from 'jsonpath-rfc9535/parser';
import * as path from 'node:path';

import { isAbsoluteUrl, isRef, type Location, unescapePointerFragment } from '../ref-utils.js';
import type { BaseResolver, Document } from '../resolve.js';
import { normalizeTypes } from '../types/index.js';
import { Overlay1Types } from '../types/overlay.js';
import type { ActionObject, Overlay1Definition } from '../typings/overlay.js';
import { getOwn } from '../utils/get-own.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import { slash } from '../utils/slash.js';
import { normalizeVisitors, type Overlay1Visitor } from '../visitors.js';
import {
  walkDocument,
  type NormalizedProblem,
  type UserContext,
  type WalkContext,
} from '../walk.js';

type Match = { jsonPath: string; keys: (string | number)[] };
type Container = Record<string | number, unknown>;

const REUSABLE_ACTION_PREFIX = '#/components/actions/';

export function applyOverlay(
  document: Document,
  overlay: Document<Overlay1Definition>,
  externalRefResolver: BaseResolver
): NormalizedProblem[] {
  const types = normalizeTypes(Overlay1Types);
  const ctx: WalkContext = { problems: [], specVersion: 'overlay1', visitorsData: {} };
  // Bundling can place one object at several paths, so actions change copies (see `ownPath`).
  const ownedNodes = new Set<unknown>();
  const { $self, components } = overlay.parsed;
  const overlayBase =
    typeof $self === 'string'
      ? externalRefResolver.resolveExternalRef(overlay.source.absoluteRef, $self)
      : overlay.source.absoluteRef;

  const applyAction = (action: ActionObject, location: Location, report: UserContext['report']) => {
    const select = (field: 'target' | 'copy') => {
      const expression = action[field];
      if (typeof expression !== 'string') {
        report({
          message: `The \`${field}\` field must be a JSONPath expression.`,
          location: location.child([field]),
        });
        return undefined;
      }
      try {
        return selectNodes(document.parsed, expression);
      } catch (error) {
        report({
          message: `Invalid JSONPath expression: ${error.message}`,
          location: location.child([field]),
        });
        return undefined;
      }
    };

    const targets = select('target');
    if (!targets) return;

    if (action.remove === true) {
      if (targets.some(({ keys }) => keys.length === 0)) {
        report({
          message: 'Cannot remove the root of the document.',
          location: location.child(['target']),
        });
        return;
      }
      removeNodes(document.parsed, targets, ownedNodes);
      return;
    }

    // The specification lets neither field take effect when both are set.
    if (action.update !== undefined && action.copy !== undefined) {
      report({ message: "An action can't have both `update` and `copy`.", location });
      return;
    }

    let value: unknown;
    let valueField: 'update' | 'copy';
    if (action.copy === undefined) {
      value = structuredClone(action.update);
      valueField = 'update';
      rebaseRefs(value, (uri) => {
        const target = externalRefResolver.resolveExternalRef(overlayBase, uri);
        const documentRef = document.source.absoluteRef;
        return isAbsoluteUrl(target) || isAbsoluteUrl(documentRef)
          ? target
          : slash(path.relative(path.dirname(documentRef), target));
      });
    } else {
      const sources = select('copy');
      if (!sources) return;
      if (sources.length !== 1) {
        report({
          message: `The copy expression must select exactly one node, but it selected ${sources.length}.`,
          location: location.child(['copy']),
        });
        return;
      }
      value = getNode(document.parsed, sources[0].keys);
      valueField = 'copy';
    }
    if (value === undefined) return;

    for (const target of targets) {
      const error = updateNode(document.parsed, target, value, ownedNodes);
      if (error) {
        report({ message: error, location: location.child([valueField]) });
        return;
      }
    }
  };

  const visitor: Overlay1Visitor = {
    Actions(actions, { report, location }) {
      if (!Array.isArray(actions)) {
        report({ message: 'The `actions` field must be a list.', location });
        return;
      }
      actions.forEach((item, index) => {
        if (!isPlainObject(item)) {
          report({ message: 'An action must be an object.', location: location.child([index]) });
          return;
        }
        if (!isRef(item)) {
          applyAction(item, location.child([index]), report);
          return;
        }
        const { $ref, ...reference } = item;
        const reusableAction = $ref.startsWith(REUSABLE_ACTION_PREFIX)
          ? getOwn(
              components?.actions ?? {},
              unescapePointerFragment($ref.slice(REUSABLE_ACTION_PREFIX.length))
            )
          : undefined;
        if (!reusableAction) {
          report({
            message: `Can't find the reusable action \`${$ref}\`.`,
            location: location.child([index, '$ref']),
          });
          return;
        }
        applyAction({ ...reusableAction.fields, ...reference }, location.child([index]), report);
      });
    },
  };

  walkDocument({
    document: overlay,
    rootType: types.Root,
    normalizedVisitors: normalizeVisitors(
      [{ severity: 'error', ruleId: 'overlay', visitor }],
      types
    ),
    // `$ref`s in overlay values are bundled with the document after the overlays are applied.
    resolvedRefMap: new Map(),
    ctx,
  });

  return ctx.problems;
}

function rebaseRefs(value: unknown, rebase: (uri: string) => string) {
  if (Array.isArray(value)) {
    for (const item of value) rebaseRefs(item, rebase);
  } else if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (key === '$ref' && typeof child === 'string') {
        const [uri, ...fragment] = child.split('#');
        // A reference with no file part points into the document itself.
        if (uri !== '') value.$ref = [rebase(uri), ...fragment].join('#');
      } else {
        rebaseRefs(child, rebase);
      }
    }
  }
}

function selectNodes(root: unknown, expression: string): Match[] {
  // The parsed document is JSON-compatible data.
  return paths(root as JsonValue, expression).map((jsonPath) => ({
    jsonPath,
    // A normalized path has one `['name']` or `[index]` selector per segment; parsing unescapes it.
    keys: parseJsonPath(jsonPath).segments.flatMap(({ node }) =>
      node.type === 'BracketedSelection'
        ? node.selectors.flatMap((selector) =>
            selector.type === 'NameSelector' || selector.type === 'IndexSelector'
              ? [selector.value]
              : []
          )
        : []
    ),
  }));
}

function updateNode(
  root: unknown,
  { jsonPath, keys }: Match,
  value: unknown,
  owned: Set<unknown>
): string | undefined {
  const node = getNode(root, keys);
  if (isPrimitive(node)) {
    if (!isPrimitive(value)) return incompatible(value, node, jsonPath);
    ownPath(root, keys.slice(0, -1), owned)[keys[keys.length - 1]] = value;
    return undefined;
  }

  const ownNode = ownPath(root, keys, owned);
  if (Array.isArray(ownNode)) {
    ownNode.push(...(Array.isArray(value) ? structuredClone(value) : [structuredClone(value)]));
    return undefined;
  }
  if (isPlainObject(value)) {
    return mergeObjects(ownNode, value, jsonPath, owned);
  }
  return incompatible(value, ownNode, jsonPath);
}

function mergeObjects(
  node: Container,
  value: Record<string, unknown>,
  jsonPath: string,
  owned: Set<unknown>
): string | undefined {
  for (const [key, source] of Object.entries(value)) {
    const existing = node[key];
    if (!Object.hasOwn(node, key)) {
      node[key] = structuredClone(source);
    } else if (isPlainObject(existing) && isPlainObject(source)) {
      const error = mergeObjects(
        ownPath(node, [key], owned),
        source,
        `${jsonPath}['${key}']`,
        owned
      );
      if (error) return error;
    } else if (Array.isArray(existing) && Array.isArray(source)) {
      node[key] = [...existing, ...structuredClone(source)];
    } else if (isPrimitive(existing) && isPrimitive(source)) {
      node[key] = source;
    } else {
      return incompatible(source, existing, `${jsonPath}['${key}']`);
    }
  }
  return undefined;
}

function removeNodes(root: unknown, targets: Match[], owned: Set<unknown>) {
  const locations = targets.map(({ keys }) => ({
    parent: ownPath(root, keys.slice(0, -1), owned),
    key: keys[keys.length - 1],
  }));
  // Remove array items from the highest index down, so earlier removals don't shift later ones.
  const arrayIndex = (key: string | number) => (typeof key === 'number' ? key : -1);
  locations.sort((a, b) => arrayIndex(b.key) - arrayIndex(a.key));

  for (const { parent, key } of locations) {
    if (Array.isArray(parent)) {
      parent.splice(key as number, 1);
    } else {
      delete parent[key];
    }
  }
}

function getNode(root: unknown, keys: (string | number)[]) {
  // JSONPath matched every key, so each step is an object or an array.
  return keys.reduce((node, key) => (node as Container)[key], root);
}

function ownPath(root: unknown, keys: (string | number)[], owned: Set<unknown>): Container {
  let node = root as Container;
  for (const key of keys) {
    if (!owned.has(node[key])) {
      const copy = Object.assign(Array.isArray(node[key]) ? [] : {}, node[key]);
      owned.add(copy);
      node[key] = copy;
    }
    node = node[key] as Container;
  }
  return node;
}

function isPrimitive(value: unknown) {
  return !isPlainObject(value) && !Array.isArray(value);
}

function incompatible(value: unknown, node: unknown, jsonPath: string) {
  const kind = (item: unknown) =>
    item === null ? 'null' : Array.isArray(item) ? 'array' : typeof item;
  return `Cannot apply ${kind(value)} to ${kind(node)} at ${jsonPath}.`;
}

import { ancestorChain, getComponentRoot, type NodeLookup } from '../node-map/chain.js';
import type { NodeEntry } from '../node-map/types.js';
import type { Direction } from './types.js';
import type { UsageIndex } from './usage.js';

/** How one specification family decides which way the data in a node travels. */
export type DirectionResolver = (key: string, usage: UsageIndex, lookup: NodeLookup) => Direction;

function opposite(direction: Direction): Direction {
  if (direction === 'request') return 'response';
  if (direction === 'response') return 'request';
  return direction;
}

// Direction comes from the node types the type tree assigns, not from pointer text:
// a schema property named `responses` is a `Schema`, so it can never be mistaken
// for the `Responses` node that actually carries a direction.
const RESPONSE_TYPES = new Set(['Responses', 'Response']);
const REQUEST_TYPES = new Set(['RequestBody', 'Parameter', 'ParameterList']);

// A callback or a webhook is a request the API sends to the consumer, so every
// direction below it is flipped: its request body reaches the consumer the way a
// response does, and its responses travel back the way a request does.
// Only the containing map is listed, never the entry inside it — a callback path
// runs through `CallbacksMap` and then `Callback`, and counting both would flip
// twice and land back where it started. One entry per nesting level keeps a
// callback declared inside a callback pointing the right way.
const INVERTING_TYPES = new Set(['CallbacksMap', 'WebhooksMap']);

function getOas3SiteDirection(key: string, lookup: NodeLookup): Direction {
  let inverted = false;

  for (const { typeName } of ancestorChain(key, lookup)) {
    if (INVERTING_TYPES.has(typeName)) {
      inverted = !inverted;
    } else if (RESPONSE_TYPES.has(typeName)) {
      return inverted ? 'request' : 'response';
    } else if (REQUEST_TYPES.has(typeName)) {
      return inverted ? 'response' : 'request';
    }
  }

  return 'neutral';
}

export const getOas3Direction: DirectionResolver = (key, usage, lookup) => {
  // A component is compared at its own path, so its direction comes from the
  // sites that reference it rather than from its own position.
  const componentRoot = getComponentRoot(key, lookup);
  if (componentRoot) {
    return usage.directionOf(componentRoot, (site) => getOas3SiteDirection(site, lookup));
  }

  return getOas3SiteDirection(key, lookup);
};

/**
 * `receive` means another application produces the message, so its payload is judged
 * the way a request body is; `send` means this application produces it, so its payload
 * is judged the way a response is.
 */
function actionDirection(action: unknown): Direction {
  if (action === 'receive') return 'request';
  if (action === 'send') return 'response';
  return 'neutral';
}

function getOperationDirection(chain: NodeEntry[]): Direction {
  const operation = [...chain].reverse().find((entry) => entry.typeName === 'Operation');
  if (!operation) return 'neutral';

  const direction = actionDirection(operation.properties.action);
  // A reply answers the operation, so it travels back the other way.
  const underReply = chain.some((entry) => entry.typeName === 'OperationReply');
  return underReply ? opposite(direction) : direction;
}

/**
 * AsyncAPI declares the direction instead of implying it from the position, so the
 * `action` of the operation decides it. Channels and their messages sit outside the
 * operations, so their direction comes from every operation that references them.
 */
export const getAsync3Direction: DirectionResolver = (key, usage, lookup) =>
  resolveAsync3Direction(key, usage, lookup, new Set());

function resolveAsync3Direction(
  key: string,
  usage: UsageIndex,
  lookup: NodeLookup,
  resolving: Set<string>
): Direction {
  // A payload that refers back into its own channel would otherwise resolve forever.
  if (resolving.has(key)) return 'neutral';
  resolving.add(key);

  const chain = ancestorChain(key, lookup);
  const own = getOperationDirection(chain);
  if (own !== 'neutral') return own;

  // The nearest referenced ancestor wins: a change deep inside a payload is only
  // reachable through the message or channel that holds it.
  for (const entry of [...chain].reverse()) {
    const direction = usage.directionOf(entry.key, (site) =>
      resolveAsync3Direction(site, usage, lookup, resolving)
    );
    if (direction !== 'neutral') return direction;
  }

  return 'neutral';
}

import type { NodeEntry, Polarity } from '../types.js';
import { ancestorChain, type NodeLookup } from './chain.js';
import { getComponentRoot, type UsageIndex } from './usage.js';

/** How one specification family decides which way the data in a node travels. */
export type PolarityResolver = (pointer: string, usage: UsageIndex, lookup: NodeLookup) => Polarity;

function opposite(polarity: Polarity): Polarity {
  if (polarity === 'request') return 'response';
  if (polarity === 'response') return 'request';
  return polarity;
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

function getOas3SitePolarity(pointer: string, lookup: NodeLookup): Polarity {
  let inverted = false;

  for (const { typeName } of ancestorChain(pointer, lookup)) {
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

export const getOas3Polarity: PolarityResolver = (pointer, usage, lookup) => {
  // A component is compared at its own path, so its direction comes from the
  // sites that reference it rather than from its own position.
  const componentRoot = getComponentRoot(pointer, lookup);
  if (componentRoot) {
    return usage.polarityOf(componentRoot, (site) => getOas3SitePolarity(site, lookup));
  }

  return getOas3SitePolarity(pointer, lookup);
};

/**
 * `receive` means another application produces the message, so its payload is judged
 * the way a request body is; `send` means this application produces it, so its payload
 * is judged the way a response is.
 */
function actionPolarity(action: unknown): Polarity {
  if (action === 'receive') return 'request';
  if (action === 'send') return 'response';
  return 'neutral';
}

function getOperationPolarity(chain: NodeEntry[]): Polarity {
  const operation = [...chain].reverse().find((entry) => entry.typeName === 'Operation');
  if (!operation) return 'neutral';

  const polarity = actionPolarity(operation.scalars.action);
  // A reply answers the operation, so it travels back the other way.
  const underReply = chain.some((entry) => entry.typeName === 'OperationReply');
  return underReply ? opposite(polarity) : polarity;
}

/**
 * AsyncAPI declares the direction instead of implying it from the position, so the
 * `action` of the operation decides it. Channels and their messages sit outside the
 * operations, so their direction comes from every operation that references them.
 */
export const getAsync3Polarity: PolarityResolver = (pointer, usage, lookup) =>
  resolveAsync3Polarity(pointer, usage, lookup, new Set());

function resolveAsync3Polarity(
  pointer: string,
  usage: UsageIndex,
  lookup: NodeLookup,
  resolving: Set<string>
): Polarity {
  // A payload that refers back into its own channel would otherwise resolve forever.
  if (resolving.has(pointer)) return 'neutral';
  resolving.add(pointer);

  const chain = ancestorChain(pointer, lookup);
  const own = getOperationPolarity(chain);
  if (own !== 'neutral') return own;

  // The nearest referenced ancestor wins: a change deep inside a payload is only
  // reachable through the message or channel that holds it.
  for (const entry of [...chain].reverse()) {
    const polarity = usage.polarityOf(entry.pointer, (site) =>
      resolveAsync3Polarity(site, usage, lookup, resolving)
    );
    if (polarity !== 'neutral') return polarity;
  }

  return 'neutral';
}

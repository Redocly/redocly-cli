import type { Polarity } from '../types.js';
import { ancestorChain, type NodeLookup } from './chain.js';
import { getComponentRoot, type UsageIndex } from './usage.js';

// Direction comes from the node types the type tree assigns, not from pointer text:
// a schema property named `responses` is a `Schema`, so it can never be mistaken
// for the `Responses` node that actually carries a direction.
const RESPONSE_TYPES = new Set(['Responses', 'Response']);
const REQUEST_TYPES = new Set(['RequestBody', 'Parameter', 'ParameterList']);

// A callback or a webhook is a request the API sends to the consumer, so every
// direction below it is flipped: its request body reaches the consumer the way a
// response does, and its responses travel back the way a request does.
const INVERTING_TYPES = new Set(['Callback', 'CallbacksMap', 'WebhooksMap']);

function getSitePolarity(pointer: string, lookup: NodeLookup): Polarity {
  let inverted = false;

  for (const { typeName } of ancestorChain(pointer, lookup)) {
    if (INVERTING_TYPES.has(typeName)) {
      inverted = true;
    } else if (RESPONSE_TYPES.has(typeName)) {
      return inverted ? 'request' : 'response';
    } else if (REQUEST_TYPES.has(typeName)) {
      return inverted ? 'response' : 'request';
    }
  }

  return 'neutral';
}

export function getPolarity(pointer: string, usage: UsageIndex, lookup: NodeLookup): Polarity {
  // A component is compared at its own path, so its direction comes from the
  // sites that reference it rather than from its own position.
  const componentRoot = getComponentRoot(pointer, lookup);
  if (componentRoot) {
    return usage.polarityOf(componentRoot, (site) => getSitePolarity(site, lookup));
  }

  return getSitePolarity(pointer, lookup);
}

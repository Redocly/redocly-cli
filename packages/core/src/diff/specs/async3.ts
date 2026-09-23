import { enclosing, fieldOf } from '../../node-map/access.js';
import type { NodeEntry } from '../../node-map/types.js';
import type { DiffSpec, Direction } from '../types.js';
import { opposite } from './direction.js';

/**
 * `receive` means another application produces the message, so its payload is judged the way
 * a request body is; `send` means this application produces it, so it is judged as a response.
 */
function actionDirection(action: unknown): Direction {
  if (action === 'receive') return 'request';
  if (action === 'send') return 'response';
  return 'neutral';
}

function operationDirection(node: NodeEntry): Direction {
  const operation = enclosing(node, 'Operation');
  if (!operation) return 'neutral';

  const direction = actionDirection(fieldOf(operation, 'action'));
  // A reply answers the operation, so it travels back the other way.
  return enclosing(node, 'OperationReply') ? opposite(direction) : direction;
}

export const async3Spec: DiffSpec = {
  // Channels, messages and operations are named maps, so the node's own key is its identity.
  identityOf: () => undefined,
  // Channels and their messages sit outside the operations, so a change deep inside a payload
  // is answered by the nearest ancestor an operation references.
  directionOf: (node, fromUsage) => {
    const own = operationDirection(node);
    if (own !== 'neutral') return own;

    for (let current: NodeEntry | null = node; current; current = current.parent) {
      const direction = fromUsage(current);
      if (direction !== 'neutral') return direction;
    }
    return 'neutral';
  },
};

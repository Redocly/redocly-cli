import { enclosing, fieldOf } from '../../node-tree/access.js';
import { opposite } from '../direction.js';
import type { Direction, Directions } from '../types.js';

/**
 * `receive` means another application produces the message, so its payload is judged the way
 * a request body is; `send` means this application produces it, so it is judged as a response.
 */
function actionDirection(action: unknown): Direction | undefined {
  if (action === 'receive') return 'request';
  if (action === 'send') return 'response';
  return undefined;
}

// Channels and their messages sit outside the operations, so they take the direction of the
// operations that reference them.
export const async3Directions: Directions = {
  Operation: (operation) => actionDirection(fieldOf(operation, 'action')),
  // A reply answers the operation, so it travels back the other way.
  OperationReply: (reply) => {
    const direction = actionDirection(fieldOf(enclosing(reply, 'Operation'), 'action'));
    return direction && opposite(direction);
  },
};

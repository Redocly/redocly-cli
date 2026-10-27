import { enclosing, fieldOf } from '../node-tree/access.js';
import type { NodeEntry } from '../node-tree/types.js';
import { comparedSidesOf } from './diff-node.js';
import type { DiffNode, Direction } from './types.js';

const bothDirections: Direction[] = ['request', 'response'];

/** Empty for data that travels neither way, such as `info` or a component nothing references. */
export function directionsOf(node: DiffNode): Direction[] {
  const directions = directionsIn(node.revision ? 'revision' : 'base', node, new Set());

  return bothDirections.filter((direction) => directions.includes(direction));
}

function directionsIn(
  side: 'base' | 'revision',
  node: DiffNode,
  visited: Set<DiffNode>
): Direction[] {
  // Each place is asked once, which also ends the climb through a component that references itself.
  if (visited.has(node)) return [];
  visited.add(node);

  // Only pairs have children or other places that reach them, so every place climbed has `side`.
  const own = ownDirection(comparedSidesOf(node)[side]!) ?? ownDirection(node[side]!);
  if (own) return [own];

  return [node.parent, ...node.referencedBy].flatMap((place) =>
    place ? directionsIn(side, place, visited) : []
  );
}

function ownDirection(node: NodeEntry): Direction | undefined {
  switch (node.type.name) {
    case 'RequestBody':
    case 'ParameterList':
      return directionAt(node, 'request');
    case 'Responses':
      return directionAt(node, 'response');
    // "readOnly" data only comes from the API and "writeOnly" data only goes to it (OpenAPI,
    // Schema Object), wherever the schema is used.
    case 'Schema':
      if (fieldOf(node, 'readOnly') === true) return 'response';
      if (fieldOf(node, 'writeOnly') === true) return 'request';
      return undefined;
    // AsyncAPI 3: `receive` means another application produces the message, so its payload is
    // judged the way a request body is; `send` means this application produces it. An OpenAPI
    // operation has no `action`, so it says nothing.
    case 'Operation':
      return actionDirection(fieldOf(node, 'action'));
    // A reply answers the operation, so it travels back the other way.
    case 'OperationReply': {
      const direction = actionDirection(fieldOf(enclosing(node, 'Operation'), 'action'));
      return direction && opposite(direction);
    }
    default:
      return undefined;
  }
}

// Outside `components`, every `Parameter` sits under a `ParameterList` and every `Response`
// under `Responses`, so the lists carry the direction. Under a callback or a webhook the API
// sends the request itself, so it is the other way round.
function directionAt(node: NodeEntry, direction: Direction): Direction | undefined {
  if (enclosing(node, 'Components')) return undefined;
  const sentByApi = enclosing(node, 'CallbacksMap') ?? enclosing(node, 'WebhooksMap');
  return sentByApi ? opposite(direction) : direction;
}

function actionDirection(action: unknown): Direction | undefined {
  if (action === 'receive') return 'request';
  if (action === 'send') return 'response';
  return undefined;
}

function opposite(direction: Direction): Direction {
  return direction === 'request' ? 'response' : 'request';
}

import { Oas3Decorator, Oas2Decorator } from '../../visitors';
import { isEmptyArray, isEmptyObject } from '../../utils';

const DEFAULT_HIDDEN_TAG = 'x-internal';
const HIDDEN_TYPES = [
  'PathItem',
  'Operation',
  'Schema',
  'Response',
  'RequestBody',
  'Example',
  'MediaType',
  'Server',
  'Callback',
  'Parameter',
];

export const HideInternals: Oas3Decorator | Oas2Decorator = ({ tagToHide }) => {
  const hiddenTag = tagToHide || DEFAULT_HIDDEN_TAG;

  function getKeysForRemove(obj: any) {
    const keysForRemove = [];
    for (const [key, value] of Object.entries(obj)) {
      if (isEmptyArray(value) || isEmptyObject(value)) {
        keysForRemove.push(key);
      }
    }
    return keysForRemove;
  }

  const enter = (node: any, { parent, key, ignoreRemoved }: any) => {
    if (node[hiddenTag]) {
      Array.isArray(parent) ? parent.splice(key as number, 1) : delete parent[key];
      ignoreRemoved();
    }
  }

  const leave = (node: any, { parent, key, ignoreRemoved }: any) => {
    const keysForRemove = getKeysForRemove(node);
    if (keysForRemove.length) {
      for (const rKey of keysForRemove) {
        delete parent[key][rKey];
        ignoreRemoved();
      }
    }
    if (isEmptyObject(node)) { delete parent[key]; ignoreRemoved(); }
  }

  const rootLeave = (root: any, { ignoreRemoved }: any) => {
    const keysForRemove = getKeysForRemove(root);
    if (keysForRemove.length) {
      for (const rKey of keysForRemove) {
        delete root[rKey];
        ignoreRemoved();
      }
    }
  }

  return Object.assign({},
    { DefinitionRoot: { leave: rootLeave } },
    ...HIDDEN_TYPES.map(type => ({ [type]: { enter, leave } })),
  );
}

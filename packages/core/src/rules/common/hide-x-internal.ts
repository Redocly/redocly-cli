import { Oas3Decorator, Oas2Decorator } from '../../visitors';
import { isEmptyArray, isEmptyObject, isPlainObject } from '../../utils';

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

export const HideXInternal: Oas3Decorator | Oas2Decorator = ({ tagToHide }) => {
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

  function removeInternal(node: any, { parent, key }: { parent: any, key: string }) {
    let didDelete = false;
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        if (node[i] && node[i][hiddenTag]) {
          node.splice(i, 1);
          didDelete = true;
          i--;
        }
      }
    } else if (isPlainObject(node)) {
      for (const key of Object.keys(node)) {
        if ((node as any)[key][hiddenTag]) {
          delete (node as any)[key];
          didDelete = true;
        }
      }
    }

    if (didDelete && (isEmptyObject(node) || isEmptyArray(node))) {
      delete parent[key];
    }
  }


  // const enter = (node: any, { parent, key, ignoreRemoved }: any) => {
  //   if (node[hiddenTag]) {
  //     Array.isArray(parent) ? parent.splice(key as number, 1) : delete parent[key];
  //     ignoreRemoved();
  //   }
  // }

  // const leave = (node: any, { parent, key, ignoreRemoved }: any) => {
  //   const keysForRemove = getKeysForRemove(node);
  //   if (keysForRemove.length) {
  //     for (const rKey of keysForRemove) {
  //       delete parent[key][rKey];
  //       ignoreRemoved();
  //     }
  //   }
  //   if (isEmptyObject(node)) { delete parent[key]; ignoreRemoved(); }
  // }

  // const rootLeave = (root: any, { ignoreRemoved }: any) => {
  //   const keysForRemove = getKeysForRemove(root);
  //   if (keysForRemove.length) {
  //     for (const rKey of keysForRemove) {
  //       delete root[rKey];
  //       ignoreRemoved();
  //     }
  //   }
  // }

  // return Object.assign({},
  //   { DefinitionRoot: { leave: rootLeave } },
  //   ...HIDDEN_TYPES.map(type => ({ [type]: { enter, leave } })),
  // );

  return {
    any: {
      enter: (node, { parent, key }) => {
        removeInternal(node, { parent, key });
      }
    }
  }
}

import { isEmptyArray, isEmptyObject, isPlainObject } from '../../utils';
import { isRef } from '../../ref-utils';

import type { Oas3Decorator, Oas2Decorator } from '../../visitors';
import type { UserContext } from '../../walk';

const DEFAULT_INTERNAL_PROPERTY_NAME = 'x-internal';

export const RemoveXInternal: Oas3Decorator | Oas2Decorator = ({ internalFlagProperty }) => {
  const hiddenTag: string = internalFlagProperty || DEFAULT_INTERNAL_PROPERTY_NAME;

  function removeInternal(node: any, ctx: UserContext) {
    const { parent, key } = ctx;
    let didDelete = false;
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        if (isRef(node[i])) {
          const resolved = ctx.resolve(node[i]);
          if (resolved.node?.[hiddenTag]) {
            node.splice(i, 1);
            didDelete = true;
            i--;
          }
        }
        if (node[i]?.[hiddenTag]) {
          node.splice(i, 1);
          didDelete = true;
          i--;
        }
      }
    } else if (isPlainObject(node)) {
      for (const key of Object.keys(node)) {
        node = node as any;
        if (isRef(node[key])) {
          const resolved = ctx.resolve<any>(node[key]);
          if (resolved.node?.[hiddenTag]) {
            delete node[key];
            didDelete = true;
          }
        }
        if (node[key]?.[hiddenTag]) {
          delete node[key];
          didDelete = true;
        }
      }
    }

    if (didDelete && (isEmptyObject(node) || isEmptyArray(node))) {
      delete parent[key];
    }
  }

  return {
    any: {
      enter: (node, ctx) => {
        removeInternal(node, ctx);
      },
    },
  };
};

import { Oas3Decorator, Oas2Decorator } from '../../visitors';
import { isEmptyArray, isEmptyObject, isPlainObject } from '../../utils';
import { UserContext } from '../../walk';

const DEFAULT_INTERNAL_PROPERTY_NAME = 'x-internal';

export const RemoveXInternal: Oas3Decorator | Oas2Decorator = ({ internalFlagProperty }) => {
  const hiddenTag = internalFlagProperty || DEFAULT_INTERNAL_PROPERTY_NAME;

  function removeInternal(node: any, ctx: UserContext) {
    const { parent, key } = ctx;
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

  return {
    any: {
      enter: (node, ctx) => {
        removeInternal(node, ctx);
      }
    }
  }
}

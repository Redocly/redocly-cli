import { Oas3Decorator, Oas2Decorator } from '../../visitors';
import { isEmptyArray, isEmptyObject, isPlainObject } from '../../utils';
import { UserContext } from '../../walk';

const DEFAULT_PERMISSION_PROPERTY_NAME = 'x-internal';
const DEFAULT_PERMISSION_PROPERTY_VALUE = true;

export const FilterForPermission: Oas3Decorator | Oas2Decorator = ({ permissionProperty, permissionValue }) => {
  const permissionProp = permissionProperty || process.env.FILTER_BY_PERMISSION_PROPERTY || DEFAULT_PERMISSION_PROPERTY_NAME;
  const permissionVal = permissionValue || process.env.FILTER_BY_PERMISSION_VALUE || DEFAULT_PERMISSION_PROPERTY_VALUE;

  function isPermissionMatch(nodeProperty: any): boolean {
    return Array.isArray(nodeProperty)
      ? nodeProperty.includes(permissionVal)
      : nodeProperty === permissionVal;
  }

  function removeInternal(node: any, ctx: UserContext) {
    const { parent, key } = ctx;
    let didDelete = false;
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        if (node[i] && isPermissionMatch(node[i][permissionProp])) {
          node.splice(i, 1);
          didDelete = true;
          i--;
        }
      }
    } else if (isPlainObject(node)) {
      for (const key of Object.keys(node)) {
        if (isPermissionMatch((node as any)[key][permissionProp])) {
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

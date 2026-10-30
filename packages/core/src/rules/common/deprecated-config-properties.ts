import { parsePointer } from '../../ref-utils.js';
import { getOwn } from '../../utils/get-own.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import type { ConfigRule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

type DeprecatedProperty = {
  replacement: string;
  parents: string[]; // Paths, from the config root, of the objects in which the property is deprecated; `''` is the root.
};

const DEPRECATED_PROPERTIES: Record<string, DeprecatedProperty> = {
  reunite: { replacement: 'platform', parents: ['', 'rbac', 'access.rbac'] },
};

function rootPathOf(pointer: string): string {
  const segments = parsePointer(pointer.slice(2));
  const isInEnvEntry = segments[0] === 'env' && segments.length > 1;

  return (isInEnvEntry ? segments.slice(2) : segments).join('.');
}

export const DeprecatedConfigProperties: ConfigRule = () => {
  return {
    any(node: unknown, { report, location }: UserContext) {
      if (!isPlainObject(node)) return;

      const parentPath = rootPathOf(location.pointer);
      for (const key of Object.keys(node)) {
        const deprecated: DeprecatedProperty | undefined = getOwn(DEPRECATED_PROPERTIES, key);
        if (deprecated?.parents.includes(parentPath)) {
          report({
            message: `Property \`${key}\` is deprecated. Use \`${deprecated.replacement}\` instead.`,
            location: location.child([key]).key(),
          });
        }
      }
    },
  };
};

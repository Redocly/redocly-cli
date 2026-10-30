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

// Config node types are named after their schema path, and an `env` entry has the root properties.
function rootPathOf(typeName: string): string {
  if (typeName === 'ConfigRoot') return '';

  return typeName.replace(/^rootRedoclyConfigSchema\.(env_additionalProperties\.?)?/, '');
}

export const DeprecatedConfigProperties: ConfigRule = () => {
  return {
    any(node: unknown, { report, location, type }: UserContext) {
      if (!isPlainObject(node)) return;

      const parentPath = rootPathOf(type.name);
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

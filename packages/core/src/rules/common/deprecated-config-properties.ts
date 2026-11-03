import { isPlainObject } from '../../utils/is-plain-object.js';
import type { ConfigRule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const DeprecatedConfigProperties: ConfigRule = () => {
  return {
    any(node: unknown, { report, location, type }: UserContext) {
      if (!isPlainObject(node) || !type.deprecatedProperties) return;

      for (const key of Object.keys(node)) {
        if (!Object.hasOwn(type.deprecatedProperties, key)) continue;

        const replacement = type.deprecatedProperties[key].replacement
          ?.replace(/^\//, '')
          .replaceAll('/', '.');
        report({
          message: replacement
            ? `Property \`${key}\` is deprecated. Use \`${replacement}\` instead.`
            : `Property \`${key}\` is deprecated.`,
          location: location.child([key]).key(),
        });
      }
    },
  };
};

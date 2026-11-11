import { isPlainObject } from '../../utils/is-plain-object.js';
import type { Oas3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const NoAmbiguousComponentNames: Oas3Rule = () => {
  return {
    Components(components, { report, location }: UserContext) {
      for (const [section, componentMap] of Object.entries(components)) {
        if (section.startsWith('x-') || !isPlainObject(componentMap)) continue;

        const namesByNormalizedName = new Map<string, string>();
        for (const name of Object.keys(componentMap)) {
          const normalizedName = name.replace(/[-_.]/g, '').toLowerCase();
          const existingName = namesByNormalizedName.get(normalizedName);
          if (existingName === undefined) {
            namesByNormalizedName.set(normalizedName, name);
            continue;
          }
          report({
            message: `Component name "${name}" in "${section}" is ambiguous with "${existingName}". The names differ only in letter case or in the "-", "_", and "." characters.`,
            location: location.child([section, name]).key(),
            reference: 'https://redocly.com/docs/cli/rules/oas/no-ambiguous-component-names',
          });
        }
      }
    },
  };
};

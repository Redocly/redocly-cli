// Note: This is not a rule itself, but builder for XyzNameUnique rules.
import { Oas2Rule, Oas3Rule } from '../../visitors';
import { Oas3Definition } from '../../typings/openapi';
import { Oas2Definition } from '../../typings/swagger';
import { UserContext } from '../../walk';

export function buildNameUniqueRule(typeName: string): Oas3Rule | Oas2Rule {
  return () => {
    const components = new Map<string, Set<string>>();

    return {
      ref: {
        leave(ref, { type, resolve }) {
          if (type.name == typeName) {
            const resolvedRef = resolve(ref);
            if (!resolvedRef.location) return;

            const absoluteLocation = resolvedRef.location.absolutePointer.toString();
            const schemaName =
              absoluteLocation.endsWith('.yaml') || absoluteLocation.endsWith('.yml')
                ? absoluteLocation.split('/').slice(-1)[0]
                : absoluteLocation.split('/').slice(-2).join('/');

            if (resolvedRef.location.absolutePointer.endsWith('yaml')) {
              console.log(schemaName);
            }

            const locations = components.get(schemaName) ?? new Set();
            locations.add(absoluteLocation);
            components.set(schemaName, locations);
          }
        },
      },
      Root: {
        leave(root: Oas3Definition | Oas2Definition, ctx: UserContext) {
          components.forEach((value, key, _) => {
            if (value.size > 1) {
              const definitions = Array.from(value)
                .map((v) => `- ${v}`)
                .join('\n');
              ctx.report({
                message: `"${key}" is not unique. It is defined at:\n${definitions}`,
              });
            }
          });
        },
      },
    };
  };
}

// Note: This is not a rule itself, but builder for XyzNameUnique rules.
import { Oas2Rule, Oas3Rule, Oas3Visitor } from '../../visitors';
import { Oas3Definition, OasRef } from '../../typings/openapi';
import { Oas2Definition } from '../../typings/swagger';
import { UserContext } from '../../walk';

type AddComponentFromAbsoluteLocation = (absoluteLocation: string) => void;

export function buildNameUniqueRule(
  typeName: string,
  additionalBuilder?: (
    addComponentFromAbsoluteLocation: AddComponentFromAbsoluteLocation
  ) => Oas3Visitor
): Oas3Rule | Oas2Rule {
  return () => {
    const components = new Map<string, Set<string>>();

    function getComponentNameFromAbsoluteLocation(absoluteLocation: string): string {
      const componentName = absoluteLocation.split('/').slice(-1)[0];
      if (
        componentName.endsWith('.yml') ||
        componentName.endsWith('.yaml') ||
        componentName.endsWith('.json')
      ) {
        return componentName.slice(0, componentName.lastIndexOf('.'));
      }
      return componentName;
    }
    function addFoundComponent(componentName: string, absoluteLocation: string): void {
      const locations = components.get(componentName) ?? new Set();
      locations.add(absoluteLocation);
      components.set(componentName, locations);
    }

    function addComponentFromAbsoluteLocation(absoluteLocation: string): void {
      const componentName = getComponentNameFromAbsoluteLocation(absoluteLocation);
      addFoundComponent(componentName, absoluteLocation);
    }

    const rule = {
      ref: {
        leave(ref: OasRef, { type, resolve }: UserContext) {
          if (type.name == typeName) {
            const resolvedRef = resolve(ref);
            if (!resolvedRef.location) return;

            addComponentFromAbsoluteLocation(resolvedRef.location.absolutePointer.toString());
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
                message: `${typeName} '${key}' is not unique. It is defined at:\n${definitions}`,
              });
            }
          });
        },
      },
    };

    if (!additionalBuilder) return rule;

    return {
      ...rule,
      ...additionalBuilder(addComponentFromAbsoluteLocation),
    };
  };
}

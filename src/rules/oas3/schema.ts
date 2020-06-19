import type { OAS3Rule } from '../../visitors';
import { TypeTreeNode, PropSchema } from '../../types';
import { joinPointer, escapePointer } from '../../ref';

function isNamedType(t: TypeTreeNode | PropSchema | null | undefined): t is TypeTreeNode {
  return typeof t?.name === 'string';
}

function oasTypeOf(value: unknown) {
  return Array.isArray(value) ? 'array' : value === null ? null : typeof value;
}

export const OAS3Schema: OAS3Rule = () => {
  return {
    any(node: any, { report, type, location, key }) {
      const nodeType = oasTypeOf(node);
      if (type.items) {
        if (nodeType !== 'array') {
          report({
            message: `Expected type '${type.name} (array)' but got '${nodeType}'`,
          });
        }
        return;
      } else if (nodeType !== 'object') {
        report({
          message: `Expected type '${type.name} (object)' but got '${nodeType}'`,
        });
        return;
      }

      const required =
        typeof type.required === 'function' ? type.required(node, key) : type.required;
      for (let propName of required || []) {
        if (!(node as object).hasOwnProperty(propName)) {
          report({
            message: `The field '${propName}' must be present on this level.`,
            location: [{ reportOnKey: true }],
          });
        }
      }

      for (const propName of Object.keys(node)) {
        const propLocation = location.append([propName]);
        const propValue = node[propName];
        const propType =
          type.properties[propName] === undefined
            ? type.additionalProperties?.(propValue, propName)
            : type.properties[propName];
        const propSchema =
          typeof propType === 'function' ? propType(propValue, propName) : propType;

        const propValueType = oasTypeOf(propValue);

        if (isNamedType(propSchema)) {
          continue; // do nothing for named schema
        }

        if (propSchema === undefined) {
          if (propName.startsWith('x-')) continue;
          report({
            message: `Key '${propName}' is not expected here`,
            location: [{ ...propLocation, reportOnKey: true }],
          });
          continue;
        }

        if (propSchema === null) {
          continue; // just defined, no validation
        }

        if (propSchema.enum) {
          if (!propSchema.enum.includes(propValue)) {
            report({
              message: `'${propName}' can be one of following only: ${propSchema.enum
                .map((i) => `"${i}"`)
                .join(', ')}`,
            });
          }
        } else if (propSchema.type && propSchema.type !== propValueType) {
          report({
            message: `Expected type '${propSchema.type}' but got '${propValueType}'`,
            location: propLocation,
          });
        } else if (propValueType === 'array' && propSchema.items?.type) {
          const itemsType = propSchema.items?.type;
          for (let i = 0; i < propValue.length; i++) {
            const item = propValue[i];
            if (oasTypeOf(item) !== itemsType) {
              report({
                message: `Expected type '${itemsType}' but got '${oasTypeOf(item)}'`,
                location: propLocation.append([i]),
              });
            }
          }
        }
      }
    },
  };
};

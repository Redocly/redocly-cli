import type { Oas3Rule, Oas2Rule } from '../../visitors';
import { isNamedType } from '../../types';
import { oasTypeOf, matchesJsonSchemaType, getSuggest } from '../utils';
import { isRef } from '../../ref-utils';
import { isPlainObject } from '../../utils';

export const OasSpec: Oas3Rule | Oas2Rule = () => {
  return {
    any(node: any, { report, type, location, key, resolve, ignoreNextVisitorsOnNode } ) {
      const nodeType = oasTypeOf(node);

      if (type.items) {
        if (nodeType !== 'array') {
          report({
            message: `Expected type \`${type.name}\` (array) but got \`${nodeType}\``,
          });
          ignoreNextVisitorsOnNode();
        }
        return;
      } else if (nodeType !== 'object') {
        report({
          message: `Expected type \`${type.name}\` (object) but got \`${nodeType}\``,
        });
        ignoreNextVisitorsOnNode();
        return;
      }

      const required =
        typeof type.required === 'function' ? type.required(node, key) : type.required;

      for (let propName of required || []) {
        if (!(node as object).hasOwnProperty(propName)) {
          report({
            message: `The field \`${propName}\` must be present on this level.`,
            location: [{ reportOnKey: true }],
          });
        }
      }

      const allowed = type.allowed?.(node);
      if (allowed && isPlainObject(node)) {
        for (const propName in node) {
          if (allowed.includes(propName) ||
           (type.extensionsPrefix && propName.startsWith(type.extensionsPrefix)) ||
           !Object.keys(type.properties).includes(propName)
          ) {
            continue;
          }
          report({
            message: `The field \`${propName}\` is not allowed here.`,
            location: location.child([propName]).key()
          });
        }
      }

      const requiredOneOf = type.requiredOneOf || null;
      if (requiredOneOf) {
        let hasProperty = false;
        for (let propName of requiredOneOf || []) {
          if ((node as object).hasOwnProperty(propName)) {
            hasProperty = true;
          }
        }
        if (!hasProperty)
          report({
            message: `Must contain at least one of the following fields: ${type.requiredOneOf?.join(', ')}.`,
            location: [{ reportOnKey: true }],
          });
      }

      for (const propName of Object.keys(node)) {
        const propLocation = location.child([propName]);
        let propValue = node[propName];

        let propType = type.properties[propName];
        if (propType === undefined) propType = type.additionalProperties;
        if (typeof propType === 'function') propType = propType(propValue, propName);

        if (isNamedType(propType)) {
          continue; // do nothing for named schema, it is executed with the next any call
        }

        const propSchema = propType;
        const propValueType = oasTypeOf(propValue);

        if (propSchema === undefined) {
          if (propName.startsWith('x-')) continue;
          report({
            message: `Property \`${propName}\` is not expected here.`,
            suggest: getSuggest(propName, Object.keys(type.properties)),
            location: propLocation.key(),
          });
          continue;
        }

        if (propSchema === null) {
          continue; // just defined, no validation
        }

        if (propSchema.resolvable !== false && isRef(propValue)) {
          propValue = resolve(propValue).node;
        }

        if (propSchema.enum) {
          if (!propSchema.enum.includes(propValue)) {
            report({
              location: propLocation,
              message: `\`${propName}\` can be one of the following only: ${propSchema.enum
                .map((i) => `"${i}"`)
                .join(', ')}.`,
              suggest: getSuggest(propValue, propSchema.enum),
            });
          }
        } else if (propSchema.type && !matchesJsonSchemaType(propValue, propSchema.type, false)) {
          report({
            message: `Expected type \`${propSchema.type}\` but got \`${propValueType}\`.`,
            location: propLocation,
          });
        } else if (propValueType === 'array' && propSchema.items?.type) {
          const itemsType = propSchema.items?.type;
          for (let i = 0; i < propValue.length; i++) {
            const item = propValue[i];
            if (!matchesJsonSchemaType(item, itemsType, false)) {
              report({
                message: `Expected type \`${itemsType}\` but got \`${oasTypeOf(item)}\`.`,
                location: propLocation.child([i]),
              });
            }
          }
        }

        if (typeof propSchema.minimum === 'number') {
          if (propSchema.minimum > node[propName]) {
            report({
              message: `The value of the ${propName} field must be greater than or equal to ${propSchema.minimum}`,
              location: location.child([propName]),
            })
          }
        }
      }
    },
  };
};

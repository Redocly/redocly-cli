import { Oas3Decorator, Oas2Decorator } from '../../visitors';
import { UserContext } from '../../walk';
import { isPlainObject } from '../../utils';
const DEFAULT_HIDDEN_TAG = 'x-internal';

export const HideInternals: Oas3Decorator | Oas2Decorator = ({ hideTag }) => {
  const hiddenTag = hideTag || DEFAULT_HIDDEN_TAG;
  const hiddenTypes = [
    'PathItem',
    'SchemaProperties',
    'Parameter',
    'Response',
    'Examples',
    'MediaType',
    'Server',
    'Link',
    'Callback'
  ];
  return {
    any: {
      leave(node, { parent, key, type }: UserContext) {
        if (hiddenTypes.includes(type.name) && node[hiddenTag]) {
          if (type.name === 'SchemaProperties') {
            for (const propertyName of Object.keys(node)) {
              if (node[propertyName][hiddenTag]) { delete node[propertyName]; }
            }
          } else {
            if (isPlainObject(node)) { delete parent[key]; }
            if (Array.isArray(node)) { parent.splice(key, 1); }
          }
        }
        if (isPlainObject(node) && Object.keys(node).length === 0) { delete parent[key]; }
      },
    },
  }
};

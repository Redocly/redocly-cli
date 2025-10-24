import type { UserContext } from '../../walk.js';
import type { Oas3Rule } from '../../visitors.js';

const validKeyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MIN_KEY_LENGTH = 2;
const MAX_KEY_LENGTH = 150;

export const EntityKeyValid: Oas3Rule = () => {
  return {
    any(node: any, { report, location }: UserContext) {
      if (typeof node === 'object' && node !== null && 'key' in node) {
        const key = node.key;

        if (typeof key !== 'string') {
          report({
            message: 'Entity `key` must be a string.',
            location: location.child(['key']),
          });
          return;
        }

        if (key.length < MIN_KEY_LENGTH) {
          report({
            message: `Entity \`key\` must be at least ${MIN_KEY_LENGTH} characters long.`,
            location: location.child(['key']),
          });
        }

        if (key.length > MAX_KEY_LENGTH) {
          report({
            message: `Entity \`key\` must not exceed ${MAX_KEY_LENGTH} characters.`,
            location: location.child(['key']),
          });
        }

        if (!validKeyPattern.test(key)) {
          report({
            message:
              'Entity `key` must contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen.',
            location: location.child(['key']),
          });
        }
      }
    },
  };
};

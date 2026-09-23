import type { DiffRule } from '../types.js';

export const SecuritySchemeRemoved: DiffRule = () => ({
  SecurityScheme(change, { report }) {
    if (change.kind === 'removed') report({ message: 'A security scheme was removed.' });
  },
});

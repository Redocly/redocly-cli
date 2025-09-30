import { type NodeType } from './index.js';
import { Oas3_1Types } from './oas3_1.js';

const Tag: NodeType = {
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    externalDocs: 'ExternalDocs',
    'x-traitTag': { type: 'boolean' },
    'x-displayName': { type: 'string' }, // deprecated
    kind: { type: 'string' },
    parent: { type: 'string' },
    summary: { type: 'string' },
  },
  required: ['name'],
  extensionsPrefix: 'x-',
};

export const Oas3_2Types = {
  ...Oas3_1Types,
  Tag,
} as const;

import { type NodeType, type NormalizedScalarSchema, listOf } from '.';

const Root: NodeType = {
  properties: {
    overlay: { type: 'string' },
    info: 'Info',
    extends: { type: 'string' },
    actions: listOf('action'),
  },
  required: ['overlay', 'info', 'actions'],
  extensionsPrefix: 'x-',
};

const Info: NodeType = {
  properties: {
    title: { type: 'string' },
    version: { type: 'string' },
  },
  required: ['title', 'version'],
  extensionsPrefix: 'x-',
};

const Extends: NormalizedScalarSchema = {
  type: 'string',
  resolvable: true,
};

const Actions: NodeType = listOf('Action');
const Action: NodeType = {
  properties: {
    target: { type: 'string' },
    description: { type: 'string' },
    update: {}, // any
    remove: { type: 'boolean' },
  },
  required: ['target'],
  extensionsPrefix: 'x-',
};

export const OverlayTypes: Record<string, NodeType | NormalizedScalarSchema> = {
  Root,
  Info,
  Extends,
  Actions,
  Action,
};

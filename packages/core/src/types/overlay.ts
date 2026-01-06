import { type NodeType, listOf } from './index.js';

const Root: NodeType = {
  properties: {
    overlay: {
      type: 'string',
      description:
        'REQUIRED. This string MUST be the version number of the Overlay Specification that the Overlay document uses. The overlay field SHOULD be used by tooling to interpret the Overlay document.',
    },
    info: 'Info',
    extends: {
      type: 'string',
      description:
        'URI reference that identifies the target document (such as an [OpenAPI] document) this overlay applies to.',
    },
    actions: 'Actions',
  },
  required: ['overlay', 'info', 'actions'],
  extensionsPrefix: 'x-',
  documentationLink: 'https://spec.openapis.org/overlay/v1.0.0.html#overlay-object',
  description: 'This is the root object of the Overlay.',
};

const Info: NodeType = {
  properties: {
    title: {
      type: 'string',
      description: 'REQUIRED. A human readable description of the purpose of the overlay.',
    },
    version: {
      type: 'string',
      description: 'REQUIRED. A version identifer for indicating changes to the Overlay document.',
    },
  },
  required: ['title', 'version'],
  extensionsPrefix: 'x-',
  documentationLink: 'https://spec.openapis.org/overlay/v1.0.0.html#info-object',
  description:
    'The object provides metadata about the Overlay. The metadata MAY be used by the clients if needed.',
};

const Actions: NodeType = listOf('Action');
const Action: NodeType = {
  properties: {
    target: {
      type: 'string',
      description: 'REQUIRED A JSONPath expression selecting nodes in the target document.',
    },
    description: {
      type: 'string',
      description:
        'A description of the action. [CommonMark] syntax MAY be used for rich text representation.',
    },
    update: {}, // any
    remove: {
      type: 'boolean',
      description:
        'A boolean value that indicates that the target object or array MUST be removed from the the map or array it is contained in. The default value is false.',
    },
  },
  required: ['target'],
  extensionsPrefix: 'x-',
  documentationLink: 'https://spec.openapis.org/overlay/v1.0.0.html#action-object',
  description:
    'This object represents one or more changes to be applied to the target document at the location defined by the target JSONPath expression',
};

export const Overlay1Types: Record<string, NodeType> = {
  Root,
  Info,
  Actions,
  Action,
};

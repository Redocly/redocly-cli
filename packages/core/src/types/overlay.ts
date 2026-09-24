import { isRef } from '../ref-utils.js';
import { omit } from '../utils/omit.js';
import { type NodeType, mapOf } from './index.js';

const Root: NodeType = {
  properties: {
    overlay: {
      type: 'string',
      description:
        'REQUIRED. This string MUST be the version number of the Overlay Specification that the Overlay document uses. The overlay field SHOULD be used by tooling to interpret the Overlay document.',
    },
    $self: {
      type: 'string',
      description:
        'A URI-reference for the Overlay document. It is also the base URI for resolving relative references within this document.',
    },
    info: 'Info',
    extends: {
      type: 'string',
      description:
        'URI reference that identifies the target document (such as an [OpenAPI] document) this overlay applies to.',
    },
    actions: 'Actions',
    components: 'Components',
  },
  required: ['overlay', 'info', 'actions'],
  extensionsPrefix: 'x-',
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
    description: {
      type: 'string',
      description:
        'A description of the Overlay. [CommonMark] syntax MAY be used for rich text representation.',
    },
  },
  required: ['title', 'version'],
  extensionsPrefix: 'x-',
  description:
    'The object provides metadata about the Overlay. The metadata MAY be used by the clients if needed.',
};

const Actions: NodeType = {
  properties: {},
  // An item with `$ref` references a reusable action from `components.actions`.
  items: (value) => (isRef(value) ? 'ReusableAction' : 'Action'),
};
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
    copy: {
      type: 'string',
      description:
        'A JSONPath expression selecting a single node to copy into the target nodes. The copied value is merged with the target nodes like an `update` value.',
    },
    remove: {
      type: 'boolean',
      description:
        'A boolean value that indicates that the target object or array MUST be removed from the the map or array it is contained in. The default value is false.',
    },
  },
  required: ['target'],
  extensionsPrefix: 'x-',
  description:
    'This object represents one or more changes to be applied to the target document at the location defined by the target JSONPath expression',
};

const Components: NodeType = {
  properties: {
    actions: 'ReusableActions',
  },
  extensionsPrefix: 'x-',
  description: 'A set of components to reuse across the Overlay document.',
};

const ReusableActions: NodeType = mapOf('ReusableAction');

const ReusableAction: NodeType = {
  properties: {
    description: {
      type: 'string',
      description:
        'A description of the reusable action. [CommonMark] syntax MAY be used for rich text representation.',
    },
    fields: 'ReusableActionFields',
  },
  extensionsPrefix: 'x-',
  description:
    'A reusable action. An action in `actions` references it with `$ref` and supplies the `target`.',
};

const ReusableActionFields: NodeType = {
  properties: omit(Action.properties, ['target']),
  extensionsPrefix: 'x-',
  description: 'The fields of a reusable action: an action without a `target`.',
};

export const Overlay1Types: Record<string, NodeType> = {
  Root,
  Info,
  Actions,
  Action,
  Components,
  ReusableActions,
  ReusableAction,
  ReusableActionFields,
};

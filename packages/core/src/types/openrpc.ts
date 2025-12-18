import { listOf, mapOf, type NodeType } from './index.js';
import {
  Schema,
  SchemaProperties,
  Dependencies,
  DiscriminatorMapping,
  Discriminator,
} from './json-schema-draft7.shared.js';

const Root: NodeType = {
  properties: {
    openrpc: { type: 'string' },
    info: 'Info',
    servers: 'ServerList',
    methods: 'MethodList',
    components: 'Components',
    externalDocs: 'ExternalDocs',
  },
  required: ['openrpc', 'info', 'methods'],
  extensionsPrefix: 'x-',
};

const Info: NodeType = {
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    termsOfService: { type: 'string' },
    contact: 'Contact',
    license: 'License',
    version: { type: 'string' },
  },
  required: ['title', 'version'],
  extensionsPrefix: 'x-',
};

const Contact: NodeType = {
  properties: {
    name: { type: 'string' },
    url: { type: 'string' },
    email: { type: 'string' },
  },
  extensionsPrefix: 'x-',
};

const License: NodeType = {
  properties: {
    name: { type: 'string' },
    url: { type: 'string' },
  },
  required: ['name'],
  extensionsPrefix: 'x-',
};

const Server: NodeType = {
  properties: {
    url: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    summary: { type: 'string' },
    variables: 'ServerVariablesMap',
  },
  required: ['url'],
  extensionsPrefix: 'x-',
};

const ServerVariable: NodeType = {
  properties: {
    enum: {
      type: 'array',
      items: { type: 'string' },
    },
    default: { type: 'string' },
    description: { type: 'string' },
  },
  required: ['default'],
  extensionsPrefix: 'x-',
};

const Method: NodeType = {
  properties: {
    name: { type: 'string' },
    tags: 'TagList',
    summary: { type: 'string' },
    description: { type: 'string' },
    externalDocs: 'ExternalDocs',
    params: 'ContentDescriptorList',
    result: 'ContentDescriptor',
    deprecated: { type: 'boolean' },
    servers: 'ServerList',
    errors: 'ErrorList',
    links: 'LinkList',
    paramStructure: { enum: ['by-name', 'by-position', 'either'] },
    examples: 'ExamplePairingList',
  },
  required: ['name', 'params'],
  extensionsPrefix: 'x-',
};

const ContentDescriptor: NodeType = {
  properties: {
    name: { type: 'string' },
    summary: { type: 'string' },
    description: { type: 'string' },
    required: { type: 'boolean' },
    schema: 'Schema',
    deprecated: { type: 'boolean' },
  },
  required: ['name', 'schema'],
  extensionsPrefix: 'x-',
};

const ExamplePairing: NodeType = {
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    summary: { type: 'string' },
    params: 'ExampleList',
    result: 'Example',
  },
  extensionsPrefix: 'x-',
};

const Example: NodeType = {
  properties: {
    name: { type: 'string' },
    summary: { type: 'string' },
    description: { type: 'string' },
    value: { resolvable: false },
    externalValue: { type: 'string' },
  },
  extensionsPrefix: 'x-',
};

const Link: NodeType = {
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    summary: { type: 'string' },
    method: { type: 'string' },
    params: { type: 'object' }, // Map[string, Any | Runtime Expression]
    server: 'Server',
  },
  required: ['name'],
  extensionsPrefix: 'x-',
};

const ErrorObject: NodeType = {
  properties: {
    code: { type: 'integer' },
    message: { type: 'string' },
    data: { resolvable: false },
  },
  required: ['code', 'message'],
  extensionsPrefix: 'x-',
};

const Components: NodeType = {
  properties: {
    contentDescriptors: 'NamedContentDescriptors',
    schemas: 'NamedSchemas',
    examples: 'NamedExamples',
    links: 'NamedLinks',
    errors: 'NamedErrors',
    examplePairingObjects: 'NamedExamplePairingObjects',
    tags: 'NamedTags',
  },
  extensionsPrefix: 'x-',
};

const Tag: NodeType = {
  properties: {
    name: { type: 'string' },
    summary: { type: 'string' },
    description: { type: 'string' },
    externalDocs: 'ExternalDocs',
  },
  required: ['name'],
  extensionsPrefix: 'x-',
};

const ExternalDocs: NodeType = {
  properties: {
    description: { type: 'string' },
    url: { type: 'string' },
  },
  required: ['url'],
  extensionsPrefix: 'x-',
};

export const OpenRpcTypes = {
  Root,
  Info,
  Contact,
  License,
  Server,
  ServerList: listOf('Server'),
  ServerVariable,
  ServerVariablesMap: mapOf('ServerVariable'),
  Method,
  MethodList: listOf('Method'),
  ContentDescriptor,
  ContentDescriptorList: listOf('ContentDescriptor'),
  ExamplePairing,
  ExamplePairingList: listOf('ExamplePairing'),
  Example,
  ExampleList: listOf('Example'),
  Link,
  LinkList: listOf('Link'),
  ErrorObject,
  ErrorList: listOf('ErrorObject'),
  Components,
  Tag,
  TagList: listOf('Tag'),
  ExternalDocs,
  Schema,
  SchemaProperties,
  Dependencies,
  DiscriminatorMapping,
  Discriminator,
  NamedContentDescriptors: mapOf('ContentDescriptor'),
  NamedSchemas: mapOf('Schema'),
  NamedExamples: mapOf('Example'),
  NamedLinks: mapOf('Link'),
  NamedErrors: mapOf('ErrorObject'),
  NamedExamplePairingObjects: mapOf('ExamplePairing'),
  NamedTags: mapOf('Tag'),
} as const;

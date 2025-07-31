import { listOf, type NodeType } from './index.js';

const Root: NodeType = {
  properties: {
    syntax: { type: 'string' },
    package: { type: 'string' },
    imports: { type: 'array', items: { type: 'string' } },
    services: listOf('Service'),
    messages: listOf('Message'),
    enums: listOf('Enum'),
  },
  required: ['syntax'],
  extensionsPrefix: 'x-',
};

const Service: NodeType = {
  properties: {
    name: { type: 'string' },
    methods: listOf('Method'),
  },
  required: ['name'],
  extensionsPrefix: 'x-',
};

const Method: NodeType = {
  properties: {
    name: { type: 'string' },
    inputType: { type: 'string' },
    outputType: { type: 'string' },
    httpOptions: { type: 'object' },
  },
  required: ['name', 'inputType', 'outputType'],
  extensionsPrefix: 'x-',
};

const HttpOptions: NodeType = {
  properties: {
    method: { type: 'string' },
    path: { type: 'string' },
  },
  required: ['method', 'path'],
  extensionsPrefix: 'x-',
};

const Message: NodeType = {
  properties: {
    name: { type: 'string' },
    fields: listOf('Field'),
  },
  required: ['name'],
  extensionsPrefix: 'x-',
};

const Field: NodeType = {
  properties: {
    name: { type: 'string' },
    type: { type: 'string' },
    number: { type: 'number' },
    repeated: { type: 'boolean' },
  },
  required: ['name', 'type', 'number'],
  extensionsPrefix: 'x-',
};

const Enum: NodeType = {
  properties: {
    name: { type: 'string' },
    values: listOf('EnumValue'),
  },
  required: ['name'],
  extensionsPrefix: 'x-',
};

const EnumValue: NodeType = {
  properties: {
    name: { type: 'string' },
    number: { type: 'number' },
  },
  required: ['name', 'number'],
  extensionsPrefix: 'x-',
};

export const Proto3Types = {
  Root,
  Service,
  Method,
  HttpOptions,
  Message,
  Field,
  Enum,
  EnumValue,
  ServiceList: listOf('Service'),
  MessageList: listOf('Message'),
  EnumList: listOf('Enum'),
  MethodList: listOf('Method'),
  FieldList: listOf('Field'),
  EnumValueList: listOf('EnumValue'),
};

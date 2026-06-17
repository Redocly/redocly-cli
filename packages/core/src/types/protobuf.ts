import { listOf, type NodeType } from './index.js';

export const ProtobufTypes: Record<string, NodeType> = {
  Root: {
    properties: {
      syntax: 'ProtoSyntax',
      package: 'ProtoPackage',
      imports: listOf('ProtoImport'),
      messages: listOf('ProtoMessage'),
      enums: listOf('ProtoEnum'),
      services: listOf('ProtoService'),
    },
  },
  ProtoSyntax: {
    properties: {
      value: { type: 'string' },
      location: 'ProtoLocation',
    },
  },
  ProtoPackage: {
    properties: {
      name: { type: 'string' },
      location: 'ProtoLocation',
    },
  },
  ProtoImport: {
    properties: {
      path: { type: 'string' },
      public: { type: 'boolean' },
      weak: { type: 'boolean' },
      location: 'ProtoLocation',
    },
  },
  ProtoMessage: {
    properties: {
      name: { type: 'string' },
      fields: listOf('ProtoField'),
      messages: listOf('ProtoMessage'),
      enums: listOf('ProtoEnum'),
      location: 'ProtoLocation',
    },
  },
  ProtoField: {
    properties: {
      name: { type: 'string' },
      type: { type: 'string' },
      number: { type: 'integer' },
      repeated: { type: 'boolean' },
      optional: { type: 'boolean' },
      location: 'ProtoLocation',
    },
  },
  ProtoEnum: {
    properties: {
      name: { type: 'string' },
      values: listOf('ProtoEnumValue'),
      location: 'ProtoLocation',
    },
  },
  ProtoEnumValue: {
    properties: {
      name: { type: 'string' },
      number: { type: 'integer' },
      location: 'ProtoLocation',
    },
  },
  ProtoService: {
    properties: {
      name: { type: 'string' },
      rpcs: listOf('ProtoRpc'),
      location: 'ProtoLocation',
    },
  },
  ProtoRpc: {
    properties: {
      name: { type: 'string' },
      requestType: { type: 'string' },
      responseType: { type: 'string' },
      requestStream: { type: 'boolean' },
      responseStream: { type: 'boolean' },
      location: 'ProtoLocation',
    },
  },
  ProtoLocation: {
    properties: {
      pointer: { type: 'string' },
      start: 'ProtoPosition',
      end: 'ProtoPosition',
    },
  },
  ProtoPosition: {
    properties: {
      line: { type: 'integer' },
      col: { type: 'integer' },
    },
  },
};

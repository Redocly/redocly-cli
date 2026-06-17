import type { Source } from '../resolve.js';
import type { Loc } from '../walk.js';

export type ProtoLocation = {
  source: Source;
  pointer: string;
  start?: Loc;
  end?: Loc;
};

export type ProtoSyntax = {
  value?: string;
  location: ProtoLocation;
};

export type ProtoPackage = {
  name: string;
  location: ProtoLocation;
};

export type ProtoImport = {
  path: string;
  public?: boolean;
  weak?: boolean;
  location: ProtoLocation;
};

export type ProtoField = {
  name: string;
  type: string;
  number: number;
  repeated?: boolean;
  optional?: boolean;
  location: ProtoLocation;
};

export type ProtoMessage = {
  name: string;
  fields: ProtoField[];
  messages: ProtoMessage[];
  enums: ProtoEnum[];
  location: ProtoLocation;
};

export type ProtoEnumValue = {
  name: string;
  number: number;
  location: ProtoLocation;
};

export type ProtoEnum = {
  name: string;
  values: ProtoEnumValue[];
  location: ProtoLocation;
};

export type ProtoRpc = {
  name: string;
  requestType: string;
  responseType: string;
  requestStream?: boolean;
  responseStream?: boolean;
  location: ProtoLocation;
};

export type ProtoService = {
  name: string;
  rpcs: ProtoRpc[];
  location: ProtoLocation;
};

export type ProtoDocument = {
  syntax?: ProtoSyntax;
  package?: ProtoPackage;
  imports: ProtoImport[];
  messages: ProtoMessage[];
  enums: ProtoEnum[];
  services: ProtoService[];
};

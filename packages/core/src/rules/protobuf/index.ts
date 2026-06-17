import type { ProtobufRuleSet } from '../../oas-types.js';
import { FieldSnakeCase } from './field-snake-case.js';
import { MessagePascalCase } from './message-pascal-case.js';
import { PackageDefined } from './package-defined.js';

export const rules: ProtobufRuleSet<'built-in'> = {
  'protobuf/package-defined': PackageDefined,
  'protobuf/message-pascal-case': MessagePascalCase,
  'protobuf/field-snake-case': FieldSnakeCase,
};

export const preprocessors = {};

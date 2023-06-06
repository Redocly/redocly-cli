import { Oas2Rule, Oas3Rule } from '../../visitors';
import { buildNameUniqueRule } from './base-name-unique';

// TODO build rules for 'Schema', 'Parameter', 'Response', 'RequestBody', 'SecurityScheme'
export const SchemaNameUnique: Oas3Rule | Oas2Rule = buildNameUniqueRule('Schema');

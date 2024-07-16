import type { FromSchema } from 'json-schema-to-ts';
import type {
  arazzoSchema,
  parameter,
  operationMethod,
  expectSchema,
  sourceDescriptionSchema,
  infoObject,
  requestBody,
  replacement,
  inherit,
  criteriaObject,
  step,
  workflow,
} from '../types/arazzo';

export type ArazzoDefinition = FromSchema<typeof arazzoSchema>;
export type OperationMethod = FromSchema<typeof operationMethod>;
export type ResponseContext = {
  statusCode: number;
  body: any;
  headers: Headers;
  mimeType: string;
} & Record<string, any>;
export type Expect = FromSchema<typeof expectSchema>;
export type SourceDescription = FromSchema<typeof sourceDescriptionSchema>;
export type Parameter = FromSchema<typeof parameter>;
export type InfoObject = FromSchema<typeof infoObject>;
export type RequestBody = FromSchema<typeof requestBody>;
export type Replacement = FromSchema<typeof replacement>;
export type Inherit = FromSchema<typeof inherit>;
export type CriteriaObject = FromSchema<typeof criteriaObject>;
export type VerboseLog = {
  method: OperationMethod;
  path: string;
  host: string;
  body?: any;
  headerParams?: Record<string, string>;
  statusCode?: number;
};
export type Step = FromSchema<typeof step>;
export type Workflow = FromSchema<typeof workflow> & {
  steps: Step[];
};

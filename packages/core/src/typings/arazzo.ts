import type { FromSchema } from 'json-schema-to-ts';
import type { workflowSchema } from '../types/arazzo';

export type ArazzoDefinition = FromSchema<typeof workflowSchema>;

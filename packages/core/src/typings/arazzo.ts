import type { FromSchema } from 'json-schema-to-ts';
import type { arazzoSchema } from '../types/arazzo';

export type ArazzoDefinition = FromSchema<typeof arazzoSchema>;

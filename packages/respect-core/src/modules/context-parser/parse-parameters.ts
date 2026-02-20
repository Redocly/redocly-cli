import { isPlainObject } from '@redocly/openapi-core';

import { type AdditionalParameterProperties } from '../../types.js';

export type ParameterWithIn = {
  in: 'header' | 'query' | 'path' | 'cookie';
  name: string;
  value: string | number | boolean;
} & AdditionalParameterProperties;

export type ParameterWithoutIn = Omit<ParameterWithIn, 'in'>;

// The isParameterWithoutIn and isParameterWithIn type guards are used to differentiate between
// the two sides of onOffs in the parameter schema that is imported from the @redocly/openapi-core.
export function isParameterWithoutIn(parameter: unknown): parameter is ParameterWithoutIn {
  return (
    isPlainObject(parameter) && 'name' in parameter && 'value' in parameter && !('in' in parameter)
  );
}

export function isParameterWithIn(parameter: unknown): parameter is ParameterWithIn {
  return (
    isPlainObject(parameter) &&
    'in' in parameter &&
    typeof parameter.in === 'string' &&
    ['header', 'query', 'path', 'cookie'].includes(parameter.in)
  );
}

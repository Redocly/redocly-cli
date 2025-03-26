import type { AdditionalParameterProperties } from '../../types.js';

export type ParameterWithIn = {
  in: 'header' | 'query' | 'path' | 'cookie';
  name: string;
  value: string | number | boolean;
} & AdditionalParameterProperties;

export type ParameterWithoutIn = Omit<ParameterWithIn, 'in'>;

// The isParameterWithoutIn and isParameterWithIn type guards are used to differentiate between
// the two sides of onOffs in the parameter schema that is imported from the @redocly/openapi-core.
// export const parameter = {
//   type: 'object',
//   oneOf: [
//     {
//       type: 'object',
//       properties: {
//         in: { type: 'string', enum: ['header', 'query', 'path', 'cookie'] },
//         name: { type: 'string' },
//         value: {
//           oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
//         },
//       },
//       required: ['name', 'value'],
//       additionalProperties: false,
//     },
//     {
//       type: 'object',
//       properties: {
//         reference: { type: 'string' },
//         value: {
//           oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
//         },
//       },
//       required: ['reference'],
//       additionalProperties: false,
//     },
//   ],
// } as const;
export function isParameterWithoutIn(parameter: any): parameter is ParameterWithoutIn {
  return (
    typeof parameter === 'object' &&
    parameter !== null &&
    'name' in parameter &&
    'value' in parameter &&
    !('in' in parameter)
  );
}

export function isParameterWithIn(parameter: any): parameter is ParameterWithIn {
  return (
    typeof parameter === 'object' &&
    parameter !== null &&
    'in' in parameter &&
    ['header', 'query', 'path', 'cookie'].includes(parameter.in)
  );
}

import { cleanColors } from '../../utils/clean-colors.js';
import { printErrors } from '../ajv-errors.js';
import type { JSONSchemaType } from '@redocly/ajv/dist/2020';

describe('printErrors', () => {
  it('should display multiple Ajv errors', () => {
    const schema = {
      description: 'List of museum operating hours for consecutive days.',
      type: 'array',
      items: {
        description: 'Daily operating hours for the museum.',
        type: 'object',
        properties: { timeOpen: [Object], timeClose: [Object] },
        required: ['date', 'timeOpen', 'timeClose'],
      },
    } as unknown as JSONSchemaType<unknown>;
    const errors = [
      {
        instancePath: '/0',
        schemaPath: '#/items/unevaluatedProperties',
        keyword: 'unevaluatedProperties',
        params: { unevaluatedProperty: 'date' },
        message: 'must NOT have unevaluated properties: "date".',
        schema: undefined,
        parentSchema: {
          description: 'Daily operating hours for the museum.',
          type: 'object',
          properties: [Object],
          required: [Array],
        },
        data: { date: '2023-09-11', timeOpen: '09:00', timeClose: '18:00' },
      },
      {
        instancePath: '/1',
        schemaPath: '#/items/unevaluatedProperties',
        keyword: 'unevaluatedProperties',
        params: { unevaluatedProperty: 'date' },
        message: 'must NOT have unevaluated properties: "date".',
        schema: undefined,
        parentSchema: {
          description: 'Daily operating hours for the museum.',
          type: 'object',
          properties: [Object],
          required: [Array],
        },
        data: { date: '2023-09-12', timeOpen: '09:00', timeClose: '18:00' },
      },
    ];
    const data = [
      { date: '2023-09-11', timeOpen: '09:00', timeClose: '18:00' },
      { date: '2023-09-12', timeOpen: '09:00', timeClose: '18:00' },
    ];

    const result = printErrors(schema, data, errors);

    expect(cleanColors(result)).toMatchSnapshot();
  });
});

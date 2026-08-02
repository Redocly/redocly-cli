import type { ApiModel, SchemaModel } from '../../intermediate-representation/model.js';
import { cliGenerator, cliSample } from '../cli.js';
import { builtinGenerators, validateGenerators } from '../index.js';

const STRING: SchemaModel = { kind: 'scalar', scalar: 'string' };

const MODEL: ApiModel = {
  title: 'Cafe',
  version: '1.0.0',
  serverUrl: 'https://api.cafe.example',
  services: [
    {
      name: 'Orders',
      operations: [
        {
          name: 'getOrder',
          specName: 'getOrder',
          method: 'get',
          path: '/orders/{orderId}',
          tags: ['Orders'],
          pathParams: [{ name: 'orderId', in: 'path', required: true, schema: STRING }],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          successResponses: [
            {
              status: '200',
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'Order' },
            },
          ],
          errorResponses: [],
        },
      ],
    },
  ],
  schemas: [
    {
      name: 'Order',
      schema: { kind: 'object', properties: [{ name: 'id', schema: STRING, required: true }] },
    },
  ],
  securitySchemes: [],
} as unknown as ApiModel;

describe('cliGenerator', () => {
  it('emits <stem>.cli.ts beside the client, wiring zod only when co-selected', () => {
    const files = cliGenerator({
      model: MODEL,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: {},
      selected: ['sdk', 'cli'],
    });
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('/out/client.cli.ts');
    expect(files[0].content).not.toContain('zodValidation');

    const withZod = cliGenerator({
      model: MODEL,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: {},
      selected: ['sdk', 'zod', 'cli'],
    });
    expect(withZod[0].content).toContain('use(zodValidation());');
  });

  it('requires sdk and rejects result mode', () => {
    expect(() => validateGenerators(['cli'], {})).toThrow(/requires the "sdk" generator/);
    expect(() => validateGenerators(['sdk', 'cli'], { errorMode: 'result' })).toThrow(
      /does not support --error-mode "result"/
    );
    expect(() => validateGenerators(['sdk', 'cli'], {})).not.toThrow();
    expect(builtinGenerators().has('cli')).toBe(true);
  });

  it('renders a shell x-codeSamples snippet per operation', () => {
    const op = MODEL.services[0].operations[0];
    const sample = cliSample(op, { model: MODEL, emit: {} });
    expect(sample).toMatchObject({ lang: 'shell', label: 'CLI' });
    expect(sample?.source).toContain('Orders getOrder <orderId>');
  });
});

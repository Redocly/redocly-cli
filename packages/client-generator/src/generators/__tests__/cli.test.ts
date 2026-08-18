import type { ApiModel, SchemaModel } from '../../intermediate-representation/model.js';
import { cliGenerator, cliSample } from '../cli/index.js';
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
      selected: ['typescript', 'cli'],
    });
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('/out/client.cli.ts');
    expect(files[0].content).not.toContain('zodValidation');

    const withZod = cliGenerator({
      model: MODEL,
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: {},
      selected: ['typescript', 'zod', 'cli'],
    });
    // Request validation always; response validation off for a dry run, whose response is
    // the dry-run stub rather than the server's.
    expect(withZod[0].content).toContain(
      'use(zodValidation(process.argv.includes("--dry-run") ? { response: false } : {}));'
    );
  });

  it('declares its prerequisites and rejects result mode', () => {
    // `typescript` + `zod` are pulled in by the resolver (see resolve.test.ts); validation
    // still refuses a selection whose prerequisites are genuinely absent.
    expect(builtinGenerators().get('cli')?.requires).toEqual(['typescript', 'zod']);
    expect(() => validateGenerators(['cli'], {})).toThrow(/requires the "typescript" generator/);
    expect(() => validateGenerators(['typescript', 'zod', 'cli'], { errorMode: 'result' })).toThrow(
      /does not support --error-mode "result"/
    );
    expect(() => validateGenerators(['typescript', 'zod', 'cli'], {})).not.toThrow();
  });

  it('renders a shell x-codeSamples snippet per operation, addressed by the group slug', () => {
    const op = MODEL.services[0].operations[0];
    const sample = cliSample(op, { model: MODEL, emit: {}, outputPath: 'client.ts' });
    expect(sample).toMatchObject({ lang: 'shell', label: 'CLI' });
    // The CLI dispatches on the slugged group, so the sample must use it — the raw
    // tag ("Orders", or worse a multi-word one) would not resolve.
    expect(sample?.source).toContain('orders getOrder <orderId>');
    expect(sample?.source).not.toContain('Orders getOrder');
  });

  it('slugs a multi-word tag into the group the CLI accepts', () => {
    const model = {
      ...MODEL,
      services: [
        {
          name: 'Orders',
          operations: [{ ...MODEL.services[0].operations[0], tags: ['Coffee Orders'] }],
        },
      ],
    } as ApiModel;
    const sample = cliSample(model.services[0].operations[0], {
      model,
      emit: {},
      outputPath: 'client.ts',
    });
    expect(sample?.source).toContain('coffee-orders getOrder <orderId>');
  });
});

describe('bin name', () => {
  it('folds the TypeScript stem into a command-like name', () => {
    // `openapi.client` in a usage line reads as a filename, and yields OPENAPI_CLIENT_* anyway.
    const out = cliGenerator({
      model: MODEL,
      outputPath: '/out/openapi.client.ts',
      outputMode: 'single',
      emit: {},
    })[0].content;
    expect(out).toContain('binName: "openapi-client"');
    expect(out).not.toContain('binName: "openapi.client"');
  });

  it('honors an explicit binName', () => {
    const out = cliGenerator({
      model: MODEL,
      outputPath: '/out/openapi.client.ts',
      outputMode: 'single',
      emit: { binName: 'cafe' },
    })[0].content;
    expect(out).toContain('binName: "cafe"');
  });
});

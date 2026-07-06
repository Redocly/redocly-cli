import type { ApiModel } from '../../intermediate-representation/model.js';
import { getWriter } from '../../writers/index.js';
import { sdkGenerator } from '../sdk.js';

function apiModel(): ApiModel {
  return {
    title: 'T',
    version: '1.0.0',
    serverUrl: 'https://api.example.com',
    services: [
      {
        name: 'Default',
        operations: [
          {
            name: 'op',
            method: 'get',
            path: '/p',
            pathParams: [],
            queryParams: [],
            headerParams: [],
            successResponses: [],
            errorResponses: [],
            security: [],
            tags: [],
          },
        ],
      },
    ],
    schemas: [],
    securitySchemes: [],
  };
}

describe('sdkGenerator', () => {
  it('produces byte-identical output to the writer it wraps (single mode)', () => {
    const model = apiModel();
    const input = { model, outputPath: '/out/api.ts', outputMode: 'single' as const, emit: {} };
    const viaGenerator = sdkGenerator(input);
    const viaWriter = getWriter('single')({ model, outputPath: '/out/api.ts', emit: {} });
    expect(viaGenerator).toEqual(viaWriter);
  });

  it('honors the output mode (split carves the schemas into a sibling file)', () => {
    const model = apiModel();
    model.schemas = [{ name: 'Thing', schema: { kind: 'object', properties: [] } }];
    const files = sdkGenerator({
      model,
      outputPath: '/out/api.ts',
      outputMode: 'split',
      emit: {},
    });
    expect(files.map((f) => f.path)).toEqual(['/out/api.schemas.ts', '/out/api.ts']);
  });
});

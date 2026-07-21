import { HEADER } from '../../emitters/emit-options.js';
import type { ApiModel } from '../../intermediate-representation/model.js';
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
            cookieParams: [],
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
  it('writes the whole client to the output path in single mode', () => {
    const files = sdkGenerator({
      model: apiModel(),
      outputPath: '/out/api.ts',
      outputMode: 'single',
      emit: {},
    });
    expect(files.map((file) => file.path)).toEqual(['/out/api.ts']);
    expect(files[0].content.startsWith(HEADER)).toBe(true);
    expect(files[0].content).toContain('export const client =');
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

  it('emits .ts import extensions when importExt is ts (Node native TS execution)', () => {
    const model = apiModel();
    model.schemas = [{ name: 'Thing', schema: { kind: 'object', properties: [] } }];
    const files = sdkGenerator({
      model,
      outputPath: '/out/api.ts',
      outputMode: 'split',
      emit: { importExt: 'ts' },
    });
    const entry = files.find((file) => file.path === '/out/api.ts')!;
    expect(entry.content).toContain("from './api.schemas.ts'");
    expect(entry.content).not.toContain('.schemas.js');
  });
});

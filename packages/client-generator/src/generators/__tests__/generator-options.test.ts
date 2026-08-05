import { logger } from '@redocly/openapi-core';

import type { ApiModel } from '../../intermediate-representation/model.js';
import { runGenerators } from '../../pipeline.js';
import { resolveGeneratorOptions } from '../options.js';
import type { GeneratorDescriptor, GeneratorOptionsSchema } from '../types.js';

const MATRIX_SCHEMA: GeneratorOptionsSchema = {
  type: 'object',
  properties: {
    groupBy: { enum: ['tag', 'path'], default: 'tag' },
    depth: { type: 'number' },
    include: { type: 'array', items: { type: 'string' } },
    title: { type: 'string' },
  },
  required: ['depth'],
  additionalProperties: false,
};

function registryWith(descriptor: Partial<GeneratorDescriptor>) {
  return new Map<string, GeneratorDescriptor>([
    ['permissions-matrix', { run: () => [], ...descriptor }],
  ]);
}

describe('resolveGeneratorOptions', () => {
  const registry = registryWith({ options: MATRIX_SCHEMA });

  it('applies declared defaults and passes valid values through', () => {
    const resolved = resolveGeneratorOptions(['permissions-matrix'], registry, {
      'permissions-matrix': { depth: 2, include: ['orders'] },
    });
    expect(resolved.get('permissions-matrix')).toEqual({
      groupBy: 'tag',
      depth: 2,
      include: ['orders'],
    });
  });

  it('rejects an unknown key, a wrong type, a value outside an enum, and a missing required key', () => {
    const reject = (options: Record<string, unknown>) => () =>
      resolveGeneratorOptions(['permissions-matrix'], registry, {
        'permissions-matrix': options,
      });

    expect(reject({ depth: 1, groupby: 'tag' })).toThrow(
      /"permissions-matrix".*unknown option "groupby".*groupBy, depth, include, title/s
    );
    expect(reject({ depth: 'two' })).toThrow(/"depth" must be a number/);
    expect(reject({ depth: 1, groupBy: 'paths' })).toThrow(/"groupBy" must be one of: tag, path/);
    expect(reject({ depth: 1, include: ['orders', 7] })).toThrow(
      /"include" must be an array of string/
    );
    expect(reject({})).toThrow(/requires the "depth" option/);
    expect(reject([] as unknown as Record<string, unknown>)).toThrow(
      /options must be a map of option names to values/
    );
  });

  it('keeps unknown keys when the schema allows them', () => {
    const permissive = registryWith({
      options: { type: 'object', properties: {}, additionalProperties: true },
    });
    const resolved = resolveGeneratorOptions(['permissions-matrix'], permissive, {
      'permissions-matrix': { anything: 'goes' },
    });
    expect(resolved.get('permissions-matrix')).toEqual({ anything: 'goes' });
  });

  it('warns when a selected generator that declares no options is configured', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    try {
      const resolved = resolveGeneratorOptions(['permissions-matrix'], registryWith({}), {
        'permissions-matrix': { groupBy: 'tag' },
      });
      expect(resolved.get('permissions-matrix')).toEqual({});
      expect(warn.mock.calls.join('\n')).toContain('declares no options');
    } finally {
      warn.mockRestore();
    }
  });

  it('ignores options keyed to a generator this run did not select', () => {
    expect(() =>
      resolveGeneratorOptions(['permissions-matrix'], registry, {
        'permissions-matrix': { depth: 1 },
        'some-other-generator': { whatever: true },
      })
    ).not.toThrow();
  });
});

describe('runGenerators', () => {
  it('hands each generator its resolved options', () => {
    let seen: unknown;
    const registry = new Map<string, GeneratorDescriptor>([
      [
        'permissions-matrix',
        {
          options: MATRIX_SCHEMA,
          run: ({ options, outputPath }) => {
            seen = options;
            return [{ path: outputPath.replace(/\.ts$/, '.permissions.md'), content: '' }];
          },
        },
      ],
    ]);
    const generatorOptions = resolveGeneratorOptions(['permissions-matrix'], registry, {
      'permissions-matrix': { depth: 3 },
    });
    runGenerators({ title: 'T', version: '1', services: [], schemas: [] } as unknown as ApiModel, {
      outputPath: '/out/client.ts',
      outputMode: 'single',
      emit: {},
      generators: ['permissions-matrix'],
      registry,
      generatorOptions,
    });
    expect(seen).toEqual({ groupBy: 'tag', depth: 3 });
  });
});

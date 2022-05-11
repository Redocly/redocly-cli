import { resolveLint, resolveApis, resolveConfig } from '../config-resolvers';
const path = require('path');

import type { LintRawConfig, RawConfig } from '../types';

const configPath = path.join(__dirname, 'fixtures/resolve-config/.redocly.yaml');
const baseLintConfig: LintRawConfig = {
  rules: {
    'operation-2xx-response': 'warn',
  },
};

const minimalLintPreset = resolveLint({
  lintConfig: { ...baseLintConfig, extends: ['minimal'] },
});

const recommendedLintPreset = resolveLint({
  lintConfig: { ...baseLintConfig, extends: ['recommended'] },
});

const removeAbsolutePath = (item: string) =>
  item.match(/^.*\/packages\/core\/src\/config\/__tests__\/fixtures\/(.*)$/)![1];

describe('resolveLint', () => {
  it('should return the config with no recommended', async () => {
    const lint = await resolveLint({ lintConfig: baseLintConfig });
    expect(lint.plugins?.length).toEqual(1);
    expect(lint.plugins?.[0].id).toEqual('');
    expect(lint.rules).toEqual({
      'operation-2xx-response': 'warn',
    });
  });

  it('should return the config with correct order by preset', async () => {
    expect(
      await resolveLint({
        lintConfig: { ...baseLintConfig, extends: ['minimal', 'recommended'] },
      }),
    ).toEqual(await recommendedLintPreset);
    expect(
      await resolveLint({
        lintConfig: { ...baseLintConfig, extends: ['recommended', 'minimal'] },
      }),
    ).toEqual(await minimalLintPreset);
  });

  it('should return the same lintConfig when extends is empty array', async () => {
    const configWithEmptyExtends = await resolveLint({
      lintConfig: { ...baseLintConfig, extends: [] },
    });
    expect(configWithEmptyExtends.plugins?.length).toEqual(1);
    expect(configWithEmptyExtends.plugins?.[0].id).toEqual('');
    expect(configWithEmptyExtends.rules).toEqual({
      'operation-2xx-response': 'warn',
    });
  });

  it('should resolve extends with local file config', async () => {
    const config = {
      ...baseLintConfig,
      extends: ['local-config.yaml'],
    };

    const { plugins, ...lint } = await resolveLint({
      lintConfig: config,
      configPath,
    });

    expect(lint?.rules?.['operation-2xx-response']).toEqual('warn');
    expect(plugins).toBeDefined();
    expect(plugins?.length).toBe(2);

    expect(lint.extendPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/.redocly.yaml',
      'resolve-config/local-config.yaml',
      'resolve-config/.redocly.yaml',
    ]);
    expect(lint.pluginPaths!.map(removeAbsolutePath)).toEqual(['resolve-config/plugin.js']);

    expect(lint.rules).toEqual({
      'boolean-parameter-prefixes': 'error',
      'local/operation-id-not-test': 'error',
      'no-invalid-media-type-examples': 'error',
      'operation-2xx-response': 'warn',
      'operation-description': 'error',
      'path-http-verbs-order': 'error',
    });
  });

  // TODO: fix circular test
  it.skip('should throw circular error', () => {
    const config = {
      ...baseLintConfig,
      extends: ['local-config-with-circular.yaml'],
    };
    expect(() => {
      resolveLint({ lintConfig: config, configPath });
    }).toThrow('Circular dependency in config file');
  });

  it('should resolve extends with local file config witch contains path to nested config', async () => {
    const lintConfig = {
      extends: ['local-config-with-file.yaml'],
    };
    const { plugins, ...lint } = await resolveLint({
      lintConfig,
      configPath,
    });

    expect(lint?.rules?.['no-invalid-media-type-examples']).toEqual('warn');
    expect(lint?.rules?.['operation-4xx-response']).toEqual('off');
    expect(lint?.rules?.['operation-2xx-response']).toEqual('error');
    expect(plugins).toBeDefined();
    expect(plugins?.length).toBe(3);

    expect(lint.extendPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/.redocly.yaml',
      'resolve-config/local-config-with-file.yaml',
      'resolve-config/api/nested-config.yaml',
      'resolve-config/.redocly.yaml',
    ]);
    expect(lint.pluginPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/api/plugin.js',
      'resolve-config/plugin.js',
      'resolve-config/api/plugin.js',
    ]);

    delete lint.extendPaths;
    delete lint.pluginPaths;
    expect(lint).toMatchSnapshot();
  });

  it('should correctly merge assertions from nested config', async () => {
    const lintConfig = {
      extends: ['local-config-with-file.yaml'],
    };

    const lint = await resolveLint({
      lintConfig,
      configPath,
    });

    expect(Array.isArray(lint.rules?.assertions)).toEqual(true);
    expect(lint.rules?.assertions).toMatchObject( [
      {
        subject: 'PathItem',
        property: 'get',
        message: 'Every path item must have a GET operation.',
        defined: true,
        assertionId: 'path-item-get-defined'
      },
      {
        subject: 'Tag',
        property: 'description',
        message: 'Tag description must be at least 13 characters and end with a full stop.',
        severity: 'error',
        minLength: 13,
        pattern: '/\\.$/',
        assertionId: 'tag-description'
      }
    ])
  });

  it('should resolve extends with url file config witch contains path to nested config', async () => {
    const lintConfig = {
      // This points to ./fixtures/resolve-remote-configs/remote-config.yaml
      extends: [
        'https://raw.githubusercontent.com/Redocly/openapi-cli/master/packages/core/src/config/__tests__/fixtures/resolve-remote-configs/remote-config.yaml',
      ],
    };

    const { plugins, ...lint } = await resolveLint({
      lintConfig,
      configPath,
    });

    expect(lint?.rules?.['operation-4xx-response']).toEqual('error');
    expect(lint?.rules?.['operation-2xx-response']).toEqual('error');
    expect(Object.keys(lint.rules || {}).length).toBe(2);

    expect(lint.extendPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/.redocly.yaml',
      'resolve-config/.redocly.yaml',
    ]);
    expect(lint.pluginPaths!.map(removeAbsolutePath)).toEqual([]);
  });
});

describe('resolveApis', () => {
  it('should resolve apis lintConfig and merge minimal extends', async () => {
    const rawConfig: RawConfig = {
      apis: {
        petstore: {
          root: 'some/path',
          lint: {},
        },
      },
      lint: {
        extends: ['minimal'],
      },
    };
    const apisResult = await resolveApis({ rawConfig });
    expect(apisResult['petstore'].lint).toEqual(await minimalLintPreset);
  });

  it('should not merge recommended extends by default by every level', async () => {
    const rawConfig: RawConfig = {
      apis: {
        petstore: {
          root: 'some/path',
          lint: {},
        },
      },
      lint: {},
    };

    const apisResult = await resolveApis({ rawConfig, configPath });

    expect(apisResult['petstore'].lint.extendPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/.redocly.yaml',
    ]);
    expect(apisResult['petstore'].lint.pluginPaths!.map(removeAbsolutePath)).toEqual([]);

    expect(apisResult['petstore'].lint.rules).toEqual({});
    //@ts-ignore
    expect(apisResult['petstore'].lint.plugins.length).toEqual(1);
    //@ts-ignore
    expect(apisResult['petstore'].lint.plugins[0].id).toEqual('');
  });

  it('should resolve apis lintConfig when it contains file and not set recommended', async () => {
    const rawConfig: RawConfig = {
      apis: {
        petstore: {
          root: 'some/path',
          lint: {
            rules: {
              'operation-4xx-response': 'error',
            },
          },
        },
      },
      lint: {
        rules: {
          'operation-2xx-response': 'warn',
        },
      },
    };

    const apisResult = await resolveApis({ rawConfig, configPath });
    expect(apisResult['petstore'].lint.rules).toEqual({
      'operation-2xx-response': 'warn',
      'operation-4xx-response': 'error',
    });
    //@ts-ignore
    expect(apisResult['petstore'].lint.plugins.length).toEqual(1);
    //@ts-ignore
    expect(apisResult['petstore'].lint.plugins[0].id).toEqual('');

    expect(apisResult['petstore'].lint.extendPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/.redocly.yaml',
    ]);
    expect(apisResult['petstore'].lint.pluginPaths!.map(removeAbsolutePath)).toEqual([]);
  });

  it('should resolve apis lintConfig when it contains file', async () => {
    const rawConfig: RawConfig = {
      apis: {
        petstore: {
          root: 'some/path',
          lint: {
            extends: ['local-config.yaml'],
            rules: {
              'operation-4xx-response': 'error',
            },
          },
        },
      },
      lint: {
        extends: ['minimal'],
        rules: {
          'operation-2xx-response': 'warn',
        },
      },
    };

    const apisResult = await resolveApis({ rawConfig, configPath });
    expect(apisResult['petstore'].lint.rules).toBeDefined();
    expect(apisResult['petstore'].lint.rules?.['operation-2xx-response']).toEqual('warn'); // think about prioritize in merge ???
    expect(apisResult['petstore'].lint.rules?.['operation-4xx-response']).toEqual('error');
    expect(apisResult['petstore'].lint.rules?.['local/operation-id-not-test']).toEqual('error');
    //@ts-ignore
    expect(apisResult['petstore'].lint.plugins.length).toEqual(2);

    expect(apisResult['petstore'].lint.extendPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/.redocly.yaml',
      'resolve-config/local-config.yaml',
      'resolve-config/.redocly.yaml',
    ]);
    expect(apisResult['petstore'].lint.pluginPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/plugin.js',
    ]);
  });
});

describe('resolveConfig', () => {
  it('should add recommended to top level by default', async () => {
    const rawConfig: RawConfig = {
      apis: {
        petstore: {
          root: 'some/path',
          lint: {
            rules: {
              'operation-4xx-response': 'error',
            },
          },
        },
      },
      lint: {
        rules: {
          'operation-2xx-response': 'warn',
        },
      },
    };

    const { apis } = await resolveConfig(rawConfig, configPath);
    //@ts-ignore
    expect(apis['petstore'].lint.plugins.length).toEqual(1);
    //@ts-ignore
    expect(apis['petstore'].lint.plugins[0].id).toEqual('');

    expect(apis['petstore'].lint.extendPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/.redocly.yaml',
    ]);
    expect(apis['petstore'].lint.pluginPaths!.map(removeAbsolutePath)).toEqual([]);

    expect(apis['petstore'].lint.rules).toEqual({
      ...(await recommendedLintPreset).rules,
      'operation-2xx-response': 'warn',
      'operation-4xx-response': 'error',
    });
  });

  it('should not add recommended to top level by default when apis have extends file', async () => {
    const rawConfig: RawConfig = {
      apis: {
        petstore: {
          root: 'some/path',
          lint: {
            extends: ['local-config.yaml'],
            rules: {
              'operation-4xx-response': 'error',
            },
          },
        },
      },
      lint: {
        rules: {
          'operation-2xx-response': 'warn',
        },
      },
    };

    const { apis } = await resolveConfig(rawConfig, configPath);
    expect(apis['petstore'].lint.rules).toBeDefined();
    expect(Object.keys(apis['petstore'].lint.rules || {}).length).toEqual(7);
    expect(apis['petstore'].lint.rules?.['operation-2xx-response']).toEqual('warn');
    expect(apis['petstore'].lint.rules?.['operation-4xx-response']).toEqual('error');
    expect(apis['petstore'].lint.rules?.['operation-description']).toEqual('error'); // from extends file config
    //@ts-ignore
    expect(apis['petstore'].lint.plugins.length).toEqual(2);

    expect(apis['petstore'].lint.extendPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/.redocly.yaml',
      'resolve-config/local-config.yaml',
      'resolve-config/.redocly.yaml',
    ]);
    expect(apis['petstore'].lint.pluginPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/plugin.js',
    ]);

    expect(apis['petstore'].lint.recommendedFallback).toBe(false);
  });

  it('should ignore minimal from the root and read local file', async () => {
    const rawConfig: RawConfig = {
      apis: {
        petstore: {
          root: 'some/path',
          lint: {
            extends: ['recommended', 'local-config.yaml'],
            rules: {
              'operation-4xx-response': 'error',
            },
          },
        },
      },
      lint: {
        extends: ['minimal'],
        rules: {
          'operation-2xx-response': 'warn',
        },
      },
    };

    const { apis } = await resolveConfig(rawConfig, configPath);
    expect(apis['petstore'].lint.rules).toBeDefined();
    expect(apis['petstore'].lint.rules?.['operation-2xx-response']).toEqual('warn');
    expect(apis['petstore'].lint.rules?.['operation-4xx-response']).toEqual('error');
    expect(apis['petstore'].lint.rules?.['operation-description']).toEqual('error'); // from extends file config
    //@ts-ignore
    expect(apis['petstore'].lint.plugins.length).toEqual(2);
    //@ts-ignore
    delete apis['petstore'].lint.plugins;

    expect(apis['petstore'].lint.extendPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/.redocly.yaml',
      'resolve-config/local-config.yaml',
      'resolve-config/.redocly.yaml',
    ]);
    expect(apis['petstore'].lint.pluginPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/plugin.js',
    ]);

    delete apis['petstore'].lint.extendPaths;
    delete apis['petstore'].lint.pluginPaths;
    expect(apis['petstore'].lint).toMatchSnapshot();
  });
});

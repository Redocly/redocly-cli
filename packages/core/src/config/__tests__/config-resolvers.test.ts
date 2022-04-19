import { resolveLint, resolveApis, resolveConfig } from '../config-resolvers';
const path = require('path');

import type { LintRawConfig, RawConfig } from '../types';

const configPath = path.join(__dirname, 'fixtures/resolve/.redocly.yaml');
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

describe('resolveLint', () => {
  it('should return the config with no recommended', async () => {
    expect(await resolveLint({ lintConfig: baseLintConfig })).toMatchSnapshot();
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
    expect(configWithEmptyExtends).toMatchSnapshot();
  });

  it('should resolve extends with local file config', async () => {
    const config = {
      ...baseLintConfig,
      extends: ['local-config.yaml'],
    };

    const { plugins, ...result } = await resolveLint({
      lintConfig: config,
      configPath,
    });

    expect(result).toMatchSnapshot();
    expect(result?.rules?.['operation-2xx-response']).toEqual('warn');
    expect(plugins).toBeDefined();
    expect(plugins?.length).toBe(2);
  });

  // TODO: fix circular test
  it.skip('should throw circular error', () => {
    const config = {
      ...baseLintConfig,
      extends: ['local-config-with-circular.yaml'],
    };
    expect(() => {resolveLint({ lintConfig: config, configPath })}).toThrow('Circular dependency in config file');
  });

  it('should resolve extends with local file config witch contains path to nested config', async () => {
    const lintConfig = {
      extends: ['local-config-with-file.yaml'],
    };
    const { plugins, ...result } = await resolveLint({
      lintConfig,
      configPath,
    });

    expect(result).toMatchSnapshot();
    expect(result?.rules?.['no-invalid-media-type-examples']).toEqual('warn');
    expect(result?.rules?.['operation-4xx-response']).toEqual('off');
    expect(result?.rules?.['operation-2xx-response']).toEqual('error');
    expect(plugins).toBeDefined();
    expect(plugins?.length).toBe(3);
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

    const apisResult = await resolveApis({ rawConfig, configPath });
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
    expect(apisResult['petstore'].lint).toMatchSnapshot();
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
    expect(apisResult['petstore'].lint.rules).toBeDefined();
    expect(apisResult['petstore'].lint.rules?.['operation-2xx-response']).toEqual('warn');
    expect(apisResult['petstore'].lint.rules?.['operation-4xx-response']).toEqual('error');
    //@ts-ignore
    expect(apisResult['petstore'].lint.plugins.length).toEqual(1);
    expect(apisResult).toMatchSnapshot();
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
    expect(apisResult).toMatchSnapshot();
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
    expect(apis['petstore'].lint.rules).toBeDefined();
    expect(apis['petstore'].lint.rules?.['operation-2xx-response']).toEqual('warn');
    expect(apis['petstore'].lint.rules?.['operation-4xx-response']).toEqual('error');
    //@ts-ignore
    expect(apis['petstore'].lint.plugins.length).toEqual(1);
    expect(apis).toMatchSnapshot();
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
    expect(apis).toMatchSnapshot();
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
    expect(apis).toMatchSnapshot();
  });
});

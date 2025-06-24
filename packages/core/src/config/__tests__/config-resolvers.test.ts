import util from 'node:util';
import { colorize } from '../../logger.js';
import { Asserts, asserts } from '../../rules/common/assertions/asserts.js';
import { resolveGovernanceConfig, resolveApis, resolveConfig } from '../config-resolvers.js';
import recommended from '../recommended.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import type { RawUniversalConfig, RawGovernanceConfig } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const configPath = path.join(__dirname, 'fixtures/resolve-config/redocly.yaml');
const baseGovernanceConfig: RawGovernanceConfig<'built-in'> = {
  rules: {
    'operation-2xx-response': 'warn',
  },
};

const minimalGovernancePreset = resolveGovernanceConfig({
  rootOrApiRawConfig: { ...baseGovernanceConfig, extends: ['minimal'] },
});

const recommendedGovernancePreset = resolveGovernanceConfig({
  rootOrApiRawConfig: { ...baseGovernanceConfig, extends: ['recommended'] },
});

const removeAbsolutePath = (item: string) =>
  item.match(/^.*\/packages\/core\/src\/config\/__tests__\/fixtures\/(.*)$/)![1];

describe('resolveGovernanceConfig', () => {
  it('should return the config with no recommended', async () => {
    const governanceConfig = await resolveGovernanceConfig({
      rootOrApiRawConfig: baseGovernanceConfig,
    });
    expect(governanceConfig.plugins?.length).toEqual(1);
    expect(governanceConfig.plugins?.[0].id).toEqual('');
    expect(governanceConfig.rules).toEqual({
      'operation-2xx-response': 'warn',
    });
  });

  it('should return the config with correct order by preset', async () => {
    expect(
      await resolveGovernanceConfig({
        rootOrApiRawConfig: { ...baseGovernanceConfig, extends: ['minimal', 'recommended'] },
      })
    ).toEqual(await recommendedGovernancePreset);
    expect(
      await resolveGovernanceConfig({
        rootOrApiRawConfig: { ...baseGovernanceConfig, extends: ['recommended', 'minimal'] },
      })
    ).toEqual(await minimalGovernancePreset);
  });

  it('should return the same rootOrApiRawConfig when extends is empty array', async () => {
    const configWithEmptyExtends = await resolveGovernanceConfig({
      rootOrApiRawConfig: { ...baseGovernanceConfig, extends: [] },
    });
    expect(configWithEmptyExtends.plugins?.length).toEqual(1);
    expect(configWithEmptyExtends.plugins?.[0].id).toEqual('');
    expect(configWithEmptyExtends.rules).toEqual({
      'operation-2xx-response': 'warn',
    });
  });

  it('should resolve extends with local file config', async () => {
    const config = {
      ...baseGovernanceConfig,
      extends: ['local-config.yaml'],
    };

    const { plugins, ...governanceConfig } = await resolveGovernanceConfig({
      rootOrApiRawConfig: config,
      configPath,
    });

    expect(governanceConfig?.rules?.['operation-2xx-response']).toEqual('warn');
    expect(plugins).toBeDefined();
    expect(plugins?.length).toBe(2);

    expect(governanceConfig.extendPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/redocly.yaml',
      'resolve-config/local-config.yaml',
      'resolve-config/redocly.yaml',
    ]);
    expect(governanceConfig.pluginPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/plugin.js',
    ]);

    expect(governanceConfig.rules).toEqual({
      'boolean-parameter-prefixes': 'error',
      'local/operation-id-not-test': 'error',
      'no-invalid-media-type-examples': 'error',
      'operation-2xx-response': 'warn',
      'operation-description': 'error',
      'path-http-verbs-order': 'error',
    });
  });

  it('should instantiate the plugin once', async () => {
    // Called by plugin during init
    const deprecateSpy = vi.spyOn(util, 'deprecate');

    const config = {
      ...baseGovernanceConfig,
      extends: ['local-config-with-plugin-init.yaml'],
    };

    await resolveGovernanceConfig({
      rootOrApiRawConfig: config,
      configPath,
    });

    expect(deprecateSpy).toHaveBeenCalledTimes(1);

    await resolveGovernanceConfig({
      rootOrApiRawConfig: config,
      configPath,
    });

    // Should not execute the init logic again
    expect(deprecateSpy).toHaveBeenCalledTimes(1);
  });

  it('should resolve realm plugin properties', async () => {
    const config = {
      ...baseGovernanceConfig,
      extends: ['local-config-with-realm-plugin.yaml'],
    };

    const { plugins } = await resolveGovernanceConfig({
      rootOrApiRawConfig: config,
      configPath,
    });

    const localPlugin = plugins?.find((p) => p.id === 'realm-plugin');
    expect(localPlugin).toBeDefined();

    expect(localPlugin).toMatchObject({
      id: 'realm-plugin',
      processContent: expect.any(Function),
      afterRoutesCreated: expect.any(Function),
      loaders: {
        'test-loader': expect.any(Function),
      },
      requiredEntitlements: ['test-entitlement'],
      ssoConfigSchema: { type: 'object', additionalProperties: true },
      redoclyConfigSchema: { type: 'object', additionalProperties: false },
      ejectIgnore: ['Navbar.tsx', 'Footer.tsx'],
    });
  });

  it('should resolve local file config with esm plugin', async () => {
    const config = {
      ...baseGovernanceConfig,
      extends: ['local-config-with-esm.yaml'],
    };

    const { plugins, ...governanceConfig } = await resolveGovernanceConfig({
      rootOrApiRawConfig: config,
      configPath,
    });

    expect(governanceConfig?.rules?.['operation-2xx-response']).toEqual('warn');
    expect(plugins).toBeDefined();
    expect(plugins?.length).toBe(2);

    const localPlugin = plugins?.find((p) => p.id === 'test-plugin');
    expect(localPlugin).toBeDefined();

    expect(localPlugin).toMatchObject({
      id: 'test-plugin',
      rules: {
        oas3: {
          'test-plugin/oas3-rule-name': 'oas3-rule-stub',
        },
      },
    });

    expect(governanceConfig.extendPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/redocly.yaml',
      'resolve-config/local-config-with-esm.yaml',
      'resolve-config/redocly.yaml',
    ]);
    expect(governanceConfig.pluginPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/plugin-esm.mjs',
    ]);

    expect(governanceConfig.rules).toEqual({
      'operation-2xx-response': 'warn',
    });
  });

  it('should resolve local file config with commonjs plugin with a default export function', async () => {
    const config = {
      ...baseGovernanceConfig,
      extends: ['local-config-with-commonjs-export-function.yaml'],
    };

    const { plugins, ...governanceConfig } = await resolveGovernanceConfig({
      rootOrApiRawConfig: config,
      configPath,
    });

    expect(governanceConfig?.rules?.['operation-2xx-response']).toEqual('warn');
    expect(plugins).toBeDefined();
    expect(plugins?.length).toBe(2);

    const localPlugin = plugins?.find((p) => p.id === 'test-plugin');
    expect(localPlugin).toBeDefined();

    expect(localPlugin).toMatchObject({
      id: 'test-plugin',
      rules: {
        oas3: {
          'test-plugin/oas3-rule-name': 'oas3-rule-stub',
        },
      },
    });

    expect(governanceConfig.extendPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/redocly.yaml',
      'resolve-config/local-config-with-commonjs-export-function.yaml',
      'resolve-config/redocly.yaml',
    ]);
    expect(governanceConfig.pluginPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/plugin-with-export-function.cjs',
    ]);

    expect(governanceConfig.rules).toEqual({
      'operation-2xx-response': 'warn',
    });
  });

  // TODO: fix circular test
  it.skip('should throw circular error', () => {
    const config = {
      ...baseGovernanceConfig,
      extends: ['local-config-with-circular.yaml'],
    };
    expect(() => {
      resolveGovernanceConfig({ rootOrApiRawConfig: config, configPath });
    }).toThrow('Circular dependency in config file');
  });

  it('should resolve extends with local file config which contains path to nested config', async () => {
    const rootOrApiRawConfig = {
      extends: ['local-config-with-file.yaml'],
    };
    const { plugins, ...governanceConfig } = await resolveGovernanceConfig({
      rootOrApiRawConfig,
      configPath,
    });

    expect(governanceConfig?.rules?.['no-invalid-media-type-examples']).toEqual('warn');
    expect(governanceConfig?.rules?.['operation-4xx-response']).toEqual('off');
    expect(governanceConfig?.rules?.['operation-2xx-response']).toEqual('error');
    expect(plugins).toBeDefined();
    expect(plugins?.length).toBe(3);

    expect(governanceConfig.extendPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/redocly.yaml',
      'resolve-config/local-config-with-file.yaml',
      'resolve-config/api/nested-config.yaml',
      'resolve-config/redocly.yaml',
    ]);
    expect(governanceConfig.pluginPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/api/plugin.js',
      'resolve-config/plugin.js',
      'resolve-config/api/plugin.js',
    ]);

    governanceConfig.extendPaths = ['extend paths stub'];
    governanceConfig.pluginPaths = ['plugin paths stub'];
    expect(governanceConfig).toMatchSnapshot();
  });

  it('should resolve custom assertion from plugin', async () => {
    const rootOrApiRawConfig = {
      extends: ['local-config-with-custom-function.yaml'],
    };
    const { plugins } = await resolveGovernanceConfig({
      rootOrApiRawConfig,
      configPath,
    });

    expect(plugins).toBeDefined();
    expect(plugins?.length).toBe(2);
    expect(asserts['test-plugin/checkWordsCount' as keyof Asserts]).toBeDefined();
  });

  it('should throw error when custom assertion load not exist plugin', async () => {
    const rootOrApiRawConfig = {
      extends: ['local-config-with-wrong-custom-function.yaml'],
    };
    try {
      await resolveGovernanceConfig({
        rootOrApiRawConfig,
        configPath,
      });
    } catch (e) {
      expect(e.message.toString()).toContain(
        `Plugin ${colorize.red(
          'test-plugin'
        )} doesn't export assertions function with name ${colorize.red('checkWordsCount2')}.`
      );
    }

    expect(asserts['test-plugin/checkWordsCount' as keyof Asserts]).toBeDefined();
  });

  it('should correctly merge assertions from nested config', async () => {
    const rootOrApiRawConfig = {
      extends: ['local-config-with-file.yaml'],
    };

    const governanceConfig = await resolveGovernanceConfig({
      rootOrApiRawConfig,
      configPath,
    });

    expect(Array.isArray(governanceConfig.rules?.assertions)).toEqual(true);
    expect(governanceConfig.rules?.assertions).toMatchObject([
      {
        subject: 'PathItem',
        property: 'get',
        message: 'Every path item must have a GET operation.',
        defined: true,
        assertionId: 'rule/path-item-get-defined',
      },
      {
        subject: 'Tag',
        property: 'description',
        message: 'Tag description must be at least 13 characters and end with a full stop.',
        severity: 'error',
        minLength: 13,
        pattern: '/\\.$/',
        assertionId: 'rule/tag-description',
      },
    ]);
  });

  it('should resolve extends with url file config which contains path to nested config', async () => {
    const rootOrApiRawConfig = {
      // This points to ./fixtures/resolve-remote-configs/remote-config.yaml
      extends: [
        'https://raw.githubusercontent.com/Redocly/redocly-cli/main/packages/core/src/config/__tests__/fixtures/resolve-remote-configs/remote-config.yaml',
      ],
    };

    const { plugins, ...governanceConfig } = await resolveGovernanceConfig({
      rootOrApiRawConfig,
      configPath,
    });

    expect(governanceConfig?.rules?.['operation-4xx-response']).toEqual('error');
    expect(governanceConfig?.rules?.['operation-2xx-response']).toEqual('error');
    expect(Object.keys(governanceConfig.rules || {}).length).toBe(2);

    expect(governanceConfig.extendPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/redocly.yaml',
      'resolve-config/redocly.yaml',
    ]);
    expect(governanceConfig.pluginPaths!.map(removeAbsolutePath)).toEqual([]);
  });
  it('should resolve `recommended-strict` ruleset correctly', async () => {
    const expectedStrict = JSON.parse(
      JSON.stringify(recommended)
    ) as RawGovernanceConfig<'built-in'>;
    for (const section of Object.values(expectedStrict)) {
      for (let ruleName in section) {
        if (section[ruleName] === 'warn') {
          section[ruleName] = 'error';
        }
        // @ts-ignore
        if (section[ruleName]?.severity === 'warn') {
          // @ts-ignore
          section[ruleName].severity = 'error';
        }
      }
    }
    const recommendedStrictPreset = JSON.parse(
      JSON.stringify(
        await resolveGovernanceConfig({
          rootOrApiRawConfig: { extends: ['recommended-strict'] },
        })
      )
    );
    expect(recommendedStrictPreset).toMatchObject(expectedStrict);
  });
});

describe('resolveApis', () => {
  it('should resolve apis rootOrApiRawConfig and merge minimal extends', async () => {
    const baseGovernanceConfig: RawGovernanceConfig<'built-in'> = {
      oas3_1Rules: {
        'operation-2xx-response': 'error',
      },
    };
    const mergedGovernancePreset = resolveGovernanceConfig({
      rootOrApiRawConfig: { ...baseGovernanceConfig, extends: ['minimal'] },
    });
    const rawConfig: RawUniversalConfig = {
      apis: {
        petstore: {
          root: 'some/path',
          oas3_1Rules: {
            'operation-2xx-response': 'error',
          },
        },
      },
      extends: ['minimal'],
    };
    const apisResult = await resolveApis({ rawConfig });
    expect(apisResult['petstore']).toEqual({
      ...(await mergedGovernancePreset),
      root: 'some/path',
    });
  });

  it('should not merge recommended extends by default by every level', async () => {
    const rawConfig: RawUniversalConfig = {
      apis: {
        petstore: {
          root: 'some/path',
        },
      },
    };

    const apisResult = await resolveApis({ rawConfig, configPath });

    expect(apisResult['petstore'].extendPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/redocly.yaml',
    ]);
    expect(apisResult['petstore'].pluginPaths!.map(removeAbsolutePath)).toEqual([]);

    expect(apisResult['petstore'].rules).toEqual({});
    expect(apisResult['petstore'].plugins?.length).toEqual(1);
    expect(apisResult['petstore'].plugins?.[0].id).toEqual('');
  });

  it('should resolve apis rootOrApiRawConfig when it contains file and not set recommended', async () => {
    const rawConfig: RawUniversalConfig = {
      apis: {
        petstore: {
          root: 'some/path',
          rules: {
            'operation-4xx-response': 'error',
          },
        },
      },
      rules: {
        'operation-2xx-response': 'warn',
      },
    };

    const apisResult = await resolveApis({ rawConfig, configPath });
    expect(apisResult['petstore'].rules).toEqual({
      'operation-2xx-response': 'warn',
      'operation-4xx-response': 'error',
    });
    expect(apisResult['petstore'].plugins?.length).toEqual(1);
    expect(apisResult['petstore'].plugins?.[0].id).toEqual('');

    expect(apisResult['petstore'].extendPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/redocly.yaml',
    ]);
    expect(apisResult['petstore'].pluginPaths!.map(removeAbsolutePath)).toEqual([]);
  });

  it('should resolve apis rootOrApiRawConfig when it contains file', async () => {
    const rawConfig: RawUniversalConfig = {
      apis: {
        petstore: {
          root: 'some/path',
          extends: ['local-config.yaml'],
          rules: {
            'operation-4xx-response': 'error',
          },
        },
      },
      extends: ['minimal'],
      rules: {
        'operation-2xx-response': 'warn',
      },
    };

    const apisResult = await resolveApis({ rawConfig, configPath });
    expect(apisResult['petstore'].rules).toBeDefined();
    expect(apisResult['petstore'].rules?.['operation-2xx-response']).toEqual('warn');
    expect(apisResult['petstore'].rules?.['operation-4xx-response']).toEqual('error');
    expect(apisResult['petstore'].rules?.['local/operation-id-not-test']).toEqual('error');
    expect(apisResult['petstore'].plugins?.length).toEqual(2);

    expect(apisResult['petstore'].extendPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/redocly.yaml',
      'resolve-config/local-config.yaml',
      'resolve-config/redocly.yaml',
    ]);
    expect(apisResult['petstore'].pluginPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/plugin.js',
    ]);
  });
});

describe('resolveConfig', () => {
  it('should NOT add recommended to top level by default IF there is a config file', async () => {
    const rawConfig: RawUniversalConfig = {
      apis: {
        petstore: {
          root: 'some/path',
          rules: {
            'operation-4xx-response': 'error',
          },
        },
      },
      rules: {
        'operation-2xx-response': 'warn',
      },
    };

    const { apis = {} } = await resolveConfig({ rawConfig, configPath });

    expect(apis['petstore'].plugins?.length).toEqual(1);
    expect(apis['petstore'].plugins?.[0].id).toEqual('');

    expect(apis['petstore'].extendPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/redocly.yaml',
    ]);
    expect(apis['petstore'].pluginPaths!.map(removeAbsolutePath)).toEqual([]);

    expect(apis['petstore'].rules).toEqual({
      'operation-2xx-response': 'warn',
      'operation-4xx-response': 'error',
    });
  });

  it('should not add recommended to top level by default when apis have extends file', async () => {
    const rawConfig: RawUniversalConfig = {
      apis: {
        petstore: {
          root: 'some/path',
          extends: ['local-config.yaml'],
          rules: {
            'operation-4xx-response': 'error',
          },
        },
      },
      rules: {
        'operation-2xx-response': 'warn',
      },
    };

    const { apis = {} } = await resolveConfig({ rawConfig, configPath });
    expect(apis['petstore'].rules).toBeDefined();
    expect(Object.keys(apis['petstore'].rules || {}).length).toEqual(7);
    expect(apis['petstore'].rules?.['operation-2xx-response']).toEqual('warn');
    expect(apis['petstore'].rules?.['operation-4xx-response']).toEqual('error');
    expect(apis['petstore'].rules?.['operation-description']).toEqual('error'); // from extends file config

    expect(apis['petstore'].plugins?.length).toEqual(2);

    expect(apis['petstore'].extendPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/redocly.yaml',
      'resolve-config/local-config.yaml',
      'resolve-config/redocly.yaml',
    ]);
    expect(apis['petstore'].pluginPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/plugin.js',
    ]);
  });

  it('should ignore minimal from the root and read local file', async () => {
    const rawConfig: RawUniversalConfig = {
      apis: {
        petstore: {
          root: 'some/path',
          extends: ['recommended', 'local-config.yaml'],
          rules: {
            'operation-4xx-response': 'error',
          },
        },
      },
      extends: ['minimal'],
      rules: {
        'operation-2xx-response': 'warn',
      },
    };

    const { apis = {} } = await resolveConfig({ rawConfig, configPath });
    expect(apis['petstore'].rules).toBeDefined();
    expect(apis['petstore'].rules?.['operation-2xx-response']).toEqual('warn');
    expect(apis['petstore'].rules?.['operation-4xx-response']).toEqual('error');
    expect(apis['petstore'].rules?.['operation-description']).toEqual('error'); // from extends file config

    expect(apis['petstore'].plugins?.length).toEqual(2);
    delete apis['petstore'].plugins;

    expect(apis['petstore'].extendPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/redocly.yaml',
      'resolve-config/local-config.yaml',
      'resolve-config/redocly.yaml',
    ]);
    expect(apis['petstore'].pluginPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/plugin.js',
    ]);

    delete apis['petstore'].extendPaths;
    delete apis['petstore'].pluginPaths;
    expect(apis['petstore']).toMatchSnapshot();
  });

  it('should default to the extends from the main config if no extends defined', async () => {
    const rawConfig: RawUniversalConfig = {
      apis: {
        petstore: {
          root: 'some/path',
          rules: {
            'operation-4xx-response': 'error',
          },
        },
      },
      extends: ['minimal'],
      rules: {
        'operation-2xx-response': 'warn',
      },
    };

    const { apis = {} } = await resolveConfig({ rawConfig, configPath });
    expect(apis['petstore'].rules).toBeDefined();
    expect(apis['petstore'].rules?.['operation-2xx-response']).toEqual('warn'); // from minimal ruleset
  });
});

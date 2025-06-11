import util from 'node:util';
import { colorize } from '../../logger.js';
import { Asserts, asserts } from '../../rules/common/assertions/asserts.js';
import { resolveStyleguideConfig, resolveApis, resolveConfig } from '../config-resolvers.js';
import recommended from '../recommended.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import type { RawUniversalConfig, RawGovernanceConfig } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const configPath = path.join(__dirname, 'fixtures/resolve-config/redocly.yaml');
const baseStyleguideConfig: RawGovernanceConfig<'built-in'> = {
  rules: {
    'operation-2xx-response': 'warn',
  },
};

const minimalStyleguidePreset = resolveStyleguideConfig({
  styleguideConfig: { ...baseStyleguideConfig, extends: ['minimal'] },
});

const recommendedStyleguidePreset = resolveStyleguideConfig({
  styleguideConfig: { ...baseStyleguideConfig, extends: ['recommended'] },
});

const removeAbsolutePath = (item: string) =>
  item.match(/^.*\/packages\/core\/src\/config\/__tests__\/fixtures\/(.*)$/)![1];

describe('resolveStyleguideConfig', () => {
  it('should return the config with no recommended', async () => {
    const styleguide = await resolveStyleguideConfig({ styleguideConfig: baseStyleguideConfig });
    expect(styleguide.plugins?.length).toEqual(1);
    expect(styleguide.plugins?.[0].id).toEqual('');
    expect(styleguide.rules).toEqual({
      'operation-2xx-response': 'warn',
    });
  });

  it('should return the config with correct order by preset', async () => {
    expect(
      await resolveStyleguideConfig({
        styleguideConfig: { ...baseStyleguideConfig, extends: ['minimal', 'recommended'] },
      })
    ).toEqual(await recommendedStyleguidePreset);
    expect(
      await resolveStyleguideConfig({
        styleguideConfig: { ...baseStyleguideConfig, extends: ['recommended', 'minimal'] },
      })
    ).toEqual(await minimalStyleguidePreset);
  });

  it('should return the same styleguideConfig when extends is empty array', async () => {
    const configWithEmptyExtends = await resolveStyleguideConfig({
      styleguideConfig: { ...baseStyleguideConfig, extends: [] },
    });
    expect(configWithEmptyExtends.plugins?.length).toEqual(1);
    expect(configWithEmptyExtends.plugins?.[0].id).toEqual('');
    expect(configWithEmptyExtends.rules).toEqual({
      'operation-2xx-response': 'warn',
    });
  });

  it('should resolve extends with local file config', async () => {
    const config = {
      ...baseStyleguideConfig,
      extends: ['local-config.yaml'],
    };

    const { plugins, ...styleguide } = await resolveStyleguideConfig({
      styleguideConfig: config,
      configPath,
    });

    expect(styleguide?.rules?.['operation-2xx-response']).toEqual('warn');
    expect(plugins).toBeDefined();
    expect(plugins?.length).toBe(2);

    expect(styleguide.extendPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/redocly.yaml',
      'resolve-config/local-config.yaml',
      'resolve-config/redocly.yaml',
    ]);
    expect(styleguide.pluginPaths!.map(removeAbsolutePath)).toEqual(['resolve-config/plugin.js']);

    expect(styleguide.rules).toEqual({
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
      ...baseStyleguideConfig,
      extends: ['local-config-with-plugin-init.yaml'],
    };

    await resolveStyleguideConfig({
      styleguideConfig: config,
      configPath,
    });

    expect(deprecateSpy).toHaveBeenCalledTimes(1);

    await resolveStyleguideConfig({
      styleguideConfig: config,
      configPath,
    });

    // Should not execute the init logic again
    expect(deprecateSpy).toHaveBeenCalledTimes(1);
  });

  it('should resolve realm plugin properties', async () => {
    const config = {
      ...baseStyleguideConfig,
      extends: ['local-config-with-realm-plugin.yaml'],
    };

    const { plugins } = await resolveStyleguideConfig({
      styleguideConfig: config,
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
      ...baseStyleguideConfig,
      extends: ['local-config-with-esm.yaml'],
    };

    const { plugins, ...styleguide } = await resolveStyleguideConfig({
      styleguideConfig: config,
      configPath,
    });

    expect(styleguide?.rules?.['operation-2xx-response']).toEqual('warn');
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

    expect(styleguide.extendPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/redocly.yaml',
      'resolve-config/local-config-with-esm.yaml',
      'resolve-config/redocly.yaml',
    ]);
    expect(styleguide.pluginPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/plugin-esm.mjs',
    ]);

    expect(styleguide.rules).toEqual({
      'operation-2xx-response': 'warn',
    });
  });

  it('should resolve local file config with commonjs plugin with a default export function', async () => {
    const config = {
      ...baseStyleguideConfig,
      extends: ['local-config-with-commonjs-export-function.yaml'],
    };

    const { plugins, ...styleguide } = await resolveStyleguideConfig({
      styleguideConfig: config,
      configPath,
    });

    expect(styleguide?.rules?.['operation-2xx-response']).toEqual('warn');
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

    expect(styleguide.extendPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/redocly.yaml',
      'resolve-config/local-config-with-commonjs-export-function.yaml',
      'resolve-config/redocly.yaml',
    ]);
    expect(styleguide.pluginPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/plugin-with-export-function.cjs',
    ]);

    expect(styleguide.rules).toEqual({
      'operation-2xx-response': 'warn',
    });
  });

  // TODO: fix circular test
  it.skip('should throw circular error', () => {
    const config = {
      ...baseStyleguideConfig,
      extends: ['local-config-with-circular.yaml'],
    };
    expect(() => {
      resolveStyleguideConfig({ styleguideConfig: config, configPath });
    }).toThrow('Circular dependency in config file');
  });

  it('should resolve extends with local file config which contains path to nested config', async () => {
    const styleguideConfig = {
      extends: ['local-config-with-file.yaml'],
    };
    const { plugins, ...styleguide } = await resolveStyleguideConfig({
      styleguideConfig,
      configPath,
    });

    expect(styleguide?.rules?.['no-invalid-media-type-examples']).toEqual('warn');
    expect(styleguide?.rules?.['operation-4xx-response']).toEqual('off');
    expect(styleguide?.rules?.['operation-2xx-response']).toEqual('error');
    expect(plugins).toBeDefined();
    expect(plugins?.length).toBe(3);

    expect(styleguide.extendPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/redocly.yaml',
      'resolve-config/local-config-with-file.yaml',
      'resolve-config/api/nested-config.yaml',
      'resolve-config/redocly.yaml',
    ]);
    expect(styleguide.pluginPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/api/plugin.js',
      'resolve-config/plugin.js',
      'resolve-config/api/plugin.js',
    ]);

    // @ts-ignore
    delete styleguide.extendPaths;
    // @ts-ignore
    delete styleguide.pluginPaths;
    expect(styleguide).toMatchSnapshot();
  });

  it('should resolve custom assertion from plugin', async () => {
    const styleguideConfig = {
      extends: ['local-config-with-custom-function.yaml'],
    };
    const { plugins } = await resolveStyleguideConfig({
      styleguideConfig,
      configPath,
    });

    expect(plugins).toBeDefined();
    expect(plugins?.length).toBe(2);
    expect(asserts['test-plugin/checkWordsCount' as keyof Asserts]).toBeDefined();
  });

  it('should throw error when custom assertion load not exist plugin', async () => {
    const styleguideConfig = {
      extends: ['local-config-with-wrong-custom-function.yaml'],
    };
    try {
      await resolveStyleguideConfig({
        styleguideConfig,
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
    const styleguideConfig = {
      extends: ['local-config-with-file.yaml'],
    };

    const styleguide = await resolveStyleguideConfig({
      styleguideConfig,
      configPath,
    });

    expect(Array.isArray(styleguide.rules?.assertions)).toEqual(true);
    expect(styleguide.rules?.assertions).toMatchObject([
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
    const styleguideConfig = {
      // This points to ./fixtures/resolve-remote-configs/remote-config.yaml
      extends: [
        'https://raw.githubusercontent.com/Redocly/redocly-cli/main/packages/core/src/config/__tests__/fixtures/resolve-remote-configs/remote-config.yaml',
      ],
    };

    const { plugins, ...styleguide } = await resolveStyleguideConfig({
      styleguideConfig,
      configPath,
    });

    expect(styleguide?.rules?.['operation-4xx-response']).toEqual('error');
    expect(styleguide?.rules?.['operation-2xx-response']).toEqual('error');
    expect(Object.keys(styleguide.rules || {}).length).toBe(2);

    expect(styleguide.extendPaths!.map(removeAbsolutePath)).toEqual([
      'resolve-config/redocly.yaml',
      'resolve-config/redocly.yaml',
    ]);
    expect(styleguide.pluginPaths!.map(removeAbsolutePath)).toEqual([]);
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
        await resolveStyleguideConfig({
          styleguideConfig: { extends: ['recommended-strict'] },
        })
      )
    );
    expect(recommendedStrictPreset).toMatchObject(expectedStrict);
  });
});

describe('resolveApis', () => {
  it('should resolve apis styleguideConfig and merge minimal extends', async () => {
    const baseStyleguideConfig: RawGovernanceConfig<'built-in'> = {
      oas3_1Rules: {
        'operation-2xx-response': 'error',
      },
    };
    const mergedStyleguidePreset = resolveStyleguideConfig({
      styleguideConfig: { ...baseStyleguideConfig, extends: ['minimal'] },
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
      ...(await mergedStyleguidePreset),
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

  it('should resolve apis styleguideConfig when it contains file and not set recommended', async () => {
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

  it('should resolve apis styleguideConfig when it contains file', async () => {
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
    expect(apisResult['petstore'].rules?.['operation-2xx-response']).toEqual('warn'); // think about prioritize in merge ???
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

    expect(apis['petstore'].recommendedFallback).toBe(undefined);
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

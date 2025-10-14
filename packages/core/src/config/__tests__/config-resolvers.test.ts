import util from 'node:util';
import { colorize } from '../../logger.js';
import { Asserts, asserts } from '../../rules/common/assertions/asserts.js';
import { resolveConfig } from '../config-resolvers.js';
import recommended from '../recommended.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';

import type { RawUniversalConfig, RawGovernanceConfig } from '../types.js';
import { Source } from '../../resolve.js';
import { Config } from '../config.js';
import { SpecVersion } from '../../oas-types.js';
import { after } from 'node:test';

vi.mock('node:module', () => ({
  default: {
    createRequire: () => ({
      resolve: (path: string) => `/mock/path/${path}`,
    }),
  },
}));

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const configPath = path.join(__dirname, 'fixtures/resolve-config/redocly.yaml');
const baseGovernanceConfig: RawGovernanceConfig = {
  rules: {
    'operation-2xx-response': 'warn',
  },
};

const minimalGovernancePreset = resolveConfig({
  rawConfigDocument: makeDocument({ ...baseGovernanceConfig, extends: ['minimal'] }),
});

const recommendedGovernancePreset = resolveConfig({
  rawConfigDocument: makeDocument({ ...baseGovernanceConfig, extends: ['recommended'] }),
});

function makeDocument(rawConfig: RawUniversalConfig, configPath: string = '') {
  return {
    source: new Source(configPath, JSON.stringify(rawConfig)),
    parsed: rawConfig,
  };
}

describe('resolveConfig', () => {
  it('should return the config with no recommended', async () => {
    const { resolvedConfig, plugins } = await resolveConfig({
      rawConfigDocument: makeDocument(baseGovernanceConfig),
    });
    expect(plugins?.length).toEqual(1);
    expect(plugins?.[0].id).toEqual('');
    expect(resolvedConfig.rules).toEqual({
      'operation-2xx-response': 'warn',
    });
  });

  it('should return the config with correct order by preset', async () => {
    expect(
      await resolveConfig({
        rawConfigDocument: makeDocument({
          ...baseGovernanceConfig,
          extends: ['minimal', 'recommended'],
        }),
      })
    ).toEqual(await recommendedGovernancePreset);
    expect(
      await resolveConfig({
        rawConfigDocument: makeDocument({
          ...baseGovernanceConfig,
          extends: ['recommended', 'minimal'],
        }),
      })
    ).toEqual(await minimalGovernancePreset);
  });

  it('should return the same rootOrApiRawConfig when extends is empty array', async () => {
    const { resolvedConfig, plugins } = await resolveConfig({
      rawConfigDocument: makeDocument({ ...baseGovernanceConfig, extends: [] }),
    });
    expect(plugins?.length).toEqual(1);
    expect(plugins?.[0].id).toEqual('');
    expect(resolvedConfig.rules).toEqual({
      'operation-2xx-response': 'warn',
    });
  });

  it('should resolve extends with local file config', async () => {
    const config = {
      ...baseGovernanceConfig,
      extends: ['local-config.yaml'],
    };

    const { plugins, resolvedConfig } = await resolveConfig({
      rawConfigDocument: makeDocument(config, configPath),
      configPath,
    });

    expect(resolvedConfig?.rules?.['operation-2xx-response']).toEqual('warn');
    expect(plugins).toBeDefined();
    expect(plugins?.length).toBe(2);

    expect(resolvedConfig.rules).toEqual({
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

    await resolveConfig({
      rawConfigDocument: makeDocument(config, configPath),
      configPath,
    });

    expect(deprecateSpy).toHaveBeenCalledTimes(1);

    await resolveConfig({
      rawConfigDocument: makeDocument(config, configPath),
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

    const { plugins } = await resolveConfig({
      rawConfigDocument: makeDocument(config, configPath),
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

    const { plugins, resolvedConfig } = await resolveConfig({
      rawConfigDocument: makeDocument(config, configPath),
      configPath,
    });

    expect(resolvedConfig?.rules?.['operation-2xx-response']).toEqual('warn');
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

    expect(resolvedConfig.rules).toEqual({
      'operation-2xx-response': 'warn',
    });
  });

  it('should resolve local file config with commonjs plugin with a default export function', async () => {
    const config = {
      ...baseGovernanceConfig,
      extends: ['local-config-with-commonjs-export-function.yaml'],
    };

    const { plugins, resolvedConfig } = await resolveConfig({
      rawConfigDocument: makeDocument(config, configPath),
      configPath,
    });

    expect(resolvedConfig?.rules?.['operation-2xx-response']).toEqual('warn');
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

    expect(resolvedConfig.rules).toEqual({
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
      resolveConfig({ rawConfigDocument: makeDocument(config, configPath), configPath });
    }).toThrow('Circular dependency in config file');
  });

  it('should resolve extends with local file config which contains path to nested config', async () => {
    const rootOrApiRawConfig = {
      extends: ['local-config-with-file.yaml'],
    };
    const { plugins, resolvedConfig } = await resolveConfig({
      rawConfigDocument: makeDocument(rootOrApiRawConfig, configPath),
      configPath,
    });

    expect(resolvedConfig?.rules?.['no-invalid-media-type-examples']).toEqual('warn');
    expect(resolvedConfig?.rules?.['operation-4xx-response']).toEqual('off');
    expect(resolvedConfig?.rules?.['operation-2xx-response']).toEqual('error');
    expect(plugins).toBeDefined();
    expect(plugins?.length).toBe(3);
    expect(
      plugins
        ?.filter(({ id }) => id !== '') // filter out the default plugin
        .map(({ absolutePath, path, ...rest }) => ({
          ...rest,
          absolutePath: absolutePath?.replace(__dirname, '...'),
          path: path?.replace(__dirname, '...'),
        })) // clean up absolute paths
    ).toMatchSnapshot();

    expect(resolvedConfig).toMatchSnapshot();
  });

  it('should resolve custom assertion from plugin', async () => {
    const rootOrApiRawConfig = {
      extends: ['local-config-with-custom-function.yaml'],
    };
    const { plugins, resolvedConfig } = await resolveConfig({
      rawConfigDocument: makeDocument(rootOrApiRawConfig, configPath),
      configPath,
    });

    // instantiate the config to register custom assertions
    new Config(resolvedConfig, { plugins });

    expect(plugins).toBeDefined();
    expect(plugins?.length).toBe(2);
    expect(asserts['test-plugin/checkWordsCount' as keyof Asserts]).toBeDefined();
  });

  it('should throw error when custom assertion load not exist plugin', async () => {
    const rootOrApiRawConfig = {
      extends: ['local-config-with-wrong-custom-function.yaml'],
    };
    try {
      const config = await resolveConfig({
        rawConfigDocument: makeDocument(rootOrApiRawConfig, configPath),
        configPath,
      });
      new Config(config.resolvedConfig, { plugins: config.plugins });
    } catch (e) {
      expect(e.message.toString()).toContain(
        `Plugin test-plugin doesn't export assertions function with name checkWordsCount2.`
      );
    }
  });

  it('should correctly merge assertions from nested config', async () => {
    const rootOrApiRawConfig = {
      extends: ['local-config-with-file.yaml'],
    };

    const { resolvedConfig } = await resolveConfig({
      rawConfigDocument: makeDocument(rootOrApiRawConfig, configPath),
      configPath,
    });

    const config = new Config(resolvedConfig, { plugins: [] });

    expect(Array.isArray(config.rules.oas3_1.assertions)).toEqual(true);
    expect(config.rules.oas3_1.assertions).toMatchObject([
      {
        subject: { type: 'PathItem', property: 'get' },
        message: 'Every path item must have a GET operation.',
        assertions: {
          defined: true,
        },
        assertionId: 'rule/path-item-get-defined',
      },
      {
        subject: { type: 'Tag', property: 'description' },
        message: 'Tag description must be at least 13 characters and end with a full stop.',
        severity: 'error',
        assertions: {
          minLength: 13,
          pattern: '/\\.$/',
        },
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

    const { resolvedConfig } = await resolveConfig({
      rawConfigDocument: makeDocument(rootOrApiRawConfig, configPath),
      configPath,
    });

    expect(resolvedConfig?.rules?.['operation-4xx-response']).toEqual('error');
    expect(resolvedConfig?.rules?.['operation-2xx-response']).toEqual('error');
    expect(Object.keys(resolvedConfig.rules || {}).length).toBe(2);
  });
  it('should resolve `recommended-strict` ruleset correctly', async () => {
    const expectedStrict = JSON.parse(JSON.stringify(recommended)) as Omit<
      RawGovernanceConfig,
      'extends' | 'plugins'
    >;
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
        (
          await resolveConfig({
            rawConfigDocument: makeDocument({ extends: ['recommended-strict'] }, configPath),
          })
        ).resolvedConfig
      )
    );
    expect(recommendedStrictPreset).toMatchObject(expectedStrict);
  });

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

    const {
      resolvedConfig: { apis = {} },
      plugins,
    } = await resolveConfig({ rawConfigDocument: makeDocument(rawConfig, configPath) });

    expect(plugins?.length).toEqual(1);
    expect(plugins?.[0].id).toEqual('');

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

    const {
      resolvedConfig: { apis = {} },
      plugins,
    } = await resolveConfig({ rawConfigDocument: makeDocument(rawConfig, configPath) });
    expect(apis['petstore'].rules).toBeDefined();
    expect(Object.keys(apis['petstore'].rules || {}).length).toEqual(7);
    expect(apis['petstore'].rules?.['operation-2xx-response']).toEqual('off');
    expect(apis['petstore'].rules?.['operation-4xx-response']).toEqual('error');
    expect(apis['petstore'].rules?.['operation-description']).toEqual('error'); // from extends file config

    expect(plugins?.length).toEqual(2); // all plugins
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

    const {
      resolvedConfig: { apis = {} },
      plugins,
    } = await resolveConfig({ rawConfigDocument: makeDocument(rawConfig, configPath) });
    expect(apis['petstore'].rules).toBeDefined();
    expect(apis['petstore'].rules?.['operation-2xx-response']).toEqual('off');
    expect(apis['petstore'].rules?.['operation-4xx-response']).toEqual('error');
    expect(apis['petstore'].rules?.['operation-description']).toEqual('error'); // from extends file config

    expect(plugins?.length).toEqual(2);

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

    const {
      resolvedConfig: { apis = {} },
    } = await resolveConfig({ rawConfigDocument: makeDocument(rawConfig, configPath) });
    expect(apis['petstore'].rules).toBeDefined();
    expect(apis['petstore'].rules?.['operation-2xx-response']).toEqual('warn'); // from minimal ruleset
  });
});

describe('resolveApis', () => {
  it('should resolve apis rootOrApiRawConfig and merge minimal extends', async () => {
    const baseGovernanceConfig: RawGovernanceConfig = {
      oas3_1Rules: {
        'operation-2xx-response': 'error',
      },
    };
    const mergedGovernancePreset = await resolveConfig({
      rawConfigDocument: makeDocument(
        { ...baseGovernanceConfig, extends: ['minimal'] },
        configPath
      ),
    });
    const {
      resolvedConfig: { plugins, ...mergedGovernancePresetResolved },
    } = mergedGovernancePreset;
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
    const {
      resolvedConfig: { apis },
    } = await resolveConfig({ rawConfigDocument: makeDocument(rawConfig, configPath) });
    expect(apis).toEqual({
      petstore: {
        ...mergedGovernancePresetResolved,
        root: 'some/path',
      },
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

    const {
      resolvedConfig: { apis },
      plugins,
    } = await resolveConfig({ rawConfigDocument: makeDocument(rawConfig, configPath) });

    expect(apis?.['petstore'].rules).toEqual({});
    expect(plugins?.length).toEqual(1);
    expect(plugins?.[0].id).toEqual('');
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

    const {
      resolvedConfig: { apis },
      plugins,
    } = await resolveConfig({ rawConfigDocument: makeDocument(rawConfig, configPath) });
    expect(apis?.['petstore'].rules).toEqual({
      'operation-2xx-response': 'warn',
      'operation-4xx-response': 'error',
    });
    expect(plugins?.length).toEqual(1);
    expect(plugins?.[0].id).toEqual('');
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

    const {
      resolvedConfig: { apis, rules },
      plugins,
    } = await resolveConfig({ rawConfigDocument: makeDocument(rawConfig, configPath) });
    expect(apis?.['petstore'].rules).toBeDefined();
    expect(apis?.['petstore'].rules?.['operation-2xx-response']).toEqual('off');
    expect(apis?.['petstore'].rules?.['operation-4xx-response']).toEqual('error');
    expect(apis?.['petstore'].rules?.['local/operation-id-not-test']).toEqual('error');
    expect(plugins?.length).toEqual(2);
    expect(rules?.['operation-2xx-response']).toEqual('warn');
  });

  it('should work with npm dependencies', async () => {
    after(() => {
      (globalThis as any).__webpack_require__ = undefined;
      (globalThis as any).__non_webpack_require__ = undefined;
    });

    (globalThis as any).__webpack_require__ = () => {};
    (globalThis as any).__non_webpack_require__ = (p: string) =>
      p === '/mock/path/test-plugin'
        ? {
            id: 'npm-test-plugin',
          }
        : {
            id: 'local-test-plugin',
          };

    const { resolvedConfig } = await resolveConfig({
      rawConfigDocument: makeDocument(
        { plugins: ['test-plugin', 'fixtures/plugin.cjs'] },
        configPath
      ),
    });
    expect(resolvedConfig.plugins).toEqual(['test-plugin', 'fixtures/plugin.cjs']);
  });

  it('should work with nested schema', async () => {
    const { resolvedConfig } = await resolveConfig({
      rawConfigDocument: makeDocument(
        {
          rules: {
            'metadata-schema': {
              type: 'object',
              properties: {
                'service-domain': {
                  $ref: 'sd.yaml',
                },
              },
            },
          },
        },
        configPath
      ),
    });
    expect(resolvedConfig?.rules?.['metadata-schema']).toEqual({
      type: 'object',
      properties: {
        'service-domain': {
          type: 'string',
          enum: ['api', 'data'],
        },
      },
    });
  });
});

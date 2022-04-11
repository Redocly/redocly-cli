import * as load from '../load';
import type { LintRawConfig } from '../types';
import { resolveApis } from '../utils';

const path = require('path');

describe('resolveExtends', () => {
  const baseLintConfig: LintRawConfig = {
    rules: {
      'operation-2xx-response': 'warn',
    },
  };
  const configPath = path.join(__dirname, 'fixtures/resolve/.redocly.yaml');

  it('should return the same lintConfig when extends is empty array or undefined', async () => {
    expect(await load.resolveExtends({ lintConfig: baseLintConfig })).toEqual(baseLintConfig);
    const configWithEmptyExtends = { lintConfig: { ...baseLintConfig, extends: [] } };
    expect(await load.resolveExtends(configWithEmptyExtends)).toEqual(
      configWithEmptyExtends.lintConfig,
    );
  });

  it('should resolve extends with local file config', async () => {
    const expectedResult = {
      decorators: {},
      extends: ['test-plugin/all'],
      preprocessors: {},
      rules: {
        'no-invalid-media-type-examples': 'error',
        'operation-2xx-response': 'warn',
        'operation-description': 'error',
        'path-http-verbs-order': 'error',
      },
    };

    const config = {
      ...baseLintConfig,
      extends: ['local-config.yaml'],
    };
    const { plugins, ...result } = await load.resolveExtends({
      lintConfig: config,
      configPath,
    });
    expect(result).toEqual(expectedResult);
    expect(plugins).toBeDefined();
    expect(plugins?.length).toBe(1);
  });

  it('should resolve extends with local file config witch contains path to nested config', async () => {
    const expectedResult = {
      decorators: {},
      extends: ['recommended', 'test-plugin-nested/all', 'test-plugin/all'],
      preprocessors: {},
      rules: {
        'no-invalid-media-type-examples': 'warn',
        'operation-2xx-response': 'error',
      },
    };

    const lintConfig = {
      extends: ['local-config-with-file.yaml'],
    };
    const { plugins, ...result } = await load.resolveExtends({
      lintConfig,
      configPath,
    });
    expect(result).toEqual(expectedResult);
    expect(plugins).toBeDefined();
    expect(plugins?.length).toBe(2);
  });
});


describe('resolveApis', () => {
  const configPath = path.join(__dirname, 'fixtures/resolve/.redocly.yaml');
  const resolveExtendsSpy = jest.spyOn(load, 'resolveExtends');
  it('should resolve apis lintConfig when it contains file', async () => {
    const apis = {
      petstore: {
        root: 'some/path',
        lint: {
          extends: ['local-config.yaml'],
        },
      },
      openapi: {
        root: 'some/path',
        lint: {
          extends: ['local-config.yaml'],
        },
      },
    };
    await resolveApis({ apis, configPath });
    expect(resolveExtendsSpy).toBeCalledTimes(Object.keys(apis).length);
  });
});

describe('resolveNestedPlugins', () => {
  const testData = {
    configPath: '/.redocly.yaml',
    pluginConfigPath: '/api/.redocly.yaml',
    plugin: 'plugins/test-plugin.js',
  };

  it('should resolve plugin path for same config name', () => {
    const path = load.resolveNestedPlugins(testData);
    expect(path).toStrictEqual('/api/plugins/test-plugin.js');
  });

  it('should resolve plugin path for different config name', () => {
    const path = load.resolveNestedPlugins({ ...testData, configPath: '/redocly.yaml' });
    expect(path).toStrictEqual('/api/plugins/test-plugin.js');
  });

  it('should resolve plugin path when plugin has same level like nested config path', () => {
    const path = load.resolveNestedPlugins({ ...testData, plugin: 'test-plugin.js' });
    expect(path).toStrictEqual('/api/test-plugin.js');
  });
});


describe('resolveNestedPlugins', () => {
  const testData = {
    configPath: '/.redocly.yaml',
    pluginConfigPath: '/api/.redocly.yaml',
    plugin: 'plugins/test-plugin.js',
  };

  it('should resolve plugin path for same config name', () => {
    const path = load.resolveNestedPlugins(testData);
    expect(path).toStrictEqual('/api/plugins/test-plugin.js');
  });

  it('should resolve plugin path for different config name', () => {
    const path = load.resolveNestedPlugins({ ...testData, configPath: '/redocly.yaml' });
    expect(path).toStrictEqual('/api/plugins/test-plugin.js');
  });

  it('should resolve plugin path when plugin has same level like nested config path', () => {
    const path = load.resolveNestedPlugins({ ...testData, plugin: 'test-plugin.js' });
    expect(path).toStrictEqual('/api/test-plugin.js');
  });
});


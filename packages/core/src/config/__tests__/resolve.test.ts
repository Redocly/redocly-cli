import * as load from '../load';
import { resolveApis } from '../utils';

const path = require('path');

import type { Api, LintRawConfig } from '../types';

const configPath = path.join(__dirname, 'fixtures/resolve/.redocly.yaml');
const baseLintConfig: LintRawConfig = {
  rules: {
    'operation-2xx-response': 'warn',
  },
};

const minimalLintPreset = load.resolveLint({
  lintConfig: { ...baseLintConfig, extends: ['minimal'] },
});

const recommendedLintPreset = load.resolveLint({
  lintConfig: { ...baseLintConfig, extends: ['recommended'] },
});

describe('resolveLint', () => {
  it('should return the config with recommended', async () => {
    expect(await load.resolveLint({ lintConfig: baseLintConfig })).toMatchSnapshot();
  });

  it('should return the config with correct order by preset', async () => {
    expect(
      await load.resolveLint({
        lintConfig: { ...baseLintConfig, extends: ['minimal', 'recommended'] },
      }),
    ).toEqual(await recommendedLintPreset);
    expect(
      await load.resolveLint({
        lintConfig: { ...baseLintConfig, extends: ['recommended', 'minimal'] },
      }),
    ).toEqual(await minimalLintPreset);
  });

  it('should return the same lintConfig when extends is empty array', async () => {
    const configWithEmptyExtends = await load.resolveLint({
      lintConfig: { ...baseLintConfig, extends: [] },
    });
    expect(configWithEmptyExtends).toMatchSnapshot();
  });

  it('should resolve extends with local file config', async () => {
    const config = {
      ...baseLintConfig,
      extends: ['local-config.yaml'],
    };

    const { plugins, ...result } = await load.resolveLint({
      lintConfig: config,
      configPath,
    });

    expect(result).toMatchSnapshot();
    expect(result?.rules?.['operation-2xx-response']).toEqual('warn');
    expect(plugins).toBeDefined();
    expect(plugins?.length).toBe(2);
  });

  it('should resolve extends with local file config witch contains path to nested config', async () => {
    const lintConfig = {
      extends: ['local-config-with-file.yaml'],
    };
    const { plugins, ...result } = await load.resolveLint({
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
    const apis: Record<string, Api> = {
      petstore: {
        root: 'some/path',
        lint: {},
      },
    };

    const lintConfig: LintRawConfig = {
      extends: ['minimal'],
    };

    const apisResult = await resolveApis({ apis, configPath, lintConfig });
    expect(apisResult['petstore'].lint).toEqual(await minimalLintPreset);
  });

  it('should resolve apis lintConfig and merge recommended extends', async () => {
    const apis: Record<string, Api> = {
      petstore: {
        root: 'some/path',
        lint: {},
      },
    };

    const lintConfig: LintRawConfig = {};

    const apisResult = await resolveApis({ apis, configPath, lintConfig });
    expect(apisResult['petstore'].lint).toEqual({
      ...(await recommendedLintPreset),
      recommendedFallback: true,
    });
  });

  it('should resolve apis lintConfig when it contains file and set recommended', async () => {
    const apis: Record<string, Api> = {
      petstore: {
        root: 'some/path',
        lint: {
          rules: {
            'operation-4xx-response': 'error',
          },
        },
      },
    };

    const lintConfig: LintRawConfig = {
      rules: {
        'operation-2xx-response': 'warn',
      },
    };

    const apisResult = await resolveApis({ apis, configPath, lintConfig });
    expect(apisResult['petstore'].lint.rules).toBeDefined();
    expect(apisResult['petstore'].lint.rules?.['operation-2xx-response']).toEqual('warn');
    expect(apisResult['petstore'].lint.rules?.['operation-4xx-response']).toEqual('error');
    //@ts-ignore
    expect(apisResult['petstore'].lint.plugins.length).toEqual(1);
    expect(apisResult).toMatchSnapshot();
  });

  it('should resolve apis lintConfig when it contains file', async () => {
    const apis: Record<string, Api> = {
      petstore: {
        root: 'some/path',
        lint: {
          extends: ['local-config.yaml'],
          rules: {
            'operation-4xx-response': 'error',
          },
        },
      },
    };

    const lintConfig: LintRawConfig = {
      extends: ['minimal'],
      rules: {
        'operation-2xx-response': 'warn',
      },
    };

    const apisResult = await resolveApis({ apis, configPath, lintConfig });
    expect(apisResult['petstore'].lint.rules).toBeDefined();
    expect(apisResult['petstore'].lint.rules?.['operation-2xx-response']).toEqual('off');
    expect(apisResult['petstore'].lint.rules?.['operation-4xx-response']).toEqual('error');
    expect(apisResult['petstore'].lint.rules?.['local/operation-id-not-test']).toEqual('error');
    //@ts-ignore
    expect(apisResult['petstore'].lint.plugins.length).toEqual(2);
    expect(apisResult).toMatchSnapshot();
  });
});

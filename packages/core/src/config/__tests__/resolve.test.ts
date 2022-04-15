import * as load from '../load';
import type { LintRawConfig } from '../types';

const path = require('path');
// FIXME: this test is not valid we should add new cases
describe.skip('resolveExtends', () => {
  const baseLintConfig: LintRawConfig = {
    rules: {
      'operation-2xx-response': 'warn',
    },
  };
  const configPath = path.join(__dirname, 'fixtures/resolve/.redocly.yaml');

  it('should return the same lintConfig when extends is empty array or undefined', async () => {
    expect(await load.resolveLint({ lintConfig: baseLintConfig })).toEqual(baseLintConfig);
    const configWithEmptyExtends = { lintConfig: { ...baseLintConfig, extends: [] } };
    expect(await load.resolveLint(configWithEmptyExtends)).toEqual(
      configWithEmptyExtends.lintConfig,
    );
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
    expect(plugins).toBeDefined();
    // expect(plugins?.length).toBe(1);
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
    expect(plugins).toBeDefined();
    // expect(plugins?.length).toBe(2);
  });
});


describe.skip('resolveApis', () => {
  // const configPath = path.join(__dirname, 'fixtures/resolve/.redocly.yaml');
  const resolveLintSpy = jest.spyOn(load, 'resolveLint');
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
    // await resolveApis({ apis, configPath });
    expect(resolveLintSpy).toBeCalledTimes(Object.keys(apis).length);
  });
});

import { DeprecatedInRawConfig, RawConfig } from '../types';
import * as utils from '../utils';

const makeTestRawConfig = (
  apiStyleguideName: string,
  rootStyleguideName: string
): RawConfig & DeprecatedInRawConfig => ({
  apis: {
    'test@v1': {
      root: 'root.yaml',
      [apiStyleguideName]: {
        rules: {
          'operation-2xx-response': 'error',
        },
      },
    },
  },
  [rootStyleguideName]: {
    rules: {
      'operation-4xx-response': 'warn',
    },
  },
});

describe('transformConfig', () => {
  it('should work for new syntax', () => {
    const transformedRawConfig: RawConfig = utils.transformConfig(
      makeTestRawConfig('styleguide', 'styleguide')
    );
    expect(transformedRawConfig).toMatchInlineSnapshot(`
      Object {
        "apis": Object {
          "test@v1": Object {
            "root": "root.yaml",
            "styleguide": Object {
              "rules": Object {
                "operation-2xx-response": "error",
              },
            },
          },
        },
        "features.openapi": undefined,
        "styleguide": Object {
          "rules": Object {
            "operation-4xx-response": "warn",
          },
        },
      }
    `);
  });
  it('should be equal for both `lint` and `styleguide` names', () => {
    expect(utils.transformConfig(makeTestRawConfig('lint', 'styleguide'))).toEqual(
      utils.transformConfig(makeTestRawConfig('styleguide', 'lint'))
    );
  });
  it('should work for `apiDefinitions`', () => {
    const testRawConfig = makeTestRawConfig('styleguide', 'lint');
    testRawConfig.apis = undefined;
    testRawConfig.apiDefinitions = { legacyApiDefinition: 'file.yaml' };
    expect(utils.transformConfig(testRawConfig)).toMatchInlineSnapshot(`
      Object {
        "apis": Object {
          "legacyApiDefinition": Object {
            "root": "file.yaml",
          },
        },
        "features.openapi": undefined,
        "styleguide": Object {
          "rules": Object {
            "operation-4xx-response": "warn",
          },
        },
      }
    `);
  });
  it('should throw an error if both new and old syntax used together', () => {
    const testRawConfig = makeTestRawConfig('styleguide', 'lint');
    testRawConfig.apiDefinitions = { legacyApiDefinition: 'file.yaml' };
    expect(() => utils.transformConfig(testRawConfig)).toThrowError(
      `Do not use 'apiDefinitions' field. Use 'apis' instead.`
    );
  });
});

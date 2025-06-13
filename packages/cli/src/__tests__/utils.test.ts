import {
  getFallbackApisOrExit,
  pathToFilename,
  printConfigLintTotals,
  langToExt,
  checkIfRulesetExist,
  handleError,
  CircularJSONNotSupportedError,
  sortTopLevelKeysForOas,
  cleanColors,
  getAndValidateFileExtension,
  writeToFileByExtension,
} from '../utils/miscellaneous.js';
import { cleanArgs } from '../utils/telemetry.js';
import * as errorHandling from '../utils/error.js';
import { sanitizeLocale, sanitizePath, getPlatformSpawnArgs } from '../utils/platform.js';
import {
  type ResolvedApi,
  type Totals,
  ResolveError,
  YamlParseError,
  HandledError,
} from '@redocly/openapi-core';
import * as openapiCore from '@redocly/openapi-core';
import { blue, red, yellow } from 'colorette';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

vi.mock('node:os');
vi.mock('colorette');
vi.mock('node:fs');
vi.mock('node:process', async () => {
  const actual = await vi.importActual('node:process');
  return { ...actual };
});
vi.mock('node:path', async () => {
  const actual = await vi.importActual('node:path');
  return { ...actual };
});
vi.mock('@redocly/openapi-core', async () => {
  const actual = await vi.importActual('@redocly/openapi-core');
  return {
    ...actual,
    stringifyYaml: vi.fn((data, opts) => data as string),
  };
});
vi.mock('../../utils/error.js', async () => {
  const actual = await vi.importActual('../../utils/error.js');
  return {
    ...actual,
  };
});

describe('pathToFilename', () => {
  it('should use correct path separator', () => {
    const processedPath = pathToFilename('/user/createWithList', '_');
    expect(processedPath).toEqual('user_createWithList');
  });
});

describe('printConfigLintTotals', () => {
  const totalProblemsMock: Totals = {
    errors: 1,
    warnings: 0,
    ignored: 0,
  };

  const redColoretteMocks = vi.mocked(red);
  const yellowColoretteMocks = vi.mocked(yellow);

  beforeEach(() => {
    yellowColoretteMocks.mockImplementation((text) => text as string);
    redColoretteMocks.mockImplementation((text) => text as string);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  it('should print errors if such exist', () => {
    printConfigLintTotals(totalProblemsMock);
    expect(process.stderr.write).toHaveBeenCalledWith('❌ Your config has 1 error.');
    expect(redColoretteMocks).toHaveBeenCalledWith('❌ Your config has 1 error.');
  });

  it('should print warning if no error', () => {
    printConfigLintTotals({ ...totalProblemsMock, errors: 0, warnings: 2 });
    expect(process.stderr.write).toHaveBeenCalledWith('⚠️ Your config has 2 warnings.\n');
    expect(yellowColoretteMocks).toHaveBeenCalledWith('⚠️ Your config has 2 warnings.\n');
  });

  it('should print nothing if no error and no warnings', () => {
    const result = printConfigLintTotals({ ...totalProblemsMock, errors: 0 });
    expect(result).toBeUndefined();
    expect(process.stderr.write).toHaveBeenCalledTimes(0);
    expect(yellowColoretteMocks).toHaveBeenCalledTimes(0);
    expect(redColoretteMocks).toHaveBeenCalledTimes(0);
  });
});

describe('getFallbackApisOrExit', () => {
  const redColoretteMocks = vi.mocked(red);
  const yellowColoretteMocks = vi.mocked(yellow);

  const apis: Record<string, ResolvedApi> = {
    main: {
      root: 'someFile.yaml',
      styleguide: {},
    },
  };

  const config = { apis };

  beforeEach(() => {
    yellowColoretteMocks.mockImplementation((text) => text as string);
    redColoretteMocks.mockImplementation((text) => text as string);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    vi.spyOn(process, 'exit').mockImplementation((code) => code as never);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should exit with error because no path provided', async () => {
    const apisConfig = {
      apis: {},
    };
    expect.assertions(1);
    try {
      await getFallbackApisOrExit([''], apisConfig);
    } catch (e) {
      expect(e.message).toEqual('Path cannot be empty.');
    }
  });

  it('should error if file from config do not exist', async () => {
    vi.spyOn(errorHandling, 'exitWithError');
    vi.mocked(fs.existsSync).mockImplementationOnce(() => false);
    expect.assertions(3);
    try {
      await getFallbackApisOrExit(undefined, config);
    } catch (e) {
      expect(process.stderr.write).toHaveBeenCalledWith(
        '\nsomeFile.yaml does not exist or is invalid.\n\n'
      );
      expect(errorHandling.exitWithError).toHaveBeenCalledWith('Please provide a valid path.');
      expect(e.message).toEqual('Please provide a valid path.');
    }
  });

  it('should return valid array with results if such file exist', async () => {
    vi.mocked(fs.existsSync).mockImplementationOnce(() => true);
    vi.spyOn(path, 'resolve').mockImplementationOnce((_, path) => path);

    const result = await getFallbackApisOrExit(undefined, config);
    expect(process.stderr.write).toHaveBeenCalledTimes(0);
    expect(process.exit).toHaveBeenCalledTimes(0);
    expect(result).toStrictEqual([
      {
        alias: 'main',
        path: 'someFile.yaml',
        output: undefined,
      },
    ]);
  });

  it('should exit with error in case if invalid path provided as args', async () => {
    vi.spyOn(errorHandling, 'exitWithError');
    const apisConfig = {
      apis: {},
    };
    vi.mocked(fs.existsSync).mockImplementationOnce(() => false);
    expect.assertions(3);

    try {
      await getFallbackApisOrExit(['someFile.yaml'], apisConfig);
    } catch (e) {
      expect(process.stderr.write).toHaveBeenCalledWith(
        '\nsomeFile.yaml does not exist or is invalid.\n\n'
      );
      expect(errorHandling.exitWithError).toHaveBeenCalledWith('Please provide a valid path.');
      expect(e.message).toEqual('Please provide a valid path.');
    }
  });

  it('should exit with error in case if invalid 2 path provided as args', async () => {
    vi.spyOn(errorHandling, 'exitWithError');
    const apisConfig = {
      apis: {},
    };
    vi.mocked(fs.existsSync).mockImplementationOnce(() => false);
    expect.assertions(3);
    try {
      await getFallbackApisOrExit(['someFile.yaml', 'someFile2.yaml'], apisConfig);
    } catch (e) {
      expect(process.stderr.write).toHaveBeenCalledWith(
        '\nsomeFile.yaml does not exist or is invalid.\n\n'
      );
      expect(errorHandling.exitWithError).toHaveBeenCalledWith('Please provide a valid path.');
      expect(e.message).toEqual('Please provide a valid path.');
    }
  });

  it('should exit with error if only one file exist ', async () => {
    vi.spyOn(errorHandling, 'exitWithError');
    const apisStub = {
      ...apis,
      notExist: {
        root: 'notExist.yaml',
        styleguide: {},
      },
    };
    const configStub = { apis: apisStub };

    const existSyncMock = vi
      .mocked(fs.existsSync)
      .mockImplementation((path) => (path as string).endsWith('someFile.yaml'));

    expect.assertions(5);

    try {
      await getFallbackApisOrExit(undefined, configStub);
    } catch (e) {
      expect(process.stderr.write).toHaveBeenCalledWith(
        '\nnotExist.yaml does not exist or is invalid.\n\n'
      );
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
      expect(errorHandling.exitWithError).toHaveBeenCalledWith('Please provide a valid path.');
      expect(errorHandling.exitWithError).toHaveBeenCalledTimes(1);
      expect(e.message).toEqual('Please provide a valid path.');
    }
    existSyncMock.mockClear();
  });

  it('should work ok if it is url passed', async () => {
    vi.mocked(fs.existsSync).mockImplementationOnce(() => false);

    const apisConfig = {
      apis: {
        main: {
          root: 'https://someLinkt/petstore.yaml?main',
          styleguide: {},
        },
      },
    };

    const result = await getFallbackApisOrExit(undefined, apisConfig);

    expect(process.stderr.write).toHaveBeenCalledTimes(0);
    expect(result).toStrictEqual([
      {
        alias: 'main',
        path: 'https://someLinkt/petstore.yaml?main',
        output: undefined,
      },
    ]);
  });

  it('should find alias by filename', async () => {
    vi.mocked(fs.existsSync).mockImplementationOnce(() => true);
    const entry = await getFallbackApisOrExit(['./test.yaml'], {
      apis: {
        main: {
          root: 'test.yaml',
          styleguide: {},
        },
      },
    });
    expect(entry).toEqual([{ path: './test.yaml', alias: 'main' }]);
  });

  it('should find alias by filename when config is in different directory', async () => {
    vi.mocked(fs.existsSync).mockImplementationOnce(() => true);
    const entry = await getFallbackApisOrExit(['./test.yaml'], {
      configFile: 'nested-folder/redocly.yaml',
      apis: {
        main: {
          root: '../test.yaml',
          styleguide: {},
        },
      },
    });
    expect(entry).toEqual([{ path: './test.yaml', alias: 'main' }]);
  });

  it('should return apis from config with paths and outputs resolved relatively to the config location', async () => {
    vi.mocked(fs.existsSync).mockImplementationOnce(() => true);
    const entry = await getFallbackApisOrExit(undefined, {
      apis: {
        main: {
          root: 'test.yaml',
          output: 'output/test.yaml',
          styleguide: {},
        },
      },
      configFile: 'project-folder/redocly.yaml',
    });
    expect(entry).toEqual([
      {
        path: expect.stringMatching(/project\-folder\/test\.yaml$/),
        output: expect.stringMatching(/project\-folder\/output\/test\.yaml$/),
        alias: 'main',
      },
    ]);
  });
});

describe('langToExt', () => {
  it.each([
    ['php', '.php'],
    ['c#', '.cs'],
    ['shell', '.sh'],
    ['curl', '.sh'],
    ['bash', '.sh'],
    ['javascript', '.js'],
    ['js', '.js'],
    ['python', '.py'],
    ['c', '.c'],
    ['c++', '.cpp'],
    ['coffeescript', '.litcoffee'],
    ['dart', '.dart'],
    ['elixir', '.ex'],
    ['go', '.go'],
    ['groovy', '.groovy'],
    ['java', '.java'],
    ['kotlin', '.kt'],
    ['objective-c', '.m'],
    ['perl', '.pl'],
    ['powershell', '.ps1'],
    ['ruby', '.rb'],
    ['rust', '.rs'],
    ['scala', '.sc'],
    ['swift', '.swift'],
    ['typescript', '.ts'],
    ['tsx', '.tsx'],
  ])('should infer file extension from lang - %s', (lang, expected) => {
    expect(langToExt(lang)).toBe(expected);
  });

  it('should ignore case when inferring file extension', () => {
    expect(langToExt('JavaScript')).toBe('.js');
  });
});

describe('sorTopLevelKeysForOas', () => {
  it('should sort oas3 top level keys', () => {
    const openApi = {
      openapi: '3.0.0',
      components: {},
      security: [],
      tags: [],
      servers: [],
      paths: {},
      info: {},
      externalDocs: {},
      webhooks: [],
      'x-webhooks': [],
      jsonSchemaDialect: '',
    } as any;
    const orderedKeys = [
      'openapi',
      'info',
      'jsonSchemaDialect',
      'servers',
      'security',
      'tags',
      'externalDocs',
      'paths',
      'webhooks',
      'x-webhooks',
      'components',
    ];
    const result = sortTopLevelKeysForOas(openApi);

    Object.keys(result).forEach((key, index) => {
      expect(key).toEqual(orderedKeys[index]);
    });
  });

  it('should sort oas2 top level keys', () => {
    const openApi = {
      swagger: '2.0.0',
      security: [],
      tags: [],
      paths: {},
      info: {},
      externalDocs: {},
      host: '',
      basePath: '',
      securityDefinitions: [],
      schemes: [],
      consumes: [],
      parameters: [],
      produces: [],
      definitions: [],
      responses: [],
    } as any;
    const orderedKeys = [
      'swagger',
      'info',
      'host',
      'basePath',
      'schemes',
      'consumes',
      'produces',
      'security',
      'tags',
      'externalDocs',
      'paths',
      'definitions',
      'parameters',
      'responses',
      'securityDefinitions',
    ];
    const result = sortTopLevelKeysForOas(openApi);

    Object.keys(result).forEach((key, index) => {
      expect(key).toEqual(orderedKeys[index]);
    });
  });
});

describe('handleErrors', () => {
  const ref = 'openapi/test.yaml';

  const redColoretteMocks = vi.mocked(red);
  const blueColoretteMocks = vi.mocked(blue);

  beforeEach(() => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    vi.spyOn(process, 'exit').mockImplementation((code) => code as never);
    redColoretteMocks.mockImplementation((text) => text as string);
    blueColoretteMocks.mockImplementation((text) => text as string);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle ResolveError', () => {
    vi.spyOn(errorHandling, 'exitWithError');
    const resolveError = new ResolveError(new Error('File not found.'));
    expect(() => handleError(resolveError, ref)).toThrowError(HandledError);
    expect(errorHandling.exitWithError).toHaveBeenCalledWith(
      `Failed to resolve API description at openapi/test.yaml:\n\n  - File not found.`
    );
  });

  it('should handle YamlParseError', () => {
    vi.spyOn(errorHandling, 'exitWithError');
    const yamlParseError = new YamlParseError(new Error('Invalid yaml.'), {} as any);
    expect(() => handleError(yamlParseError, ref)).toThrowError(HandledError);
    expect(errorHandling.exitWithError).toHaveBeenCalledWith(
      `Failed to parse API description at openapi/test.yaml:\n\n  - Invalid yaml.`
    );
  });

  it('should handle CircularJSONNotSupportedError', () => {
    vi.spyOn(errorHandling, 'exitWithError');
    const circularError = new CircularJSONNotSupportedError(new Error('Circular json'));
    expect(() => handleError(circularError, ref)).toThrowError(HandledError);
    expect(errorHandling.exitWithError).toHaveBeenCalledWith(
      `Detected circular reference which can't be converted to JSON.\n` +
        `Try to use ${blue('yaml')} output or remove ${blue('--dereferenced')}.`
    );
  });

  it('should handle SyntaxError', () => {
    vi.spyOn(errorHandling, 'exitWithError');
    const testError = new SyntaxError('Unexpected identifier');
    testError.stack = 'test stack';
    expect(() => handleError(testError, ref)).toThrowError(HandledError);
    expect(errorHandling.exitWithError).toHaveBeenCalledWith(
      'Syntax error: Unexpected identifier test stack'
    );
  });

  it('should throw unknown error', () => {
    vi.spyOn(errorHandling, 'exitWithError');
    const testError = new Error('Test error.');
    expect(() => handleError(testError, ref)).toThrowError(HandledError);
    expect(errorHandling.exitWithError).toHaveBeenCalledWith(
      `Something went wrong when processing openapi/test.yaml:\n\n  - Test error.`
    );
  });
});

describe('checkIfRulesetExist', () => {
  beforeEach(() => {
    vi.spyOn(process, 'exit').mockImplementation((code?: number) => code as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should throw an error if rules are not provided', () => {
    vi.mocked(red).mockImplementation((text) => text as string);

    const rules = {
      oas2: {},
      oas3_0: {},
      oas3_1: {},
      async2: {},
      async3: {},
      arazzo1: {},
      overlay1: {},
    };
    expect(() => checkIfRulesetExist(rules)).toThrowError(
      '⚠️ No rules were configured. Learn how to configure rules: https://redocly.com/docs/cli/rules/'
    );
  });

  it('should not throw an error if rules are provided', () => {
    const rules = {
      oas2: { 'operation-4xx-response': 'error' },
      oas3_0: {},
      oas3_1: {},
    } as any;
    checkIfRulesetExist(rules);
  });
});

describe('cleanColors', () => {
  it('should remove colors from string', () => {
    const stringWithColors = `String for ${red('test')}`;
    const result = cleanColors(stringWithColors);

    expect(result).not.toMatch(/\x1b\[\d+m/g);
  });
});

describe('cleanArgs', () => {
  beforeEach(async () => {
    const realFs: typeof fs = await vi.importActual('node:fs');
    vi.spyOn(fs, 'existsSync').mockImplementation((value) =>
      realFs.existsSync(path.resolve(__dirname, value as string))
    );
    vi.spyOn(fs, 'statSync').mockImplementation((value) =>
      realFs.statSync(path.resolve(__dirname, value as string))
    );
  });
  it('should remove potentially sensitive data from parsed args', () => {
    const parsedArgs = {
      config: './fixtures/redocly.yaml',
      apis: ['main@v1', 'fixtures/openapi.yaml', 'http://some.url/openapi.yaml'],
      format: 'codeframe',
      input: 'some-input',
      'client-cert': 'some-client-cert',
      'client-key': 'some-client-key',
      'ca-cert': 'some-ca-cert',
    };
    const rawArgs = [
      'redocly',
      'bundle',
      'main@v1',
      'fixtures/openapi.yaml',
      'http://some.url/openapi.yaml',
      '--config=fixtures/redocly.yaml',
      '--format=codeframe',
      '--input=some-input',
      '--client-cert=some-client-cert',
      '--client-key=some-client-key',
      '--ca-cert=some-ca-cert',
    ];
    const result = cleanArgs(parsedArgs, rawArgs);
    expect(result.arguments).toEqual(
      JSON.stringify({
        config: 'file-yaml',
        apis: ['main@v1', 'file-yaml', 'http://url'],
        format: 'codeframe',
        input: '***',
        'client-cert': '***',
        'client-key': '***',
        'ca-cert': '***',
      })
    );
  });

  it('should remove potentially sensitive data from raw CLI input', () => {
    const rawInput = [
      'redocly',
      'bundle',
      'api-name@api-version',
      './fixtures/openapi.yaml',
      'http://some.url/openapi.yaml',
      '--config=fixtures/redocly.yaml',
      '--output',
      'fixtures',
      '--client-cert',
      'fixtures/client-cert.pem',
      '--client-key',
      'fixtures/client-key.pem',
      '--ca-cert',
      'fixtures/ca-cert.pem',
      '--organization',
      'my-org',
      '--input',
      'timeout=10000',
      '--input',
      '{"apiKey":"some=111=1111"}',
    ];
    const parsedArgs = {
      apis: ['./fixtures/openapi.yaml', 'http://some.url/openapi.yaml'],
      input: ['timeout=10000', '{"apiKey":"some=111=1111"}'],
      organization: 'my-org',
      'client-cert': 'fixtures/client-cert.pem',
      'client-key': 'fixtures/client-key.pem',
      'ca-cert': 'fixtures/ca-cert.pem',
      config: 'fixtures/redocly.yaml',
      output: 'fixtures',
    };
    const result = cleanArgs(parsedArgs, rawInput);
    expect(result.raw_input).toEqual(
      'redocly bundle api-name@api-version file-yaml http://url --config=file-yaml --output folder --client-cert *** --client-key *** --ca-cert *** --organization *** --input *** --input ***'
    );
    expect(result.arguments).toEqual(
      JSON.stringify({
        apis: ['file-yaml', 'http://url'],
        input: '***',
        organization: '***',
        'client-cert': '***',
        'client-key': '***',
        'ca-cert': '***',
        config: 'file-yaml',
        output: 'folder',
      })
    );
  });

  it('should preserve safe data from raw CLI input', () => {
    const rawInput = [
      'redocly',
      'lint',
      './fixtures/openapi.json',
      '--format',
      'stylish',
      '--extends=minimal',
      '--skip-rule',
      'operation-4xx-response',
    ];
    const parsedArgs = {
      apis: ['./fixtures/openapi.json'],
      format: 'stylish',
      extends: 'minimal',
      'skip-rule': ['operation-4xx-response'],
    };
    const result = cleanArgs(parsedArgs, rawInput);

    expect(result.raw_input).toEqual(
      'redocly lint file-json --format stylish --extends=minimal --skip-rule operation-4xx-response'
    );

    expect(result.arguments).toEqual(
      JSON.stringify({
        apis: ['file-json'],
        format: 'stylish',
        extends: 'minimal',
        'skip-rule': ['operation-4xx-response'],
      })
    );
  });
});

describe('validateFileExtension', () => {
  it('should return current file extension', () => {
    expect(getAndValidateFileExtension('test.json')).toEqual('json');
  });

  it('should return yaml and print warning if file extension does not supported', () => {
    const stderrMock = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    vi.mocked(yellow).mockImplementation((text) => text as string);

    expect(getAndValidateFileExtension('test.xml')).toEqual('yaml');
    expect(stderrMock).toHaveBeenCalledWith(`Unsupported file extension: xml. Using yaml.\n`);
  });
});

describe('writeToFileByExtension', () => {
  beforeEach(() => {
    vi.spyOn(process.stderr, 'write').mockImplementation(vi.fn());
    vi.mocked(yellow).mockImplementation((text) => text as string);
  });

  it('should call stringifyYaml function', () => {
    writeToFileByExtension('test data', 'test.yaml');
    expect(openapiCore.stringifyYaml).toHaveBeenCalledWith('test data', { noRefs: false });
    expect(process.stderr.write).toHaveBeenCalledWith(`test data`);
  });

  it('should call JSON.stringify function', () => {
    const stringifySpy = vi.spyOn(JSON, 'stringify').mockImplementation((data) => data);
    writeToFileByExtension('test data', 'test.json');
    expect(stringifySpy).toHaveBeenCalledWith('test data', null, 2);
    expect(process.stderr.write).toHaveBeenCalledWith(`test data`);
  });
});

describe('runtime platform', () => {
  describe('sanitizePath', () => {
    test.each([
      ['C:\\Program Files\\App', 'C:\\Program Files\\App'],
      ['/usr/local/bin/app', '/usr/local/bin/app'],
      ['invalid|path?name*', 'invalidpathname'],
      ['', ''],
      ['<>:"|?*', ':'],
      ['C:/Program Files\\App', 'C:/Program Files\\App'],
      ['path\nname\r', 'pathname'],
      ['/usr/local; rm -rf /', '/usr/local rm -rf /'],
      ['C:\\data&& dir', 'C:\\data dir'],
    ])('should sanitize path %s to %s', (input, expected) => {
      expect(sanitizePath(input)).toBe(expected);
    });
  });

  describe('sanitizeLocale', () => {
    test.each([
      ['en-US', 'en-US'],
      ['fr_FR', 'fr_FR'],
      ['en<>US', 'enUS'],
      ['fr@FR', 'fr@FR'],
      ['en_US@#$%', 'en_US@'],
      [' en-US ', 'en-US'],
      ['', ''],
    ])('should sanitize locale %s to %s', (input, expected) => {
      expect(sanitizeLocale(input)).toBe(expected);
    });
  });

  describe('getPlatformSpawnArgs', () => {
    it('should return args for Windows platform', () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValueOnce('win32');

      const result = getPlatformSpawnArgs();

      expect(result).toEqual({
        npxExecutableName: 'npx.cmd',
        sanitize: expect.any(Function),
        shell: true,
      });
    });

    it('should return args for non-Windows platform', () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValueOnce('linux');

      const result = getPlatformSpawnArgs();

      expect(result).toEqual({
        npxExecutableName: 'npx',
        sanitize: expect.any(Function),
        shell: false,
      });
    });
  });
});

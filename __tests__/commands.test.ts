import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { getCommandOutput, getEntrypoints, getParams, cleanupOutput } from './helpers.js';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

describe('E2E', () => {
  describe('lint', () => {
    const excludeFolders = [
      'arazzo-type-extensions-with-plugin',
      'arazzo-not-valid-test-description',
      'arazzo-valid-test-description',
    ];
    const folderPath = join(__dirname, 'lint');
    const contents = readdirSync(folderPath).filter((folder) => !excludeFolders.includes(folder));

    for (const file of contents) {
      const testPath = join(folderPath, file);
      if (statSync(testPath).isFile()) continue;
      if (!existsSync(join(testPath, 'redocly.yaml'))) continue;

      const args = getParams(indexEntryPoint, ['lint']);

      test(file, async () => {
        const result = getCommandOutput(args, {}, { testPath });
        await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
      });
    }

    test('lint valid Arazzo description', async () => {
      const dirName = 'arazzo-valid-test-description';
      const testPath = join(__dirname, `lint/${dirName}`);

      const args = getParams(indexEntryPoint, ['lint', 'museum.yaml']);

      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });

    test('lint not valid Arazzo description', async () => {
      const dirName = 'arazzo-not-valid-test-description';
      const testPath = join(__dirname, `lint/${dirName}`);

      const args = getParams(indexEntryPoint, ['lint', 'museum.yaml']);

      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });

    test('arazzo-type-extensions-with-plugin', async () => {
      const dirName = 'arazzo-type-extensions-with-plugin';
      const testPath = join(__dirname, `lint/${dirName}`);

      const args = getParams(indexEntryPoint, ['lint', 'museum.yaml', '--config=redocly.yaml']);

      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });

    test('skip-rules', async () => {
      const dirName = 'skip-rules';
      const testPath = join(__dirname, `lint/${dirName}`);

      const args = getParams(indexEntryPoint, [
        'lint',
        '--skip-rule=operation-4xx-response',
        '--skip-rule',
        'rule/operationId-casing',
      ]);

      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot_2.txt'));
    });

    test('lint file with constructor property in schema', async () => {
      const testPath = join(__dirname, 'fixtures/constructor-property');
      const args = getParams(indexEntryPoint, ['lint', 'openapi.yaml']);

      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });
  });

  describe('zero-config', () => {
    const folderPath = join(__dirname, 'zero-config');

    it('default-recommended-fallback', async () => {
      const testPath = join(folderPath, 'default-recommended-fallback');
      const args = getParams(indexEntryPoint, ['lint', './openapi.yaml']);
      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });

    it('no-default-recommended-fallback', async () => {
      const testPath = join(folderPath, 'no-default-recommended-fallback');
      const args = getParams(indexEntryPoint, ['lint', './openapi.yaml']);
      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });
  });

  describe('check-config', () => {
    const folderPathWithOptions: { dirName: string; option: string | null }[] = [
      { dirName: 'invalid-config--lint-config-warn', option: 'warn' },
      { dirName: 'invalid-config--lint-config-error', option: 'error' },
      { dirName: 'invalid-config--no-option', option: null },
      { dirName: 'valid-config', option: null },
    ];

    test.each(folderPathWithOptions)('test with option: %s', async (folderPathWithOptions) => {
      const { dirName, option } = folderPathWithOptions;
      const testPath = join(__dirname, `check-config/${dirName}`);
      const args = [...([option && `--lint-config=${option}`].filter(Boolean) as string[])];

      const passedArgs = getParams(indexEntryPoint, ['check-config', ...args]);

      const result = getCommandOutput(passedArgs, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });

    test('run with config option', async () => {
      const dirName = 'valid-config-with-config-option';
      const testPath = join(__dirname, `check-config/${dirName}`);

      const passedArgs = getParams(indexEntryPoint, [
        'check-config',
        '--config=nested/redocly.yaml',
      ]);

      const result = getCommandOutput(passedArgs, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });

    test('config type extension in assertions', async () => {
      const dirName = 'config-type-extensions-in-assertions';
      const testPath = join(__dirname, `check-config/${dirName}`);

      const passedArgs = getParams(indexEntryPoint, ['check-config', '--config=redocly.yaml']);

      const result = getCommandOutput(passedArgs, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });

    test('wrong config type extension in assertions', async () => {
      const dirName = 'wrong-config-type-extensions-in-assertions';
      const testPath = join(__dirname, `check-config/${dirName}`);

      const passedArgs = getParams(indexEntryPoint, ['check-config', '--config=redocly.yaml']);

      const result = getCommandOutput(passedArgs, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });
  });

  describe('lint-config', () => {
    const lintOptions: { dirName: string; option: string | null; format?: string }[] = [
      { dirName: 'invalid-config--lint-config-off', option: 'off' },
      { dirName: 'invalid-config--lint-config-warn', option: 'warn' },
      { dirName: 'invalid-config--lint-config-error', option: 'error' },
      { dirName: 'invalid-lint-config-severity', option: 'something' },
      { dirName: 'invalid-config--no-option', option: null },
      { dirName: 'invalid-config-assertation-name', option: 'warn' },
      { dirName: 'invalid-config-assertation-config-type', option: 'warn' },
      { dirName: 'invalid-config-format-json', option: 'warn', format: 'json' },
      { dirName: 'config-with-refs', option: 'warn' },
      { dirName: 'config-with-refs-extended', option: 'error' },
      { dirName: 'config-structure', option: 'error' },
    ];

    const validOpenapiFile = join(__dirname, 'lint-config/__fixtures__/valid-openapi.yaml');
    const invalidOpenapiFile = join(__dirname, 'lint-config/__fixtures__/invalid-openapi.yaml');

    test.each(lintOptions)('test with option: %s', async (lintOptions) => {
      const { dirName, option, format } = lintOptions;
      const testPath = join(__dirname, `lint-config/${dirName}`);
      const relativeValidOpenapiFile = relative(testPath, validOpenapiFile);
      const args = [
        relativeValidOpenapiFile,
        ...([option && `--lint-config=${option}`, format && `--format=${format}`].filter(
          Boolean
        ) as string[]),
      ];

      const passedArgs = getParams(indexEntryPoint, ['lint', ...args]);

      const result = getCommandOutput(passedArgs, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });

    const configSeverityOptions: { dirName: string; option: string | null; snapshot: string }[] = [
      {
        dirName: 'invalid-definition-and-config',
        option: 'error',
        snapshot: 'config-with-error.snapshot.txt',
      },
      {
        dirName: 'invalid-definition-and-config',
        option: 'warn',
        snapshot: 'config-with-warn.snapshot.txt',
      },
    ];

    test.each(configSeverityOptions)(
      'invalid-definition-and-config: %s',
      async (severityOption) => {
        const { dirName, option, snapshot } = severityOption;
        const testPath = join(__dirname, `lint-config/${dirName}`);
        const relativeInvalidOpenapiFile = relative(testPath, invalidOpenapiFile);
        const args = [relativeInvalidOpenapiFile, `--lint-config=${option}`];
        const passedArgs = getParams(indexEntryPoint, ['lint', ...args]);

        const result = getCommandOutput(passedArgs, {}, { testPath });

        await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, snapshot));
      }
    );
  });

  describe('split', () => {
    test('without option: outDir', async () => {
      const testPath = join(__dirname, `split/missing-outDir`);

      const args = getParams(indexEntryPoint, [
        'split',
        '../../../__tests__/split/test-split/spec.json',
      ]);

      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });

    test('swagger', async () => {
      const testPath = join(__dirname, `split/oas2`);

      const args = getParams(indexEntryPoint, [
        'split',
        '../../../__tests__/split/oas2/openapi.yaml',
        '--outDir=output',
      ]);

      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });

    test('openapi with no errors', async () => {
      const testPath = join(__dirname, `split/oas3-no-errors`);
      const file = '../../../__tests__/split/oas3-no-errors/openapi.yaml';

      const args = getParams(indexEntryPoint, ['split', file, '--outDir=output']);

      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });

    test('with separator: /', async () => {
      const testPath = join(__dirname, `split/slash-separator`);
      const file = '../../../__tests__/split/slash-separator/openapi.yaml';

      const args = getParams(indexEntryPoint, ['split', file, '--separator=/', '--outDir=output']);

      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });

    test('openapi json file', async () => {
      const testPath = join(__dirname, `split/openapi-json-file`);
      const file = '../../../__tests__/split/openapi-json-file/openapi.json';

      const args = getParams(indexEntryPoint, ['split', file, '--outDir=output']);

      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });

    test('openapi json file refs validation', async () => {
      const testPath = join(__dirname, `split/refs-in-json`);
      const file = '../../../__tests__/split/refs-in-json/openapi.json';

      const args = getParams(indexEntryPoint, ['split', file, '--outDir=output']);

      // run the split command and write the result to files
      spawnSync('node', args, {
        cwd: testPath,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          NO_COLOR: 'TRUE',
        },
      });

      const lintArgs = getParams(indexEntryPoint, ['lint', 'output/openapi.json']);
      const result = getCommandOutput(lintArgs, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });

    test('openapi json file with discriminator', async () => {
      const testPath = join(__dirname, `split/discriminator-in-json`);
      const file = '../../../__tests__/split/discriminator-in-json/openapi.json';

      const args = getParams(indexEntryPoint, ['split', file, '--outDir=output']);

      // run the split command and write the result to files
      spawnSync('node', args, {
        cwd: testPath,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          NO_COLOR: 'TRUE',
        },
      });

      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });
  });

  describe('join', () => {
    const entrypoints = ['foo.yaml', 'bar.yaml'];

    describe('without options', () => {
      const testDirNames = [
        'fails-if-no-info-section',
        'fails-if-tags-duplication',
        'reference-in-description',
        'two-files-with-no-errors',
        'fails-if-component-conflicts',
        'multiple-tags-in-same-files',
        'references-in-parameters',
        'ignore-decorators',
        'multi-references-to-one-file',
      ];

      test.each(testDirNames)('test: %s', async (dir) => {
        const testPath = join(__dirname, `join/${dir}`);
        const args = getParams(indexEntryPoint, ['join', ...entrypoints]);
        const result = getCommandOutput(args, {}, { testPath });
        await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
      });
    });

    describe('with options', () => {
      const options: { name: string; value: string | boolean }[] = [
        { name: 'prefix-tags-with-info-prop', value: 'title' },
        { name: 'prefix-tags-with-filename', value: true },
        { name: 'without-x-tag-groups', value: true },
        { name: 'prefix-components-with-info-prop', value: 'title' },
      ];

      test.each(options)('test with option: %s', async (option) => {
        const testPath = join(__dirname, `join/${option.name}`);
        const argsWithOptions = [...entrypoints, ...[`--${option.name}=${option.value}`]];
        const args = getParams(indexEntryPoint, ['join', ...argsWithOptions]);
        const result = getCommandOutput(args, {}, { testPath });
        await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
      });
    });

    describe('with metadata', () => {
      test('with metadata', async () => {
        const testPath = join(__dirname, `join/with-metadata`);
        const args = getParams(indexEntryPoint, ['join', 'test.yaml', 'pet.yaml']);
        const result = getCommandOutput(args, {}, { testPath });
        await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
      });
    });

    describe('files with different extensions', () => {
      const joinParameters: {
        name: string;
        folder: string;
        entrypoints: string[];
        snapshot: string;
        output?: string;
      }[] = [
        {
          name: 'first entrypoint is a json file',
          folder: 'json-and-yaml-input',
          entrypoints: ['foo.json', 'bar.yaml'],
          snapshot: 'json-output.snapshot.txt',
        },
        {
          name: 'first entrypoint is a yaml file',
          folder: 'json-and-yaml-input',
          entrypoints: ['bar.yaml', 'foo.json'],
          snapshot: 'yaml-output.snapshot.txt',
        },
        {
          name: 'json output file',
          folder: 'yaml-input-and-json-output',
          entrypoints: ['foo.yaml', 'bar.yaml'],
          output: 'openapi.json',
          snapshot: 'snapshot.txt',
        },
      ];

      test.each(joinParameters)('test with option: %s', async (parameters) => {
        const testPath = join(__dirname, `join/${parameters.folder}`);
        const argsWithOption = parameters.output
          ? [...parameters.entrypoints, ...[`-o=${parameters.output}`]]
          : parameters.entrypoints;
        const args = getParams(indexEntryPoint, ['join', ...argsWithOption]);
        const result = getCommandOutput(args, {}, { testPath });
        await expect(cleanupOutput(result)).toMatchFileSnapshot(
          join(testPath, parameters.snapshot)
        );
      });
    });
  });

  describe('bundle', () => {
    const excludeFolders = [
      'bundle-remove-unused-components',
      'bundle-remove-unused-components-from-config',
      'bundle-arazzo-valid-test-description',
      'bundle-no-output-without-inline-apis',
    ];
    const folderPath = join(__dirname, 'bundle');
    const contents = readdirSync(folderPath).filter((folder) => !excludeFolders.includes(folder));

    for (const file of contents) {
      const testPath = join(folderPath, file);
      if (statSync(testPath).isFile()) {
        continue;
      }

      const entryPoints = getEntrypoints(testPath);

      const args = getParams(indexEntryPoint, ['bundle', ...entryPoints]);

      test(file, async () => {
        const result = getCommandOutput(args, {}, { testPath });
        await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
      });
    }

    test('bundle-arazzo-valid-test-description', async () => {
      const testPath = join(folderPath, 'bundle-arazzo-valid-test-description');
      const args = getParams(indexEntryPoint, ['bundle', 'museum.yaml']);

      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });

    test('bundle should NOT be invoked IF no positional apis provided AND --output specified', async () => {
      const testPath = join(folderPath, 'bundle-no-output-without-inline-apis');
      const args = getParams(indexEntryPoint, ['bundle', '--output=dist']);
      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });
  });

  describe('bundle with option: remove-unused-components', () => {
    test.each(['oas2', 'oas3'])('%s: should remove unused components', async (type) => {
      const testPath = join(__dirname, `bundle/bundle-remove-unused-components/${type}`);
      const entryPoints = getEntrypoints(testPath);
      const args = [indexEntryPoint, 'bundle', '--remove-unused-components', ...entryPoints];
      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(
        join(testPath, 'remove-unused-components-snapshot.txt')
      );
    });
  });

  describe('bundle with option in config: remove-unused-components', () => {
    test.each(['oas2', 'oas3'])('%s: should remove unused components', async (type) => {
      const testPath = join(
        __dirname,
        `bundle/bundle-remove-unused-components-from-config/${type}`
      );
      const entryPoints = getEntrypoints(testPath);
      const args = [indexEntryPoint, 'bundle', ...entryPoints];
      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(
        join(testPath, 'remove-unused-components-snapshot.txt')
      );
    });

    test.each(['oas2-without-option', 'oas3-without-option'])(
      "%s: shouldn't remove unused components",
      async (type) => {
        const testPath = join(
          __dirname,
          `bundle/bundle-remove-unused-components-from-config/${type}`
        );
        const entryPoints = getEntrypoints(testPath);
        const args = [indexEntryPoint, 'bundle', ...entryPoints];
        const result = getCommandOutput(args, {}, { testPath });
        await expect(cleanupOutput(result)).toMatchFileSnapshot(
          join(testPath, 'without-remove-unused-components-snapshot.txt')
        );
      }
    );
  });

  describe('bundle with option: dereferenced', () => {
    it('description should not be from $ref', async () => {
      const testPath = join(__dirname, `bundle/bundle-description-dereferenced`);
      const args = getParams(indexEntryPoint, ['bundle', 'test.yaml', '--dereferenced']);

      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot_2.txt'));
    });

    it('discriminator mapping should be replaced with correct references to components', async () => {
      const testPath = join(__dirname, `bundle/discriminator-mapping`);
      const args = getParams(indexEntryPoint, ['bundle', 'main.yaml', '--dereferenced']);

      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot_2.txt'));
    });
  });

  describe('bundle with long description', () => {
    it('description should not be in folded mode', async () => {
      const testPath = join(__dirname, `bundle/bundle-description-long`);
      const args = getParams(indexEntryPoint, ['bundle', 'test.yaml']);

      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot_2.txt'));
    });
  });

  describe('miscellaneous', () => {
    const folderPath = join(__dirname, 'miscellaneous');

    test('bundle should resolve $refs in preprocessors', async () => {
      const testPath = join(folderPath, 'resolve-refs-in-preprocessors');
      const args = getParams(indexEntryPoint, ['bundle', 'openapi.yaml']);
      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });

    test('lint should resolve $refs in preprocessors', async () => {
      const testPath = join(folderPath, 'resolve-refs-in-preprocessors');
      const args = getParams(indexEntryPoint, ['lint', 'openapi.yaml']);
      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot_2.txt'));
    });

    test('stat should print the correct summary with $refs in preprocessors', async () => {
      const testPath = join(folderPath, 'resolve-refs-in-preprocessors');
      const args = getParams(indexEntryPoint, ['stats', 'openapi.yaml']);
      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot_3.txt'));
    });

    test('lint with a rule from a plugin', async () => {
      const testPath = join(folderPath, 'resolve-plugins');
      const args = getParams(indexEntryPoint, [
        'lint',
        'openapi.yaml',
        '--config=plugin-config.yaml',
      ]);
      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });

    test('decorate with a decorator from a plugin', async () => {
      const testPath = join(folderPath, 'resolve-plugins');
      const args = getParams(indexEntryPoint, [
        'bundle',
        'openapi.yaml',
        '--config=plugin-config.yaml',
      ]);
      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot_2.txt'));
    });

    test('apply a decorator to a specific api (without specifying the api)', async () => {
      const testPath = join(folderPath, 'apply-per-api-decorators');
      const args = getParams(indexEntryPoint, ['bundle', '--config=nested/redocly.yaml']);
      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });

    test('apply a decorator to a specific api (when the api is specified as an alias)', async () => {
      const testPath = join(folderPath, 'apply-per-api-decorators');
      const args = getParams(indexEntryPoint, [
        'bundle',
        '--config=nested/redocly.yaml',
        'test@fs',
      ]);
      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot_2.txt'));
    });

    test('lint a specific api (when the api is specified as an alias and it points to an external URL)', async () => {
      const testPath = join(folderPath, 'apply-per-api-decorators');
      const args = getParams(indexEntryPoint, [
        'lint',
        '--config=nested/redocly.yaml',
        'test@external-url',
      ]);
      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot_3.txt'));
    });
  });

  describe('build-docs', () => {
    const folderPath = join(__dirname, 'build-docs');

    test('simple build-docs', async () => {
      const testPath = join(folderPath, 'simple-build-docs');
      const args = getParams(indexEntryPoint, ['build-docs', 'pets.yaml']);
      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));

      expect(existsSync(join(testPath, 'redoc-static.html'))).toEqual(true);
    });

    test('build docs with config option', async () => {
      const testPath = join(folderPath, 'build-docs-with-config-option');
      const args = getParams(indexEntryPoint, [
        'build-docs',
        'nested/openapi.yaml',
        '--config=nested/redocly.yaml',
        '-o=nested/redoc-static.html',
      ]);
      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));

      expect(existsSync(join(testPath, 'nested/redoc-static.html'))).toEqual(true);
      expect(statSync(join(testPath, 'nested/redoc-static.html')).size).toEqual(36309);
    });
  });

  describe('stats', () => {
    const folderPath = join(__dirname, 'stats');

    test('stats should produce correct output (stylish format)', async () => {
      const testPath = join(folderPath, 'stats-stylish');
      const args = getParams(indexEntryPoint, ['stats', 'museum.yaml']);
      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });

    test('stats should produce correct JSON output', async () => {
      const testPath = join(folderPath, 'stats-json');
      const args = getParams(indexEntryPoint, ['stats', 'museum.yaml', '--format=json']);
      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });

    test('stats should produce correct Markdown format', async () => {
      const testPath = join(folderPath, 'stats-markdown');
      const args = getParams(indexEntryPoint, ['stats', 'museum.yaml', '--format=markdown']);
      const result = getCommandOutput(args, {}, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });
  });
});

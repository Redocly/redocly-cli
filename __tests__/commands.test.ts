import { readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';
//@ts-ignore
import { toMatchSpecificSnapshot } from './specific-snapshot';
import {
  getCommandOutput,
  getEntrypoints,
  callSerializer,
  getParams,
  cleanupOutput,
} from './helpers';
import * as fs from 'fs';
import { spawnSync } from 'child_process';

expect.extend({
  toMatchExtendedSpecificSnapshot(received, snapshotFile) {
    return toMatchSpecificSnapshot.call(this, received + 1, snapshotFile);
  },
});

callSerializer();

describe('E2E', () => {
  describe('lint', () => {
    const folderPath = join(__dirname, 'lint');
    const contents = readdirSync(folderPath);
    for (const file of contents) {
      const testPath = join(folderPath, file);
      if (statSync(testPath).isFile()) continue;
      if (!existsSync(join(testPath, 'redocly.yaml'))) continue;

      const args = getParams('../../../packages/cli/src/index.ts', 'lint');

      it(file, () => {
        const result = getCommandOutput(args, testPath);
        (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
      });
    }
  });

  describe('zero-config', () => {
    const folderPath = join(__dirname, 'zero-config');

    it('default-recommended-fallback', () => {
      const testPath = join(folderPath, 'default-recommended-fallback');
      const args = getParams('../../../packages/cli/src/index.ts', 'lint', [
        join(testPath, './openapi.yaml'),
      ]);
      const result = getCommandOutput(args, testPath);
      (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
    });

    it('no-default-recommended-fallback', () => {
      const testPath = join(folderPath, 'no-default-recommended-fallback');
      const args = getParams('../../../packages/cli/src/index.ts', 'lint', [
        join(testPath, './openapi.yaml'),
      ]);
      const result = getCommandOutput(args, testPath);
      (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
    });
  });

  describe('check-config', () => {
    const folderPathWithOptions: { dirName: string; option: string | null }[] = [
      { dirName: 'invalid-config--lint-config-warn', option: 'warn' },
      { dirName: 'invalid-config--lint-config-error', option: 'error' },
      { dirName: 'invalid-config--no-option', option: null },
      { dirName: 'valid-config', option: null },
    ];

    test.each(folderPathWithOptions)('test with option: %s', (folderPathWithOptions) => {
      const { dirName, option } = folderPathWithOptions;
      const folderPath = join(__dirname, `check-config/${dirName}`);
      const args = [...([option && `--lint-config=${option}`].filter(Boolean) as string[])];

      const passedArgs = getParams('../../../packages/cli/src/index.ts', 'check-config', args);

      const result = getCommandOutput(passedArgs, folderPath);
      (expect(result) as any).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
    });

    test('run with config option', () => {
      const dirName = 'valid-config-with-config-option';
      const folderPath = join(__dirname, `check-config/${dirName}`);

      const passedArgs = getParams('../../../packages/cli/src/index.ts', 'check-config', [
        '--config=nested/redocly.yaml',
      ]);

      const result = getCommandOutput(passedArgs, folderPath);
      (expect(result) as any).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
    });

    test('config type extension in assertions', () => {
      const dirName = 'config-type-extensions-in-assertions';
      const folderPath = join(__dirname, `check-config/${dirName}`);

      const passedArgs = getParams('../../../packages/cli/src/index.ts', 'check-config', [
        '--config=redocly.yaml',
      ]);

      const result = getCommandOutput(passedArgs, folderPath);
      (expect(result) as any).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
    });

    test('wrong config type extension in assertions', () => {
      const dirName = 'wrong-config-type-extensions-in-assertions';
      const folderPath = join(__dirname, `check-config/${dirName}`);

      const passedArgs = getParams('../../../packages/cli/src/index.ts', 'check-config', [
        '--config=redocly.yaml',
      ]);

      const result = getCommandOutput(passedArgs, folderPath);
      (expect(result) as any).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
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

    test.each(lintOptions)('test with option: %s', (lintOptions) => {
      const { dirName, option, format } = lintOptions;
      const folderPath = join(__dirname, `lint-config/${dirName}`);
      const relativeValidOpenapiFile = relative(folderPath, validOpenapiFile);
      const args = [
        relativeValidOpenapiFile,
        ...([option && `--lint-config=${option}`, format && `--format=${format}`].filter(
          Boolean
        ) as string[]),
      ];

      const passedArgs = getParams('../../../packages/cli/src/index.ts', 'lint', args);

      const result = getCommandOutput(passedArgs, folderPath);
      (expect(result) as any).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
    });

    const configSeverityOptions: { dirName: string; option: string | null; snapshot: string }[] = [
      {
        dirName: 'invalid-definition-and-config',
        option: 'error',
        snapshot: 'config-with-error.snapshot.js',
      },
      {
        dirName: 'invalid-definition-and-config',
        option: 'warn',
        snapshot: 'config-with-warn.snapshot.js',
      },
    ];

    test.each(configSeverityOptions)('invalid-definition-and-config: %s', (severityOption) => {
      const { dirName, option, snapshot } = severityOption;
      const folderPath = join(__dirname, `lint-config/${dirName}`);
      const relativeInvalidOpenapiFile = relative(folderPath, invalidOpenapiFile);
      const args = [relativeInvalidOpenapiFile, `--lint-config=${option}`];
      const passedArgs = getParams('../../../packages/cli/src/index.ts', 'lint', args);

      const result = getCommandOutput(passedArgs, folderPath);

      (expect(result) as any).toMatchSpecificSnapshot(join(folderPath, snapshot));
    });
  });

  describe('split', () => {
    test('without option: outDir', () => {
      const folderPath = join(__dirname, `split/missing-outDir`);

      const args = getParams('../../../packages/cli/src/index.ts', 'split', [
        '../../../__tests__/split/test-split/spec.json',
      ]);

      const result = getCommandOutput(args, folderPath);
      (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
    });

    test('swagger', () => {
      const folderPath = join(__dirname, `split/oas2`);

      const args = getParams('../../../packages/cli/src/index.ts', 'split', [
        '../../../__tests__/split/oas2/openapi.yaml',
        '--outDir=output',
      ]);

      const result = getCommandOutput(args, folderPath);
      (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
    });

    test('openapi with no errors', () => {
      const folderPath = join(__dirname, `split/oas3-no-errors`);
      const file = '../../../__tests__/split/oas3-no-errors/openapi.yaml';

      const args = getParams('../../../packages/cli/src/index.ts', 'split', [
        file,
        '--outDir=output',
      ]);

      const result = getCommandOutput(args, folderPath);
      (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
    });

    test('with separator: /', () => {
      const folderPath = join(__dirname, `split/slash-separator`);
      const file = '../../../__tests__/split/slash-separator/openapi.yaml';

      const args = getParams('../../../packages/cli/src/index.ts', 'split', [
        file,
        '--separator=/',
        '--outDir=output',
      ]);

      const result = getCommandOutput(args, folderPath);
      (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
    });

    test('openapi json file', () => {
      const folderPath = join(__dirname, `split/openapi-json-file`);
      const file = '../../../__tests__/split/openapi-json-file/openapi.json';

      const args = getParams('../../../packages/cli/src/index.ts', 'split', [
        file,
        '--outDir=output',
      ]);

      const result = getCommandOutput(args, folderPath);
      (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
    });

    test('openapi json file refs validation', () => {
      const folderPath = join(__dirname, `split/refs-in-json`);
      const file = '../../../__tests__/split/refs-in-json/openapi.json';

      const args = getParams('../../../packages/cli/src/index.ts', 'split', [
        file,
        '--outDir=output',
      ]);

      // run the split command and write the result to files
      spawnSync('ts-node', args, {
        cwd: folderPath,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          NO_COLOR: 'TRUE',
        },
      });

      const lintArgs = getParams('../../../packages/cli/src/index.ts', 'lint', [
        join(folderPath, 'output/openapi.json'),
      ]);
      const lintResult = getCommandOutput(lintArgs, folderPath);
      (<any>expect(lintResult)).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
    });

    test('openapi json file with discriminator', () => {
      const folderPath = join(__dirname, `split/discriminator-in-json`);
      const file = '../../../__tests__/split/discriminator-in-json/openapi.json';

      const args = getParams('../../../packages/cli/src/index.ts', 'split', [
        file,
        '--outDir=output',
      ]);

      // run the split command and write the result to files
      spawnSync('ts-node', args, {
        cwd: folderPath,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          NO_COLOR: 'TRUE',
        },
      });

      const result = getCommandOutput(args, folderPath);
      (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
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

      test.each(testDirNames)('test: %s', (dir) => {
        const testPath = join(__dirname, `join/${dir}`);
        const args = getParams('../../../packages/cli/src/index.ts', 'join', entrypoints);
        const result = getCommandOutput(args, testPath);
        (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
      });
    });

    describe('with options', () => {
      const options: { name: string; value: string | boolean }[] = [
        { name: 'prefix-tags-with-info-prop', value: 'title' },
        { name: 'prefix-tags-with-filename', value: true },
        { name: 'without-x-tag-groups', value: true },
        { name: 'prefix-components-with-info-prop', value: 'title' },
      ];

      test.each(options)('test with option: %s', (option) => {
        const testPath = join(__dirname, `join/${option.name}`);
        const argsWithOptions = [...entrypoints, ...[`--${option.name}=${option.value}`]];
        const args = getParams('../../../packages/cli/src/index.ts', 'join', argsWithOptions);
        const result = getCommandOutput(args, testPath);
        (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
      });
    });

    describe('with metadata', () => {
      const testPath = join(__dirname, `join/with-metadata`);
      const args = getParams('../../../packages/cli/src/index.ts', 'join', [
        'test.yaml',
        'pet.yaml',
      ]);
      const result = getCommandOutput(args, testPath);
      (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
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
          snapshot: 'json-output.snapshot.js',
        },
        {
          name: 'first entrypoint is a yaml file',
          folder: 'json-and-yaml-input',
          entrypoints: ['bar.yaml', 'foo.json'],
          snapshot: 'yaml-output.snapshot.js',
        },
        {
          name: 'json output file',
          folder: 'yaml-input-and-json-output',
          entrypoints: ['foo.yaml', 'bar.yaml'],
          output: 'openapi.json',
          snapshot: 'snapshot.js',
        },
      ];

      test.each(joinParameters)('test with option: %s', (parameters) => {
        const testPath = join(__dirname, `join/${parameters.folder}`);
        const argsWithOption = parameters.output
          ? [...parameters.entrypoints, ...[`-o=${parameters.output}`]]
          : parameters.entrypoints;
        const args = getParams('../../../packages/cli/src/index.ts', 'join', argsWithOption);
        const result = getCommandOutput(args, testPath);
        (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(
          join(testPath, parameters.snapshot)
        );
      });
    });
  });

  describe('bundle', () => {
    const excludeFolders = [
      'bundle-remove-unused-components',
      'bundle-remove-unused-components-from-config',
    ];
    const folderPath = join(__dirname, 'bundle');
    const contents = readdirSync(folderPath).filter((folder) => !excludeFolders.includes(folder));

    for (const file of contents) {
      const testPath = join(folderPath, file);
      if (statSync(testPath).isFile()) {
        continue;
      }

      const entryPoints = getEntrypoints(testPath);

      const args = getParams('../../../packages/cli/src/index.ts', 'bundle', [...entryPoints]);

      it(file, () => {
        const result = getCommandOutput(args, testPath);
        (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
      });
    }
  });

  describe('bundle with option: remove-unused-components', () => {
    test.each(['oas2', 'oas3'])('%s: should remove unused components', (type) => {
      const folderPath = join(__dirname, `bundle/bundle-remove-unused-components/${type}`);
      const entryPoints = getEntrypoints(folderPath);
      const args = [
        '../../../../packages/cli/src/index.ts',
        'bundle',
        '--remove-unused-components',
        ...entryPoints,
      ];
      const result = getCommandOutput(args, folderPath);
      (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(
        join(folderPath, 'remove-unused-components-snapshot.js')
      );
    });
  });

  describe('bundle with option in config: remove-unused-components', () => {
    test.each(['oas2', 'oas3'])('%s: should remove unused components', (type) => {
      const folderPath = join(
        __dirname,
        `bundle/bundle-remove-unused-components-from-config/${type}`
      );
      const entryPoints = getEntrypoints(folderPath);
      const args = ['../../../../packages/cli/src/index.ts', 'bundle', ...entryPoints];
      const result = getCommandOutput(args, folderPath);
      (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(
        join(folderPath, 'remove-unused-components-snapshot.js')
      );
    });

    test.each(['oas2-without-option', 'oas3-without-option'])(
      "%s: shouldn't remove unused components",
      (type) => {
        const folderPath = join(
          __dirname,
          `bundle/bundle-remove-unused-components-from-config/${type}`
        );
        const entryPoints = getEntrypoints(folderPath);
        const args = ['../../../../packages/cli/src/index.ts', 'bundle', ...entryPoints];
        const result = getCommandOutput(args, folderPath);
        (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(
          join(folderPath, 'without-remove-unused-components-snapshot.js')
        );
      }
    );
  });

  describe('bundle with option: dereferenced', () => {
    it('description should not be from $ref', () => {
      const folderPath = join(__dirname, `bundle/bundle-description-dereferenced`);
      const args = getParams('../../../packages/cli/src/index.ts', 'bundle', [
        'test.yaml',
        '--dereferenced',
      ]);

      const result = getCommandOutput(args, folderPath);
      (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
    });
  });

  describe('bundle with long description', () => {
    it('description should not be in folded mode', () => {
      const folderPath = join(__dirname, `bundle/bundle-description-long`);
      const args = getParams('../../../packages/cli/src/index.ts', 'bundle', ['test.yaml']);

      const result = getCommandOutput(args, folderPath);
      (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
    });
  });

  describe('miscellaneous', () => {
    const folderPath = join(__dirname, 'miscellaneous');

    test('bundle should resolve $refs in preprocessors', () => {
      const testPath = join(folderPath, 'resolve-refs-in-preprocessors');
      const args = getParams('../../../packages/cli/src/index.ts', 'bundle', ['openapi.yaml']);
      const result = getCommandOutput(args, testPath);
      (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
    });

    test('lint should resolve $refs in preprocessors', () => {
      const testPath = join(folderPath, 'resolve-refs-in-preprocessors');
      const args = getParams('../../../packages/cli/src/index.ts', 'lint', ['openapi.yaml']);
      const result = getCommandOutput(args, testPath);
      (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
    });

    test('stat should print the correct summary with $refs in preprocessors', () => {
      const testPath = join(folderPath, 'resolve-refs-in-preprocessors');
      const args = getParams('../../../packages/cli/src/index.ts', 'stats', ['openapi.yaml']);
      const result = getCommandOutput(args, testPath);
      (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
    });
  });

  describe('build-docs', () => {
    const folderPath = join(__dirname, 'build-docs');

    test('simple build-docs', () => {
      const testPath = join(folderPath, 'simple-build-docs');
      const args = getParams('../../../packages/cli/src/index.ts', 'build-docs', ['pets.yaml']);
      const result = getCommandOutput(args, testPath);
      (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));

      expect(fs.existsSync(join(testPath, 'redoc-static.html'))).toEqual(true);
    });

    test('build docs with config option', () => {
      const testPath = join(folderPath, 'build-docs-with-config-option');
      const args = getParams('../../../packages/cli/src/index.ts', 'build-docs', [
        'nested/openapi.yaml',
        '--config=nested/redocly.yaml',
        '-o=nested/redoc-static.html',
      ]);
      const result = getCommandOutput(args, testPath);
      (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));

      expect(fs.existsSync(join(testPath, 'nested/redoc-static.html'))).toEqual(true);
      expect(fs.statSync(join(testPath, 'nested/redoc-static.html')).size).toEqual(33012);
    });
  });

  describe('stats', () => {
    const folderPath = join(__dirname, 'stats');

    test('stats should produce correct output (stylish format)', () => {
      const testPath = join(folderPath, 'stats-stylish');
      const args = getParams('../../../packages/cli/src/index.ts', 'stats', ['museum.yaml']);
      const result = getCommandOutput(args, testPath);
      (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
    });

    test('stats should produce correct JSON output', () => {
      const testPath = join(folderPath, 'stats-json');
      const args = getParams('../../../packages/cli/src/index.ts', 'stats', [
        'museum.yaml',
        '--format=json',
      ]);
      const result = getCommandOutput(args, testPath);
      (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
    });

    test('stats should produce correct Markdown format', () => {
      const testPath = join(folderPath, 'stats-markdown');
      const args = getParams('../../../packages/cli/src/index.ts', 'stats', [
        'museum.yaml',
        '--format=markdown',
      ]);
      const result = getCommandOutput(args, testPath);
      (<any>expect(cleanupOutput(result))).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
    });
  });
});

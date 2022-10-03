import { readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';
//@ts-ignore
import { toMatchSpecificSnapshot } from './specific-snapshot';
import { getCommandOutput, getEntrypoints, callSerializer, getParams } from './helpers';

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
      if (!existsSync(join(testPath, '.redocly.yaml'))) continue;

      const args = getParams('../../../packages/cli/src/index.ts', 'lint');

      it(file, () => {
        const result = getCommandOutput(args, testPath);
        (<any>expect(result)).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
      });
    }

    it('default-recommended-fallback', () => {
      const testPath = join(folderPath, 'default-recommended-fallback');
      const args = getParams('../../../packages/cli/src/index.ts', 'lint', [
        join(testPath, './openapi.yaml'),
      ]);
      const result = getCommandOutput(args, testPath);
      (<any>expect(result)).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
    });
  });

  describe('lint-config', () => {
    const lintOptions: { dirName: string; option: string | null; format?: string }[] = [
      { dirName: 'invalid-config--lint-config-off', option: 'off' },
      { dirName: 'invalid-config--lint-config-warn', option: 'warn' },
      { dirName: 'invalid-config--lint-config-error', option: 'error' },
      { dirName: 'invlid-lint-config-saverity', option: 'something' },
      { dirName: 'invalid-config--no-option', option: null },
      { dirName: 'invalid-config-assertation-name', option: 'error' },
      { dirName: 'invalid-config-assertation-config-type', option: 'error' },
      { dirName: 'invalid-config-format-json', option: 'warn', format: 'json' },
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

    test('invalid-definition-and-config', () => {
      const folderPath = join(__dirname, 'lint-config/invalid-definition-and-config');
      const relativeInvalidOpenapiFile = relative(folderPath, invalidOpenapiFile);
      const args = [relativeInvalidOpenapiFile, `--lint-config=error`];
      const passedArgs = getParams('../../../packages/cli/src/index.ts', 'lint', args);

      const result = getCommandOutput(passedArgs, folderPath);

      (expect(result) as any).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
    });
  });

  describe('split', () => {
    test('without option: outDir', () => {
      const folderPath = join(__dirname, `split/missing-outDir`);

      const args = getParams('../../../packages/cli/src/index.ts', 'split', [
        '../../../__tests__/split/test-split/spec.json',
      ]);

      const result = getCommandOutput(args, folderPath);
      (<any>expect(result)).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
    });

    test('swagger', () => {
      const folderPath = join(__dirname, `split/oas2`);

      const args = getParams('../../../packages/cli/src/index.ts', 'split', [
        '../../../__tests__/split/oas2/openapi.yaml',
        '--outDir=output',
      ]);

      const result = getCommandOutput(args, folderPath);
      (<any>expect(result)).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
    });

    test('openapi with no errors', () => {
      const folderPath = join(__dirname, `split/oas3-no-errors`);
      const file = '../../../__tests__/split/oas3-no-errors/openapi.yaml';

      const args = getParams('../../../packages/cli/src/index.ts', 'split', [
        file,
        '--outDir=output',
      ]);

      const result = getCommandOutput(args, folderPath);
      (<any>expect(result)).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
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
      ];

      test.each(testDirNames)('test: %s', (dir) => {
        const testPath = join(__dirname, `join/${dir}`);
        const args = getParams('../../../packages/cli/src/index.ts', 'join', entrypoints);
        const result = getCommandOutput(args, testPath);
        (<any>expect(result)).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
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
        (<any>expect(result)).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
      });
    });

    describe('with metadata', () => {
      const testPath = join(__dirname, `join/with-metadata`);
      const args = getParams('../../../packages/cli/src/index.ts', 'join', [
        'test.yaml',
        'pet.yaml',
      ]);
      const result = getCommandOutput(args, testPath);
      (<any>expect(result)).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
    });
  });

  describe('bundle', () => {
    const excludeFolders = ['bundle-remove-unused-components', 'bundle-lint-format'];
    const folderPath = join(__dirname, 'bundle');
    const contents = readdirSync(folderPath).filter((folder) => !excludeFolders.includes(folder));

    for (const file of contents) {
      const testPath = join(folderPath, file);
      if (statSync(testPath).isFile()) {
        continue;
      }

      const entryPoints = getEntrypoints(testPath);

      const args = getParams('../../../packages/cli/src/index.ts', 'bundle', [
        '--lint',
        '--max-problems=1',
        '--format=stylish',
        ...entryPoints,
      ]);

      it(file, () => {
        const result = getCommandOutput(args, testPath);
        (<any>expect(result)).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
      });
    }
  });

  describe('bundle lint format', () => {
    const folderPath = join(__dirname, 'bundle/bundle-lint-format');
    const entryPoints = getEntrypoints(folderPath);
    const args = getParams('../../../packages/cli/src/index.ts', 'bundle', [
      '--lint',
      '--max-problems=1',
      '-o=/tmp/null',
      ...entryPoints,
    ]);

    test.each(['codeframe', 'stylish', 'json', 'checkstyle'])(
      'bundle lint: should be formatted by format: %s',
      (format) => {
        const params = [...args, `--format=${format}`];
        const result = getCommandOutput(params, folderPath);
        (<any>expect(result)).toMatchSpecificSnapshot(
          join(folderPath, `${format}-format-snapshot.js`)
        );
      }
    );

    test.each(['noFormatParameter', 'emptyFormatValue'])(
      'bundle lint: no format parameter or empty value should be formatted as codeframe',
      (format) => {
        const formatArgument = format === 'emptyFormatValue' ? ['--format'] : [];
        const params = [...args, ...formatArgument];
        const result = getCommandOutput(params, folderPath);
        (<any>expect(result)).toMatchSpecificSnapshot(join(folderPath, `${format}-snapshot.js`));
      }
    );
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
      (<any>expect(result)).toMatchSpecificSnapshot(
        join(folderPath, 'remove-unused-components-snapshot.js')
      );
    });
  });

  describe('bundle with option: dereferenced', () => {
    it('description should not be from $ref', () => {
      const folderPath = join(__dirname, `bundle/bundle-description-dereferenced`);
      const args = getParams('../../../packages/cli/src/index.ts', 'bundle', [
        'test.yaml',
        '--dereferenced',
      ]);

      const result = getCommandOutput(args, folderPath);
      (<any>expect(result)).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
    });
  });
  describe('bundle with long description', () => {
    it('description should not be in folded mode', () => {
      const folderPath = join(__dirname, `bundle/bundle-description-long`);
      const args = getParams('../../../packages/cli/src/index.ts', 'bundle', ['test.yaml']);

      const result = getCommandOutput(args, folderPath);
      (<any>expect(result)).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
    });
  });
});

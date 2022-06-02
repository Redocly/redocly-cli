import { readdirSync, statSync, existsSync, readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { join } from 'path';
//@ts-ignore
import { toMatchSpecificSnapshot, addSerializer } from './specific-snapshot';
import { parseYaml } from '../packages/core/src/utils'; // not able to import from @redocly/openapi-core

expect.extend({
  toMatchExtendedSpecificSnapshot(received, snapshotFile) {
    return toMatchSpecificSnapshot.call(this, received + 1, snapshotFile);
  },
});

addSerializer({
  test: (val: any) => typeof val === 'string',
  print: (v: any) => cleanUpVersion(v),
});

function cleanUpVersion(str: string): string {
  return str.replace(/"version":\s(\".*\")*/g, '"version": "<version>"');
}

function getEntrypoints(folderPath: string) {
  const redoclyYamlFile = readFileSync(join(folderPath, ".redocly.yaml"), "utf8");
  const redoclyYaml = parseYaml(redoclyYamlFile) as { apis: Record<string, string>; };
  return Object.keys(redoclyYaml.apis);
}

function getCommandOutput(params: string[], folderPath: string) {
  const result = spawnSync('ts-node', params, {
    cwd: folderPath,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      NO_COLOR: 'TRUE',
    },
  });
  const out = result.stdout.toString('utf-8');
  const err = result.stderr.toString('utf-8');
  return `${out}\n${err}`;
}

describe('E2E', () => {
  describe('lint', () => {
    const folderPath = join(__dirname, 'lint');
    const contents = readdirSync(folderPath);
    for (const file of contents) {
      const testPath = join(folderPath, file);
      if (statSync(testPath).isFile()) continue;
      if (!existsSync(join(testPath, '.redocly.yaml'))) continue;

      const args = [
        '--transpile-only',
        '../../../packages/cli/src/index.ts',
        'lint'
      ];
      it(file, () => {
        const r = spawnSync('ts-node', args, {
          cwd: testPath,
          env: {
            ...process.env,
            NODE_ENV: 'test',
            NO_COLOR: 'TRUE',
          },
        });

        const out = r.stdout.toString('utf-8');
        const err = r.stderr.toString('utf-8');
        const result = `${out}\n${err}`;
        (<any>expect(result)).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
      });
    }
  });

  describe('split', () => {
    test('without option: outDir', () => {
      const folderPath = join(__dirname, `split/missing-outDir`);
      const args = [
        '--transpile-only',
        '../../../packages/cli/src/index.ts',
        'split',
        '../../../__tests__/split/test-split/spec.json',
      ];
      const result = getCommandOutput(args, folderPath);
      (<any>expect(result)).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
    });

    test('swagger', () => {
      const folderPath = join(__dirname, `split/oas2`);
      const args = [
        '--transpile-only',
        '../../../packages/cli/src/index.ts',
        'split',
        '../../../__tests__/split/oas2/openapi.yaml',
        '--outDir=output'
      ];
      const result = getCommandOutput(args, folderPath);
      (<any>expect(result)).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
    });

    test('openapi with no errors', () => {
      const folderPath = join(__dirname, `split/oas3-no-errors`);
      const file = '../../../__tests__/split/oas3-no-errors/openapi.yaml';
      const args = [
        '--transpile-only',
        '../../../packages/cli/src/index.ts',
        'split',
        file,
        '--outDir=output'
      ];
      const result = getCommandOutput(args, folderPath);
      (<any>expect(result)).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
    });
  });


  describe('join', () => {
    const args = [
      '--transpile-only',
      '../../../packages/cli/src/index.ts',
      'join',
      'foo.yaml',
      'bar.yaml'
    ];

    describe('join without options', () => {
      const testDirNames = [
        'fails-if-no-info-section',
        'fails-if-tags-duplication',
        'reference-in-description',
        'two-files-with-no-errors',
        'fails-if-component-conflicts'
      ];

      it.each(testDirNames)('test: %s', (dir) => {
        const testPath = join(__dirname, `join/${dir}`);
        const result = getCommandOutput(args, testPath);
        (<any>expect(result)).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
      });    
    })
   
    describe('join with options', () => {
      const options = [
        'prefix-tags-with-info-prop',
        'prefix-tags-with-filename',
        'skip-tags-check',
        'prefix-components-with-info-prop'
      ];

      it.each(options)('test with option: %s', (option) => {
        const testPath = join(__dirname, `join/${option}`);
        const isPropOption = option === 'prefix-components-with-info-prop' || option === 'prefix-tags-with-info-prop';
        const optionType = isPropOption ? [`--${option}=title`] : [`--${option}`]
        const argsWithOptions = [...args, ...optionType];
        const result = getCommandOutput(argsWithOptions, testPath);
        (<any>expect(result)).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
      })
    })
  });

  describe('bundle', () => {
    const excludeFolders = [
      'bundle-remove-unused-components',
      'bundle-lint-format',
    ];
    const folderPath = join(__dirname, 'bundle');
    const contents = readdirSync(folderPath).filter(folder => !excludeFolders.includes(folder));

    for (const file of contents) {
      const testPath = join(folderPath, file);
      if (statSync(testPath).isFile()) {
        continue;
      }

      const entryPoints = getEntrypoints(testPath);
      const args = [
        '../../../packages/cli/src/index.ts',
        '--lint',
        '--max-problems=1',
        'bundle',
        '--format=stylish',
        ...entryPoints
      ];

      it(file, () => {
        const r = spawnSync('ts-node', args, {
          cwd: testPath,
          env: {
            ...process.env,
            NODE_ENV: 'test',
            NO_COLOR: 'TRUE',
          },
        });

        const out = r.stdout.toString('utf-8');
        const err = r.stderr.toString('utf-8');
        const result = `${out}\n${err}`;
        (<any>expect(result)).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
      });
    }
  });

  describe('bundle lint format', () => {
    let args: string[];
    let folderPath: string;

    beforeAll(() => {
      folderPath = join(__dirname, "bundle/bundle-lint-format");
      const entryPoints = getEntrypoints(folderPath);
      args = [
        "../../../packages/cli/src/index.ts",
        "--max-problems=1",
        "-o=/tmp/null",
        "bundle",
        "--lint",
        ...entryPoints,
      ];
    });

    test.each(['codeframe','stylish','json','checkstyle'])('bundle lint: should be formatted by format: %s', (format) => {
      const params = [...args, `--format=${format}`];
      const result = getCommandOutput(params, folderPath);
      (<any>expect(result)).toMatchSpecificSnapshot(join(folderPath, `${format}-format-snapshot.js`));
    });

    test.each(['noFormatParameter','emptyFormatValue'])('bundle lint: no format parameter or empty value should be formatted as codeframe', (format) => {
      const formatArgument = format === 'emptyFormatValue' ? ['--format'] : [];
      const params = [...args, ... formatArgument];
      const result = getCommandOutput(params, folderPath);
      (<any>expect(result)).toMatchSpecificSnapshot(join(folderPath, `${format}-snapshot.js`));
    });
  });

  describe('bundle with option: remove-unused-components', () => {
    test.each(['oas2','oas3'])('%s: should remove unused components', (type) => {
      const folderPath = join(__dirname, `bundle/bundle-remove-unused-components/${type}`);
      const entryPoints = getEntrypoints(folderPath);
      const args = [
        "../../../../packages/cli/src/index.ts",
        "bundle",
        "--remove-unused-components",
        ...entryPoints,
      ];
      const result = getCommandOutput(args, folderPath);
      (<any>expect(result)).toMatchSpecificSnapshot(join(folderPath, 'remove-unused-components-snapshot.js'));
    });
  });
});

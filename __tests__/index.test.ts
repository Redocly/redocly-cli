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
  print: (v: any) => v as string,
});

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

        // @ts-ignore
        expect(result).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
      });
    }
  });

  describe('join', () => {
    const folderPath = join(__dirname, 'join');
    const contents = readdirSync(folderPath);

    for (const file of contents) {
      const testPath = join(folderPath, file);

      if (statSync(testPath).isFile()) {
        continue;
      }

      const args = [
        '--transpile-only',
        '../../../packages/cli/src/index.ts',
        'join',
        'foo.yaml',
        'bar.yaml'
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

        // @ts-ignore
        expect(result).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
      });
    }
  });

  describe('bundle', () => {
    const folderPath = join(__dirname, 'bundle');
    const contents = readdirSync(folderPath);

    for (const file of contents) {
      const testPath = join(folderPath, file);

      if (statSync(testPath).isFile()) {
        continue;
      }

      const redoclyYamlFile = readFileSync(join(testPath, '.redocly.yaml'), 'utf8');
      const redoclyYaml = parseYaml(redoclyYamlFile) as { apiDefinitions: Record<string, string> };
      const entryPoints = Object.keys(redoclyYaml.apiDefinitions);

      const args = [
        '../../../packages/cli/src/index.ts',
        '--lint',
        '--max-problems=1',
        'bundle',
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

        // @ts-ignore
        expect(result).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
      });
    }
  });

  describe('bundle lint format', () => {
    let args;
    let folderPath;

    function getBundleResult(params) {
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

    beforeAll(() => {
      folderPath = join(__dirname, "bundle/bundle-lint-format");
      const redoclyYamlFile = readFileSync(join(folderPath, ".redocly.yaml"), "utf8");
      const redoclyYaml = parseYaml(redoclyYamlFile) as { apiDefinitions: Record<string, string>; };
      const entryPoints = Object.keys(redoclyYaml.apiDefinitions);
      args = [
        "../../../packages/cli/src/index.ts",
        "--max-problems=1",
        "bundle",
        ...entryPoints,
        "--lint",
      ];
    });

    test.each(['codeframe','stylish','json'])('bundle lint: should be formatted by format: %s', (format) => {
      const params = [...args, `--format=${format}`];
      const result = getBundleResult(params);
      expect(result).toMatchSpecificSnapshot(join(folderPath, `${format}-format-snapshot.js`));
    });

    test.each(['noFormatParameter','emptyFormatValue'])('bundle lint: no format parameter or empty value should be formatted as codeframe', (format) => {
      const formatArgument = format === 'emptyFormatValue' ? ['--format'] : [];
      const params = [...args, ... formatArgument];
      const result = getBundleResult(params);
      expect(result).toMatchSpecificSnapshot(join(folderPath, `${format}-snapshot.js`));
    });
  });
});

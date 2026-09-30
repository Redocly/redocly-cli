import { readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

describe('diff', () => {
  test('should list what breaks per endpoint and fail on a major change', async () => {
    const testPath = join(__dirname, 'openapi-breaking-changes');
    const args = getParams(indexEntryPoint, ['diff', 'base.yaml', 'revision.yaml']);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('should fail --check-version when info.version is bumped less than the changes require', async () => {
    const testPath = join(__dirname, 'openapi-breaking-changes');
    const args = getParams(indexEntryPoint, [
      'diff',
      'base.yaml',
      'revision.yaml',
      '--check-version',
      '--fail-on=none',
    ]);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(testPath, 'snapshot-check-version.txt')
    );
  });

  test('should pass a revision that only adds to the API and bumps info.version', async () => {
    const testPath = join(__dirname, 'openapi-compatible-changes');
    const args = getParams(indexEntryPoint, [
      'diff',
      'base.yaml',
      'revision.yaml',
      '--check-version',
    ]);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('should fail on the impact --fail-on names', async () => {
    const testPath = join(__dirname, 'openapi-compatible-changes');
    const args = getParams(indexEntryPoint, [
      'diff',
      'base.yaml',
      'revision.yaml',
      '--fail-on=minor',
    ]);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(testPath, 'snapshot-fail-on-minor.txt')
    );
  });

  test.each(['markdown', 'html'])(
    'should write a %s report to the file --output names',
    async (format) => {
      const testPath = join(__dirname, 'markdown-and-html');
      const args = getParams(indexEntryPoint, [
        'diff',
        'base.yaml',
        'revision.yaml',
        `--format=${format}`,
        `--output=report.${format}`,
      ]);

      getCommandOutput(args, { testPath });
      const report = readFileSync(join(testPath, `report.${format}`), 'utf-8');
      rmSync(join(testPath, `report.${format}`));
      await expect(report).toMatchFileSnapshot(join(testPath, `snapshot-${format}.txt`));
    }
  );

  test.each(['json', 'next-version'])(
    'should print the %s format for a script to read',
    async (format) => {
      const testPath = join(__dirname, 'json-and-next-version');
      const args = getParams(indexEntryPoint, [
        'diff',
        'base.yaml',
        'revision.yaml',
        `--format=${format}`,
      ]);

      const result = getCommandOutput(args, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(
        join(testPath, `snapshot-${format}.txt`)
      );
    }
  );

  test('should annotate each breaking change on GitHub', async () => {
    const testPath = join(__dirname, 'github-actions');
    const args = getParams(indexEntryPoint, [
      'diff',
      'base.yaml',
      'revision.yaml',
      '--format=github-actions',
    ]);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('should refuse to write github-actions annotations to a file', async () => {
    const testPath = join(__dirname, 'github-actions');
    const args = getParams(indexEntryPoint, [
      'diff',
      'base.yaml',
      'revision.yaml',
      '--format=github-actions',
      '--output=annotations.txt',
    ]);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot-output.txt'));
  });

  test('should judge an AsyncAPI 3 change per channel, operation and server', async () => {
    const testPath = join(__dirname, 'asyncapi3');
    const args = getParams(indexEntryPoint, ['diff', 'base.yaml', 'revision.yaml']);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('should not report a move from OpenAPI 3.0 to 3.1 that describes the same API', async () => {
    const testPath = join(__dirname, 'openapi-3-0-to-3-1');
    const args = getParams(indexEntryPoint, ['diff', 'base.yaml', 'revision.yaml']);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('should compare two APIs by their aliases and judge them with the rules of redocly.yaml', async () => {
    const testPath = join(__dirname, 'configuration');
    const args = getParams(indexEntryPoint, ['diff', 'cafe@v1', 'cafe@v2']);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('should leave out the rules --skip-rule names', async () => {
    const testPath = join(__dirname, 'configuration');
    const args = getParams(indexEntryPoint, [
      'diff',
      'cafe@v1',
      'cafe@v2',
      '--skip-rule=operation-removed',
      '--skip-rule=property-removed',
    ]);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(testPath, 'snapshot-skip-rule.txt')
    );
  });

  test('should use the config file --config names', async () => {
    const testPath = join(__dirname, 'config-file');
    const args = getParams(indexEntryPoint, [
      'diff',
      'base.yaml',
      'revision.yaml',
      '--config=relaxed.yaml',
    ]);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('should judge a change with a diff rule from a plugin', async () => {
    const testPath = join(__dirname, 'plugin');
    const args = getParams(indexEntryPoint, ['diff', 'base.yaml', 'revision.yaml']);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });
});

import { readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getEntrypoints, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

describe('bundle', () => {
  const excludeFolders = [
    'bundle-remove-unused-components',
    'bundle-remove-unused-components-from-config',
    'bundle-remove-unused-components-from-api-config',
    'bundle-arazzo-valid-test-description',
    'bundle-no-output-without-inline-apis',
  ];
  const folderPath = __dirname;
  const contents = readdirSync(folderPath).filter((folder) => !excludeFolders.includes(folder));

  for (const file of contents) {
    const testPath = join(folderPath, file);
    if (statSync(testPath).isFile()) {
      continue;
    }

    const entryPoints = getEntrypoints(testPath);

    const args = getParams(indexEntryPoint, ['bundle', ...entryPoints]);

    test(file, async () => {
      const result = getCommandOutput(args, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });
  }

  test('bundle-arazzo-valid-test-description', async () => {
    const testPath = join(folderPath, 'bundle-arazzo-valid-test-description');
    const args = getParams(indexEntryPoint, ['bundle', 'museum.yaml']);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('bundle should NOT be invoked IF no positional apis provided AND --output specified', async () => {
    const testPath = join(folderPath, 'bundle-no-output-without-inline-apis');
    const args = getParams(indexEntryPoint, ['bundle', '--output=dist']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });
});

describe('bundle with option: remove-unused-components', () => {
  test.each(['oas2', 'oas3'])('%s: should remove unused components', async (type) => {
    const testPath = join(__dirname, `bundle-remove-unused-components/${type}`);
    const entryPoints = getEntrypoints(testPath);
    const args = [indexEntryPoint, 'bundle', '--remove-unused-components', ...entryPoints];
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(testPath, 'remove-unused-components-snapshot.txt')
    );
  });
});

describe('bundle with option in config: remove-unused-components', () => {
  test.each(['oas2', 'oas3'])('%s: should remove unused components', async (type) => {
    const testPath = join(__dirname, `bundle-remove-unused-components-from-config/${type}`);
    const entryPoints = getEntrypoints(testPath);
    const args = [indexEntryPoint, 'bundle', ...entryPoints];
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(testPath, 'remove-unused-components-snapshot.txt')
    );
  });

  test.each(['oas2-without-option', 'oas3-without-option'])(
    "%s: shouldn't remove unused components",
    async (type) => {
      const testPath = join(__dirname, `bundle-remove-unused-components-from-config/${type}`);
      const entryPoints = getEntrypoints(testPath);
      const args = [indexEntryPoint, 'bundle', ...entryPoints];
      const result = getCommandOutput(args, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(
        join(testPath, 'without-remove-unused-components-snapshot.txt')
      );
    }
  );
});

describe('bundle with option in api config: remove-unused-components', () => {
  test('oas2: should remove unused components', async () => {
    const testPath = join(__dirname, 'bundle-remove-unused-components-from-api-config/oas2');
    const args = getParams(indexEntryPoint, ['bundle', '--config=redocly.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(testPath, 'remove-unused-components-snapshot.txt')
    );
  });

  test('oas3: should remove unused components', async () => {
    const testPath = join(__dirname, 'bundle-remove-unused-components-from-api-config/oas3');
    const args = getParams(indexEntryPoint, ['bundle', '--config=redocly.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(testPath, 'remove-unused-components-snapshot.txt')
    );
  });
});

describe('bundle without option in api config: do not remove unused components', () => {
  test('oas2-without-option: should not remove unused components', async () => {
    const testPath = join(
      __dirname,
      'bundle-remove-unused-components-from-api-config/oas2-without-option'
    );
    const args = getParams(indexEntryPoint, ['bundle', '--config=redocly.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(testPath, 'keep-unused-components-snapshot.txt')
    );
  });

  test('oas3-without-option: should not remove unused components', async () => {
    const testPath = join(
      __dirname,
      'bundle-remove-unused-components-from-api-config/oas3-without-option'
    );
    const args = getParams(indexEntryPoint, ['bundle', '--config=redocly.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(testPath, 'keep-unused-components-snapshot.txt')
    );
  });

  test('oas3-with-decorator-off: should not remove unused components in the first api, but remove in the second', async () => {
    const testPath = join(
      __dirname,
      'bundle-remove-unused-components-from-api-config/oas3-with-decorator-off'
    );
    const args = getParams(indexEntryPoint, ['bundle', '--config=redocly.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(testPath, 'keep-unused-components-snapshot.txt')
    );
  });

  test('oas3-turn-off-with-flag: should not remove unused components even if the arg passed', async () => {
    const testPath = join(
      __dirname,
      'bundle-remove-unused-components-from-api-config/oas3-turn-off-with-flag'
    );
    const args = getParams(indexEntryPoint, [
      'bundle',
      '--config=redocly.yaml',
      '--remove-unused-components',
    ]);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(testPath, 'keep-unused-components-snapshot.txt')
    );
  });
});

describe('bundle with option: dereferenced', () => {
  it('description should not be from $ref', async () => {
    const testPath = join(__dirname, `bundle-description-dereferenced`);
    const args = getParams(indexEntryPoint, ['bundle', 'test.yaml', '--dereferenced']);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot_2.txt'));
  });

  it('discriminator mapping should be replaced with correct references to components', async () => {
    const testPath = join(__dirname, `discriminator-mapping`);
    const args = getParams(indexEntryPoint, ['bundle', 'main.yaml', '--dereferenced']);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot_2.txt'));
  });
});

describe('bundle with long description', () => {
  it('description should not be in folded mode', async () => {
    const testPath = join(__dirname, `bundle-description-long`);
    const args = getParams(indexEntryPoint, ['bundle', 'test.yaml']);

    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot_2.txt'));
  });
});

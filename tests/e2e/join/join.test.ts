import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

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
      'oas3.2',
    ];

    test.each(testDirNames)('test: %s', async (dir) => {
      const testPath = join(__dirname, `${dir}`);
      const args = getParams(indexEntryPoint, ['join', ...entrypoints]);
      const result = getCommandOutput(args, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });
  });

  test('three files one without servers', async () => {
    const testPath = join(__dirname, `three-files-one-without-servers`);
    const args = getParams(indexEntryPoint, ['join', ...entrypoints, 'baz.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  describe('with options', () => {
    const options: { name: string; value: string | boolean }[] = [
      { name: 'prefix-tags-with-info-prop', value: 'title' },
      { name: 'prefix-tags-with-filename', value: true },
      { name: 'without-x-tag-groups', value: true },
      { name: 'prefix-components-with-info-prop', value: 'title' },
    ];

    test.each(options)('test with option: %s', async (option) => {
      const testPath = join(__dirname, `${option.name}`);
      const argsWithOptions = [...entrypoints, ...[`--${option.name}=${option.value}`]];
      const args = getParams(indexEntryPoint, ['join', ...argsWithOptions]);
      const result = getCommandOutput(args, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });
  });

  describe('with metadata', () => {
    test('with metadata', async () => {
      const testPath = join(__dirname, `with-metadata`);
      const args = getParams(indexEntryPoint, ['join', 'test.yaml', 'pet.yaml']);
      const result = getCommandOutput(args, { testPath });
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
      const testPath = join(__dirname, `${parameters.folder}`);
      const argsWithOption = parameters.output
        ? [...parameters.entrypoints, ...[`-o=${parameters.output}`]]
        : parameters.entrypoints;
      const args = getParams(indexEntryPoint, ['join', ...argsWithOption]);
      const result = getCommandOutput(args, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, parameters.snapshot));
    });
  });
});

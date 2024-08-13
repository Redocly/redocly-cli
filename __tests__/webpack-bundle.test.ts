import { readFileSync } from 'fs';
import { join } from 'path';
import { getCommandOutput, getEntrypoints, callSerializer, getParams } from './helpers.js';
// @ts-ignore
import { toMatchSpecificSnapshot, addSerializer } from './specific-snapshot.cjs';

expect.extend({
  toMatchExtendedSpecificSnapshot(received, snapshotFile) {
    return toMatchSpecificSnapshot.call(this, received + 1, snapshotFile);
  },
});

callSerializer();

describe('webpack-bundle test', () => {
  test('bundle check', () => {
    const folderPath = join(__dirname, 'webpack-bundle/bundle');
    const entryPoint = getEntrypoints(folderPath);
    const args = getParams('../../../dist/bundle.js', 'bundle', ['-o=/tmp/null', ...entryPoint]);
    const result = getCommandOutput(args, folderPath);
    (<any>expect(result)).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
  });

  test('lint check', () => {
    const folderPath = join(__dirname, 'webpack-bundle/lint');
    const entryPoint = getEntrypoints(folderPath);
    const args = getParams('../../../dist/bundle.js', 'lint', [...entryPoint]);
    const result = getCommandOutput(args, folderPath);
    (<any>expect(result)).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
  });

  test('bundle-workflows', () => {
    const folderPath = join(__dirname, 'webpack-bundle/bundle-workflows');
    const entryPoint = getEntrypoints(folderPath);
    const args = getParams('../../../dist/bundle.js', 'bundle', [
      '--extends=redocly-registry',
      `--metafile=./metafile.json`,
      `-o=./bundle.yaml`,
      ...entryPoint,
    ]);

    const result = getCommandOutput(args, folderPath);

    const metaFile = readFileSync(`${folderPath}/metafile.json`, 'utf-8');
    const bundleFile = readFileSync(`${folderPath}/bundle.yaml`, 'utf-8');

    (<any>expect(metaFile)).toMatchSpecificSnapshot(join(folderPath, 'meta-snapshot.js'));
    (<any>expect(bundleFile)).toMatchSpecificSnapshot(join(folderPath, 'bundle-snapshot.js'));
    (<any>expect(result)).toMatchSpecificSnapshot(join(folderPath, 'result-snapshot.js'));
  });

  test('lint-workflows', () => {
    const folderPath = join(__dirname, 'webpack-bundle/lint-workflows');
    const entryPoint = getEntrypoints(folderPath);
    const args = getParams('../../../dist/bundle.js', 'lint', [
      '--format=json',
      '--lint-config=off',
      ...entryPoint,
    ]);
    const result = getCommandOutput(args, folderPath);
    (<any>expect(result)).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
  });

  test('lint-workflows-fail', () => {
    const folderPath = join(__dirname, 'webpack-bundle/lint-workflows-fail');
    const entryPoint = getEntrypoints(folderPath);
    const args = getParams('../../../dist/bundle.js', 'lint', [
      '--format=json',
      '--lint-config=off',
      ...entryPoint,
    ]);
    const result = getCommandOutput(args, folderPath);
    (<any>expect(result)).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
  });
});

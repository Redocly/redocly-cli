import { join } from 'path';
import { getCommandOutput, getEntrypoints, callSerializer, getParams } from './helpers';
//@ts-ignore
import { toMatchSpecificSnapshot, addSerializer } from './specific-snapshot';

expect.extend({
  toMatchExtendedSpecificSnapshot(received, snapshotFile) {
    return toMatchSpecificSnapshot.call(this, received + 1, snapshotFile);
  },
});

callSerializer();

describe('webpack-bundle test', () => {
  test('bundle check', () => {
    const folderPath = join(__dirname, 'webpack-bundle/bundle');
    const enryPoint = getEntrypoints(folderPath);
    const args = getParams('../../../dist/bundle.js', 'bundle', [
      '--max-problems=1',
      '-o=/tmp/null',
      '--lint',
      ...enryPoint,
    ]);
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
    const enryPoint = getEntrypoints(folderPath);
    const args = getParams('../../../dist/bundle.js', 'bundle', [
      '--extends=redocly-registry',
      '--metafile=/tmp/null',
      '-o=/tmp/null',
      ...enryPoint,
    ]);
    const result = getCommandOutput(args, folderPath);
    (<any>expect(result)).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
  });

  test('lint-workflows', () => {
    const folderPath = join(__dirname, 'webpack-bundle/lint-workflows');
    const enryPoint = getEntrypoints(folderPath);
    const args = getParams('../../../dist/bundle.js', 'lint', [
      '--format=stylish',
      '--lint-config=off',
      ...enryPoint,
    ]);
    const result = getCommandOutput(args, folderPath);
    (<any>expect(result)).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
  });
});

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
    const args = getParams('bundle', [
      '../../../dist/bundle.js',
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
    const enryPoint = getEntrypoints(folderPath);
    const args = getParams('lint', ['--transpile-only', '../../../dist/bundle.js', ...enryPoint]);
    const result = getCommandOutput(args, folderPath);
    (<any>expect(result)).toMatchSpecificSnapshot(join(folderPath, 'snapshot.js'));
  });
});

import { readdirSync, statSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { join } from 'path';
//@ts-ignore
import { toMatchSpecificSnapshot, addSerializer } from './specific-snapshot';

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
  })

  describe('join', () => {
    const folderPath = join(__dirname, 'join');
    const contents = readdirSync(folderPath);
    for (const file of contents) {
      const testPath = join(folderPath, file);
      if (statSync(testPath).isFile()) continue;

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
  })

});

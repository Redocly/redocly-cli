import { readdirSync, statSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import {join} from 'path';
import { toMatchSpecificSnapshot } from './specific-snapshot';


expect.extend({
  toMatchExtendedSpecificSnapshot(received, snapshotFile) {
    return toMatchSpecificSnapshot.call(this, received + 1, snapshotFile);
  },
});

describe('Run e2e tests tests', () => {
  const contents = readdirSync(__dirname);

  for (const file of contents) {
    const testPath = join(__dirname, file);
    if (statSync(testPath).isFile()) continue;
    if (!existsSync(join(testPath, '.redocly.yaml'))) continue;
    
    const r = spawnSync('npx', ['ts-node', '../../src/cli.ts', 'lint'], {
      cwd: testPath,
      env: {
        ...process.env,
        'TEST_RUN': 'TRUE',
        'NOCOLOR': 'TRUE',
      }
    });

    const out = r.stdout.toString('utf-8');
    const err = r.stderr.toString('utf-8')
    
    const result = `${out}\b${err}`

    it(`Test ${testPath}`, () => {
      // we need this cause TS types not actually allows to 'extend'
      (expect(result) as any).toMatchSpecificSnapshot(join(testPath, 'snapshot.js'));
    })
  }
});
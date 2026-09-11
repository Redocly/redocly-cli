import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const apiEntrypoint = join(process.cwd(), 'packages/cli/lib/api.js');

describe('@redocly/cli/api', () => {
  test('exposes push and pushStatus without running the CLI', () => {
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        `const api = await import(${JSON.stringify(apiEntrypoint)});
         console.log(JSON.stringify(Object.keys(api)));`,
        '--',
        '--unknown-flag',
      ],
      { encoding: 'utf-8' }
    );

    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toEqual(expect.arrayContaining(['push', 'pushStatus']));
  });
});

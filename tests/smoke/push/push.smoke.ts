import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

test(
  'push resources/description.md to the staging Reunite project',
  () => {
    const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
    const runId = process.env.GITHUB_RUN_ID || 'local';

    const result = spawnSync(
      'node',
      [
        indexEntryPoint,
        'push',
        'resources/description.md',
        '--organization',
        'redocly',
        '--project',
        'dark-side-push-command-test',
        '--mount-path',
        'cli-smoke',
        '--branch',
        'main',
        '--author',
        'Redocly CLI Smoke <cli-smoke@redocly.com>',
        '--message',
        `Smoke test push from GitHub run ${runId}`,
        '--domain',
        'https://app.bhstage.cloud',
        '--max-execution-time',
        '900',
        '--wait-for-deployment',
      ],
      {
        encoding: 'utf-8',
        env: { ...process.env, NO_COLOR: 'TRUE', FORCE_COLOR: '0' },
      }
    );

    const output = `${result.stdout}\n${result.stderr}`;

    expect(result.status, output).toBe(0);
    expect(output).toContain('Push ID:');
    // The file rarely changes between runs, so Reunite usually reports "no changes" instead of deploying.
    expect(output).toMatch(/Production deploy success\.|Reason: no changes\./);
    // The CLI gives up on the deployment after --max-execution-time, so the test needs a bit more.
  },
  16 * 60 * 1000
);

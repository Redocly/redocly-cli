import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';

import { runProvider } from '../ai/providers.js';

vi.mock('node:child_process', () => ({ spawn: vi.fn() }));
vi.mock('node:fs/promises', () => ({
  mkdtemp: vi.fn(async () => '/tmp/generate-spec-empty'),
}));

function stubChildProcess(stdout: string) {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    stdin: EventEmitter & { end: (input: string) => void };
  };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdin = Object.assign(new EventEmitter(), {
    end: () => {
      child.stdout.emit('data', Buffer.from(stdout));
      child.emit('close', 0);
    },
  });
  return child;
}

describe('runProvider', () => {
  beforeEach(() => {
    vi.mocked(spawn).mockClear();
    // The stub is not a full ChildProcess; only the pieces runCommand touches.
    vi.mocked(spawn).mockReturnValue(
      stubChildProcess('refined output') as unknown as ReturnType<typeof spawn>
    );
  });

  it('runs the claude CLI isolated from the local configuration', async () => {
    const result = await runProvider('claude', { system: 'sys prompt', user: 'user prompt' });

    expect(result.text).toBe('refined output');
    expect(spawn).toHaveBeenCalledWith(
      'claude',
      [
        '-p',
        '--output-format',
        'text',
        '--tools',
        '',
        '--strict-mcp-config',
        '--setting-sources',
        '',
        '--no-session-persistence',
        '--append-system-prompt',
        'sys prompt',
      ],
      expect.objectContaining({
        cwd: '/tmp/generate-spec-empty',
        env: expect.objectContaining({ CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1' }),
      })
    );
  });

  it('runs the codex CLI without MCP servers and project docs', async () => {
    await runProvider('codex', { system: 'sys prompt', user: 'user prompt', model: 'gpt-5' });

    expect(spawn).toHaveBeenCalledWith(
      'codex',
      [
        'exec',
        '--skip-git-repo-check',
        '--sandbox',
        'read-only',
        '-c',
        'mcp_servers={}',
        '-c',
        'project_doc_max_bytes=0',
        '--model',
        'gpt-5',
        '-',
      ],
      expect.objectContaining({ cwd: '/tmp/generate-spec-empty' })
    );
  });

  it('runs the cursor CLI with the workspace trusted', async () => {
    await runProvider('cursor', { system: 'sys prompt', user: 'user prompt' });

    expect(spawn).toHaveBeenCalledWith(
      'cursor-agent',
      ['-p', '--output-format', 'text', '--trust', 'sys prompt'],
      expect.objectContaining({ cwd: '/tmp/generate-spec-empty' })
    );
  });
});

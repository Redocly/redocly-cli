import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export type AiProvider = 'claude' | 'codex' | 'cursor';

export const AI_RESPONSE_TIMEOUT_MS = 300_000;

export class CliNotFoundError extends Error {}

export interface ProviderRequest {
  system: string;
  user: string;
  model?: string;
}

export interface ProviderResult {
  text: string;
}

// All provider CLIs pull project context (CLAUDE.md, AGENTS.md, .cursor/rules)
// from the working directory into every prompt; running them from an empty
// directory keeps that context out and each invocation fast.
let emptyCwdPromise: Promise<string> | undefined;

function getEmptyCwd(): Promise<string> {
  emptyCwdPromise ??= mkdtemp(path.join(tmpdir(), 'redocly-generate-spec-'));
  return emptyCwdPromise;
}

async function runCommand(
  command: string,
  args: string[],
  stdin: string,
  env?: Record<string, string>
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  const cwd = await getEmptyCwd();
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd,
      env: { ...process.env, ...env },
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, AI_RESPONSE_TIMEOUT_MS);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', (error: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      if (error.code === 'ENOENT') {
        reject(
          new CliNotFoundError(`Could not find the "${command}" CLI on PATH. Is it installed?`)
        );
        return;
      }
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(
          new Error(
            `The "${command}" CLI did not respond within ${AI_RESPONSE_TIMEOUT_MS / 1000} seconds.`
          )
        );
        return;
      }
      resolve({ stdout, stderr, code });
    });

    // The CLI may exit before consuming the prompt; without a listener the
    // resulting EPIPE on stdin would crash the process instead of surfacing
    // through the "error"/"close" handlers above.
    child.stdin.on('error', () => {});
    child.stdin.end(stdin);
  });
}

async function runClaude(request: ProviderRequest): Promise<ProviderResult> {
  // The prompt is a pure text transform: disabling built-in tools, MCP
  // servers, settings (with their hooks, skills, and plugins), and session
  // persistence keeps each invocation a single-shot completion without the
  // startup cost of the user's Claude Code configuration. Because settings
  // are skipped, a model configured there does not apply — only --ai-model
  // or the CLI's built-in default. The environment variable additionally
  // skips update checks and auxiliary telemetry calls.
  const args = [
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
    request.system,
  ];
  if (request.model) {
    args.push('--model', request.model);
  }
  const { stdout, stderr, code } = await runCommand('claude', args, request.user, {
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
  });
  if (code !== 0) {
    throw new Error(`claude CLI exited with code ${code}: ${stderr.trim()}`);
  }
  if (!stdout.trim()) {
    throw new Error('claude CLI returned no output.');
  }
  return { text: stdout };
}

async function runCodex(request: ProviderRequest): Promise<ProviderResult> {
  // The config overrides skip the user's MCP servers and AGENTS.md discovery;
  // the git-repo check must be skipped because the command runs from an empty
  // temporary directory, which also makes the read-only sandbox safe.
  const args = [
    'exec',
    '--skip-git-repo-check',
    '--sandbox',
    'read-only',
    '-c',
    'mcp_servers={}',
    '-c',
    'project_doc_max_bytes=0',
  ];
  if (request.model) {
    args.push('--model', request.model);
  }
  args.push('-');
  const prompt = `${request.system}\n\n${request.user}`;
  const { stdout, stderr, code } = await runCommand('codex', args, prompt);
  if (code !== 0) {
    throw new Error(`codex CLI exited with code ${code}: ${stderr.trim()}`);
  }
  if (!stdout.trim()) {
    throw new Error('codex CLI returned no output.');
  }
  return { text: stdout };
}

async function runCursor(request: ProviderRequest): Promise<ProviderResult> {
  // --trust skips the workspace-trust prompt that would hang a headless run
  // in the empty working directory. The Cursor CLI has no per-invocation
  // option to disable MCP servers or rules; the empty directory at least
  // keeps project-level configuration out.
  const args = ['-p', '--output-format', 'text', '--trust'];
  if (request.model) {
    args.push('--model', request.model);
  }
  // The Cursor CLI ignores piped stdin when a prompt argument is present,
  // so the whole prompt goes through stdin, as with the codex provider.
  const prompt = `${request.system}\n\n${request.user}`;

  // The Cursor CLI originally installed a "cursor-agent" binary and later
  // renamed it to "agent"; accept either.
  let result;
  try {
    result = await runCommand('cursor-agent', args, prompt);
  } catch (error) {
    if (!(error instanceof CliNotFoundError)) {
      throw error;
    }
    try {
      result = await runCommand('agent', args, prompt);
    } catch (fallbackError) {
      if (fallbackError instanceof CliNotFoundError) {
        throw new CliNotFoundError(
          'Could not find the Cursor CLI ("cursor-agent" or "agent") on PATH. Is it installed?'
        );
      }
      throw fallbackError;
    }
  }

  const { stdout, stderr, code } = result;
  if (code !== 0) {
    throw new Error(`cursor CLI exited with code ${code}: ${stderr.trim()}`);
  }
  if (!stdout.trim()) {
    throw new Error('cursor CLI returned no output.');
  }
  return { text: stdout };
}

export async function runProvider(
  provider: AiProvider,
  request: ProviderRequest
): Promise<ProviderResult> {
  switch (provider) {
    case 'claude':
      return runClaude(request);
    case 'codex':
      return runCodex(request);
    case 'cursor':
      return runCursor(request);
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

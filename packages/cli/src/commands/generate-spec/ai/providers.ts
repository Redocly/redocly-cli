import { spawn } from 'node:child_process';

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

function runCommand(
  command: string,
  args: string[],
  stdin: string
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
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
  // The prompt is a pure text transform: disabling built-in tools and MCP
  // servers keeps each invocation a single-shot completion without the
  // startup cost of the user's MCP configuration.
  const args = [
    '-p',
    '--output-format',
    'text',
    '--tools',
    '',
    '--strict-mcp-config',
    '--append-system-prompt',
    request.system,
  ];
  if (request.model) {
    args.push('--model', request.model);
  }
  const { stdout, stderr, code } = await runCommand('claude', args, request.user);
  if (code !== 0) {
    throw new Error(`claude CLI exited with code ${code}: ${stderr.trim()}`);
  }
  if (!stdout.trim()) {
    throw new Error('claude CLI returned no output.');
  }
  return { text: stdout };
}

async function runCodex(request: ProviderRequest): Promise<ProviderResult> {
  const args = ['exec'];
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
  const args = ['-p', '--output-format', 'text'];
  if (request.model) {
    args.push('--model', request.model);
  }
  // The instructions go in as the prompt argument; the piped stdin is
  // attached as context, mirroring how the claude provider splits the two.
  args.push(request.system);

  // The Cursor CLI originally installed a "cursor-agent" binary and later
  // renamed it to "agent"; accept either.
  let result;
  try {
    result = await runCommand('cursor-agent', args, request.user);
  } catch (error) {
    if (!(error instanceof CliNotFoundError)) {
      throw error;
    }
    try {
      result = await runCommand('agent', args, request.user);
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

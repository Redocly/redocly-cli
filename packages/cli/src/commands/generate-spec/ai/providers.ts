import { spawn } from 'node:child_process';

export type AiProvider = 'openai' | 'claude' | 'codex';

export const AI_RESPONSE_TIMEOUT_MS = 300_000;

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
        reject(new Error(`Could not find the "${command}" CLI on PATH. Is it installed?`));
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

interface OpenAiChatResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

async function runOpenAi(request: ProviderRequest): Promise<ProviderResult> {
  const endpoint = process.env.OPENAI_ENDPOINT;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!endpoint) {
    throw new Error('Set OPENAI_ENDPOINT to the base URL of an OpenAI-compatible API.');
  }
  if (!apiKey) {
    throw new Error('Set OPENAI_API_KEY with a token for the configured OpenAI-compatible API.');
  }

  const model = request.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o';
  const url = `${endpoint.replace(/\/+$/, '')}/chat/completions`;

  let response: Response;
  let raw: string;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.user },
        ],
        temperature: 0,
      }),
      signal: AbortSignal.timeout(AI_RESPONSE_TIMEOUT_MS),
    });
    raw = await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new Error(
        `The OpenAI-compatible endpoint did not respond within ${
          AI_RESPONSE_TIMEOUT_MS / 1000
        } seconds.`
      );
    }
    throw error;
  }

  let payload: OpenAiChatResponse | undefined;
  try {
    payload = JSON.parse(raw) as OpenAiChatResponse;
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    throw new Error(
      `OpenAI-compatible endpoint returned ${response.status}: ${
        payload?.error?.message ?? (raw ? raw.slice(0, 200) : response.statusText)
      }`
    );
  }

  const text = payload?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('OpenAI-compatible endpoint returned an empty or non-JSON completion.');
  }
  return { text };
}

async function runClaude(request: ProviderRequest): Promise<ProviderResult> {
  const args = ['-p', '--output-format', 'text', '--append-system-prompt', request.system];
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

export async function runProvider(
  provider: AiProvider,
  request: ProviderRequest
): Promise<ProviderResult> {
  switch (provider) {
    case 'openai':
      return runOpenAi(request);
    case 'claude':
      return runClaude(request);
    case 'codex':
      return runCodex(request);
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

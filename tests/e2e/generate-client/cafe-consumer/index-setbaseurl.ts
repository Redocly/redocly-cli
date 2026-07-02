import { listMenuItems, setServerUrl } from './api.js';

type StepResult = { kind: 'ok'; name: string } | { kind: 'err'; name: string; error: string };

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    process.stderr.write(`${name} env var required for the setServerUrl mid-flight test\n`);
    process.exit(1);
  }
  return value;
}

const liveBase = requireEnv('CAFE_BASE');

// Port 1 is reserved/unassigned — any connect attempt fails fast (ECONNREFUSED / ENOTFOUND).
// We use it as the "obviously unreachable" base to prove BASE actually moved.
const UNREACHABLE = 'http://127.0.0.1:1';

async function step(name: string, run: () => Promise<unknown>): Promise<StepResult> {
  try {
    await run();
    return { kind: 'ok', name };
  } catch (error) {
    return {
      kind: 'err',
      name,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    };
  }
}

async function main(): Promise<void> {
  const results: StepResult[] = [];

  // 1) Baseline: the file was generated with --server-url ${CAFE_BASE}, so the first
  //    call should succeed against the mock server.
  results.push(await step('initial-call-against-mock', () => listMenuItems({ limit: 1 })));

  // 2) Flip BASE to an unreachable host. The same operation should now fail to connect.
  //    This is the proof that setServerUrl() actually mutated the module-scoped binding.
  setServerUrl(UNREACHABLE);
  results.push(
    await step('call-after-setServerUrl-to-unreachable', () => listMenuItems({ limit: 1 }))
  );

  // 3) Flip BASE back to the live mock and confirm the binding restored cleanly.
  setServerUrl(liveBase);
  results.push(await step('call-after-setServerUrl-restored', () => listMenuItems({ limit: 1 })));

  process.stdout.write(JSON.stringify(results, null, 2) + '\n');
}

main().catch((error) => {
  process.stderr.write(`UNHANDLED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});

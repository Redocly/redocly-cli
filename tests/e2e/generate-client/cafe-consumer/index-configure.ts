import { configure, listMenuItems } from './api.js';

type StepResult = { kind: 'ok'; name: string } | { kind: 'err'; name: string; error: string };

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    process.stderr.write(
      `${name} env var required for the configure({ serverUrl }) mid-flight test\n`
    );
    process.exit(1);
  }
  return value;
}

const liveBase = requireEnv('CAFE_BASE');

// Port 1 is reserved/unassigned — any connect attempt fails fast (ECONNREFUSED / ENOTFOUND).
// We use it as the "obviously unreachable" base to prove serverUrl actually moved.
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

  // 2) Flip serverUrl to an unreachable host. The same operation should now fail to
  //    connect. This is the proof that configure() actually mutated the instance config.
  configure({ serverUrl: UNREACHABLE });
  results.push(
    await step('call-after-configure-to-unreachable', () => listMenuItems({ limit: 1 }))
  );

  // 3) Flip serverUrl back to the live mock and confirm the config restored cleanly.
  configure({ serverUrl: liveBase });
  results.push(await step('call-after-configure-restored', () => listMenuItems({ limit: 1 })));

  process.stdout.write(JSON.stringify(results, null, 2) + '\n');
}

main().catch((error) => {
  process.stderr.write(`UNHANDLED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});

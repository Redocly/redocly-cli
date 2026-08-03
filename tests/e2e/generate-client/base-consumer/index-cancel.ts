import { getSlowPet } from './api.js';

async function main(): Promise<void> {
  const controller = new AbortController();
  const promise = getSlowPet(1, { signal: controller.signal });
  setTimeout(() => controller.abort(), 100);
  try {
    await promise;
    process.stdout.write('NOT_CANCELLED\n');
  } catch (error) {
    if (error instanceof Error) {
      process.stdout.write(`CANCELLED:${error.name}\n`);
      return;
    }
    process.stdout.write(`CANCELLED:UNKNOWN\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`UNHANDLED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});

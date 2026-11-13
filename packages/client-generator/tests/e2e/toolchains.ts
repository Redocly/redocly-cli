// The `globalSetup` of the Go, PHP, and Python projects in vitest.config.ts. Each project lists
// the tools it needs under `provide.requiredTools`. Vitest calls `setup` once, before any test
// file of that project, and a missing tool stops the run with one message that names it.
import { spawnSync } from 'node:child_process';
import type { TestProject } from 'vitest/node';

type Tool = {
  name: string;
  command: string;
  args: string[];
};

declare module 'vitest' {
  export interface ProvidedContext {
    requiredTools: Tool[];
  }
}

export function setup(project: TestProject): void {
  const missing: string[] = [];
  for (const tool of project.getProvidedContext().requiredTools) {
    const result = spawnSync(tool.command, tool.args, { input: '', encoding: 'utf-8' });
    if (result.error !== undefined || result.status !== 0) {
      missing.push(tool.name);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `The ${project.name} project needs ${missing.join(', ')}. ` +
        'Install the missing tools as the "Client generator tests" section of CONTRIBUTING.md describes, ' +
        'or run another project, for example `npx vitest run --project client-generators`.'
    );
  }
}

import { spawnSync } from 'node:child_process';

export type Tool = {
  name: string;
  command: string;
  args: string[];
};

export function requireTools(project: string, tools: Tool[]): void {
  const missing: string[] = [];
  for (const tool of tools) {
    const result = spawnSync(tool.command, tool.args, { input: '', encoding: 'utf-8' });
    if (result.error !== undefined || result.status !== 0) {
      missing.push(tool.name);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `The ${project} project needs ${missing.join(', ')}. ` +
        'Install the missing tools as the "Client generator tests" section of CONTRIBUTING.md describes, ' +
        'or run another project, for example `npx vitest run --project client-generators`.'
    );
  }
}

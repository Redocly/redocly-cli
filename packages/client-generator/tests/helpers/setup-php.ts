import { requireTools } from './toolchains.js';

export function setup(): void {
  requireTools('client-generators-php', [
    { name: 'PHP', command: 'php', args: ['--version'] },
    // The generated client sends requests with curl.
    {
      name: 'the PHP curl extension',
      command: 'php',
      args: ['-r', 'exit(extension_loaded("curl") ? 0 : 1);'],
    },
  ]);
}

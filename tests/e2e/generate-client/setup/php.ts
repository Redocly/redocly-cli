import { requireTools } from '../toolchains.js';

export default function setup(): void {
  requireTools('client-generators-php', [{ name: 'PHP', command: 'php', args: ['--version'] }]);
}

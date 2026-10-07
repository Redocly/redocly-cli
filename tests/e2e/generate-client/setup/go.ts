import { requireTools } from '../toolchains.js';

export default function setup(): void {
  requireTools('client-generators-go', [
    { name: 'Go', command: 'go', args: ['version'] },
    { name: 'gofmt', command: 'gofmt', args: ['-l'] },
  ]);
}

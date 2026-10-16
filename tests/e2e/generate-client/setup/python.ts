import { requireTools } from '../toolchains.js';

export default function setup(): void {
  requireTools('client-generators-python', [
    { name: 'Python 3', command: 'python3', args: ['--version'] },
    { name: 'the httpx Python package', command: 'python3', args: ['-c', 'import httpx'] },
    { name: 'the pydantic Python package', command: 'python3', args: ['-c', 'import pydantic'] },
  ]);
}

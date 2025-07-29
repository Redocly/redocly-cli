import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesPath = join(__dirname, 'apis');

export const getFixturePath = (fileName: string): string => join(fixturesPath, fileName);

export function cleanColors(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/\x1b\[\d+m/g, '');
}

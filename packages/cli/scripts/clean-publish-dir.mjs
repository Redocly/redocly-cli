import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, '..');
const publishDir = path.join(packageDir, '.publish');

rmSync(publishDir, { recursive: true, force: true });

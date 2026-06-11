import { readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf-8'));
const publishDir = path.join(packageDir, pkg.publishConfig.directory);

rmSync(publishDir, { recursive: true, force: true });

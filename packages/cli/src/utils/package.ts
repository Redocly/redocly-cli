import { createRequire } from 'node:module';

const packageJson = createRequire(import.meta.url ?? __dirname)('../../package.json');

export const { version, name, engines } = packageJson;

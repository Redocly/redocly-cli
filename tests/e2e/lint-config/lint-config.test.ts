import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

describe('lint-config', () => {
  const lintOptions: { dirName: string; option: string | null; format?: string }[] = [
    { dirName: 'invalid-config--lint-config-off', option: 'off' },
    { dirName: 'invalid-config--lint-config-warn', option: 'warn' },
    { dirName: 'invalid-config--lint-config-error', option: 'error' },
    { dirName: 'invalid-lint-config-severity', option: 'something' },
    { dirName: 'invalid-config--no-option', option: null },
    { dirName: 'invalid-config-assertation-name', option: 'warn' },
    { dirName: 'invalid-config-assertation-config-type', option: 'warn' },
    { dirName: 'invalid-config-format-json', option: 'warn', format: 'json' },
    { dirName: 'config-with-refs', option: 'warn' },
    { dirName: 'config-with-refs-extended', option: 'error' },
    { dirName: 'config-structure', option: 'error' },
  ];

  const validOpenapiFile = join(__dirname, '__fixtures__/valid-openapi.yaml');
  const invalidOpenapiFile = join(__dirname, '__fixtures__/invalid-openapi.yaml');

  test.each(lintOptions)('test with option: %s', async (lintOptions) => {
    const { dirName, option, format } = lintOptions;
    const testPath = join(__dirname, `${dirName}`);
    const relativeValidOpenapiFile = relative(testPath, validOpenapiFile);
    const args = [
      relativeValidOpenapiFile,
      ...([option && `--lint-config=${option}`, format && `--format=${format}`].filter(
        Boolean
      ) as string[]),
    ];

    const passedArgs = getParams(indexEntryPoint, ['lint', ...args]);

    const result = getCommandOutput(passedArgs, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  const configSeverityOptions: { dirName: string; option: string | null; snapshot: string }[] = [
    {
      dirName: 'invalid-definition-and-config',
      option: 'error',
      snapshot: 'config-with-error.snapshot.txt',
    },
    {
      dirName: 'invalid-definition-and-config',
      option: 'warn',
      snapshot: 'config-with-warn.snapshot.txt',
    },
  ];

  test.each(configSeverityOptions)('invalid-definition-and-config: %s', async (severityOption) => {
    const { dirName, option, snapshot } = severityOption;
    const testPath = join(__dirname, `${dirName}`);
    const relativeInvalidOpenapiFile = relative(testPath, invalidOpenapiFile);
    const args = [relativeInvalidOpenapiFile, `--lint-config=${option}`];
    const passedArgs = getParams(indexEntryPoint, ['lint', ...args]);

    const result = getCommandOutput(passedArgs, { testPath });

    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, snapshot));
  });
});

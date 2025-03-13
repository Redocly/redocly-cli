import { ConfigFixture } from '../../__tests__/fixtures/config';

export const getFallbackApisOrExit = vi.fn((entrypoints) =>
  entrypoints.map((path: string) => ({ path }))
);
export const dumpBundle = vi.fn(() => '');
export const slash = vi.fn();
export const pluralize = vi.fn();
export const getExecutionTime = vi.fn();
export const printExecutionTime = vi.fn();
export const printUnusedWarnings = vi.fn();
export const printLintTotals = vi.fn();
export const getOutputFileName = vi.fn(() => ({ outputFile: 'test.yaml', ext: 'yaml' }));
export const handleError = vi.fn();
export const exitWithError = vi.fn();
export const writeYaml = vi.fn();
export const loadConfigAndHandleErrors = vi.fn(() => ConfigFixture);
export const checkIfRulesetExist = vi.fn();
export const sortTopLevelKeysForOas = vi.fn((document) => document);
export const getAndValidateFileExtension = vi.fn((fileName: string) => fileName.split('.').pop());
export const writeToFileByExtension = vi.fn();
export const checkForDeprecatedOptions = vi.fn();
export const saveBundle = vi.fn();
export const formatPath = vi.fn((path: string) => path);

import type { BundleOutputFormat, OutputFormat, Region, Config } from '@redocly/openapi-core';

export type Totals = {
  errors: number;
  warnings: number;
  ignored: number;
};
export type Entrypoint = {
  path: string;
  alias?: string;
};
export const outputExtensions = ['json', 'yaml', 'yml'] as ReadonlyArray<BundleOutputFormat>;
export type OutputExtensions = 'json' | 'yaml' | 'yml' | undefined;
export const regionChoices = ['us', 'eu'] as ReadonlyArray<Region>;
export type CommonOptions = {
  apis: string[];
  'max-problems'?: number;
  extends?: string[];
  config?: string;
  format: OutputFormat;
};
export type Skips = {
  'skip-rule'?: string[];
  'skip-decorator'?: string[];
  'skip-preprocessor'?: string[];
};

export type ConfigApis = Pick<Config, 'apis' | 'configFile'>;

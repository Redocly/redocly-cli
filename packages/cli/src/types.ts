import { BundleOutputFormat, Region } from '@redocly/openapi-core';
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

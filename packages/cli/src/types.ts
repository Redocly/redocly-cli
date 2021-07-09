import { BundleOutputFormat } from '@redocly/openapi-core';

export type Totals = {
	errors: number;
	warnings: number;
	ignored: number;
}

export const outputExtensions = ['json', 'yaml', 'yml'] as ReadonlyArray<BundleOutputFormat>;
export type OutputExtensions = 'json' | 'yaml' | 'yml' | undefined;

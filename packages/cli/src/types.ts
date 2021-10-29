import { BundleOutputFormat } from '@redocly/openapi-core';
import { Region } from '@redocly/openapi-core/lib/config/config';

export type Totals = {
	errors: number;
	warnings: number;
	ignored: number;
}

export const outputExtensions = ['json', 'yaml', 'yml'] as ReadonlyArray<BundleOutputFormat>;
export type OutputExtensions = 'json' | 'yaml' | 'yml' | undefined;
export const regionChoices = ['us', 'eu'] as ReadonlyArray<Region>;


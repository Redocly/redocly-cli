import { BundleOutputFormat } from '@redocly/openapi-core';

export type Totals = {
	errors: number;
	warnings: number;
	ignored: number;
}

export const outputExtensions = ['json', 'yaml', 'yml'] as ReadonlyArray<BundleOutputFormat>;
export type OutputExtensions = 'json' | 'yaml' | 'yml' | undefined;

export type Region = 'us' | 'eu';
export const regionChoices = ['us', 'eu'] as ReadonlyArray<Region>;
export const REGION_DOMAINS: {[region in Region]: string} = {
  us: 'redoc.ly',
  eu: 'eu.redocly.com',
};

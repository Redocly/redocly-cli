import { Oas3Tag } from '@redocly/openapi-core';

export type Totals = {
	errors: number;
	warnings: number;
	ignored: number;
}

export type Properties = {
  entrypoint: string,
  entrypointFilename: string,
  tags: Oas3Tag[],
  potentialConflicts: any,
  tagsPrefix: string,
  componentsPrefix: string | undefined
}

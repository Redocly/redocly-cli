import { isPlainObject } from '@redocly/openapi-core';

import { branchPath, MAX_DEPTH, VARIANT_KEYWORDS, type Schema } from './schema.js';

export interface Site {
  owner: string;
  path: string;
  keyword: string;
  count: number;
}

/**
 * Identifies one union site. `owner` resets at every `$ref`, so a site belongs
 * to the nearest named schema and stays stable as the description is edited.
 */
export function siteKey(owner: string, path: string, keyword: string): string {
  return `${owner}${path ? `.${path}` : ''}#${keyword}`;
}


/**
 * Every union site inside one named schema. Stops at `$ref` because the target
 * is enumerated under its own name.
 */
export function collectSites(
  schema: Schema | undefined,
  owner: string,
  path = '',
  sites = new Map<string, Site>(),
  depth = 0
): Map<string, Site> {
  if (!schema || depth > MAX_DEPTH || typeof schema.$ref === 'string') return sites;

  for (const keyword of VARIANT_KEYWORDS) {
    const branches: Schema[] | undefined = schema[keyword];
    if (!branches?.length) continue;

    sites.set(siteKey(owner, path, keyword), { owner, path, keyword, count: branches.length });
    for (const [index, branch] of branches.entries()) {
      collectSites(branch, owner, branchPath(path, keyword, index), sites, depth + 1);
    }
  }

  for (const branch of schema.allOf ?? []) collectSites(branch, owner, path, sites, depth + 1);

  for (const [property, sub] of Object.entries(schema.properties ?? {}) as [string, Schema][]) {
    collectSites(sub, owner, path ? `${path}.${property}` : property, sites, depth + 1);
  }

  collectSites(schema.items, owner, path, sites, depth + 1);

  if (isPlainObject(schema.additionalProperties)) {
    collectSites(schema.additionalProperties, owner, path, sites, depth + 1);
  }

  return sites;
}

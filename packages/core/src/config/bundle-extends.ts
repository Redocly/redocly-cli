import path from 'node:path';

import { isAbsoluteUrl } from '../ref-utils.js';
import { isTruthy } from '../utils/is-truthy.js';
import type { UserContext } from '../walk.js';
import { resolvePreset } from './config-resolvers.js';
import type { Plugin, RawGovernanceConfig } from './types.js';
import { mergeExtends } from './utils.js';

export function bundleExtends({
  node,
  ctx,
  plugins,
}: {
  node: RawGovernanceConfig;
  ctx: UserContext;
  plugins: Plugin[];
}): RawGovernanceConfig {
  if (!node.extends) {
    return node;
  }

  const invalidEntries = node.extends
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => typeof item !== 'string');

  if (invalidEntries.length > 0) {
    const positions = invalidEntries.map(({ index }) => index).join(', ');
    throw new Error(
      `Found ${invalidEntries.length} unresolvable "extends" entr${invalidEntries.length === 1 ? 'y' : 'ies'} ` +
        `at position(s) [${positions}]. Each "extends" entry must be a resolvable preset name, file path, or URL.`
    );
  }

  const resolvedExtends = (node.extends || [])
    .map((presetItem: string) => {
      if (!isAbsoluteUrl(presetItem) && !path.extname(presetItem)) {
        return resolvePreset(presetItem, plugins);
      }

      const resolvedRef = ctx.resolve({ $ref: presetItem });
      if (resolvedRef.location && resolvedRef.node !== undefined) {
        return resolvedRef.node as RawGovernanceConfig;
      }
      return null;
    })
    .filter(isTruthy);

  return mergeExtends([
    ...resolvedExtends.map((nested) => bundleExtends({ node: nested, ctx, plugins })),
    { ...node, extends: undefined },
  ]);
}

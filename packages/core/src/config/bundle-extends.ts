import path from 'node:path';
import { isAbsoluteUrl } from '../ref-utils.js';
import { resolvePreset } from './config-resolvers.js';
import { mergeExtends } from './utils.js';
import { isTruthy } from '../utils.js';

import type { UserContext } from '../walk.js';
import type { Plugin, RawGovernanceConfig } from './types.js';

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

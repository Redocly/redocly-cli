import path from 'node:path';

import { isBrowser } from '../env.js';
import { isAbsoluteUrl } from '../ref-utils.js';
import { isTruthy } from '../utils/is-truthy.js';
import { type UserContext } from '../walk.js';
import { resolvePreset } from './config-resolvers.js';
import { skipUnloadedPluginReferences } from './skip-unloaded-plugins.js';
import { type Plugin, type RawGovernanceConfig } from './types.js';
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

  const resolvedExtends = (node.extends || [])
    .filter(isTruthy)
    .map((presetItem: string) => {
      if (!isAbsoluteUrl(presetItem) && !path.extname(presetItem)) {
        return resolvePreset(presetItem, plugins);
      }

      const resolvedRef = ctx.resolve({ $ref: presetItem });
      if (resolvedRef.location && resolvedRef.node !== undefined) {
        const resolvedConfig = resolvedRef.node as RawGovernanceConfig;
        return isBrowser ? skipUnloadedPluginReferences(resolvedConfig, plugins) : resolvedConfig;
      }
      return null;
    })
    .filter(isTruthy);

  return mergeExtends([
    ...resolvedExtends.map((nested) => bundleExtends({ node: nested, ctx, plugins })),
    { ...node, extends: undefined },
  ]);
}

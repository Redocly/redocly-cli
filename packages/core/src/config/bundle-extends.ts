import path from 'node:path';

import { isAbsoluteUrl } from '../ref-utils.js';
import { isTruthy } from '../utils/is-truthy.js';
import { type UserContext } from '../walk.js';
import { resolvePreset } from './config-resolvers.js';
import { isRecheckPreset, RECHECK_PLUGIN_ID } from './recheck.js';
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

  const hasRecheckPlugin = plugins.some((plugin) => plugin.id === RECHECK_PLUGIN_ID);
  const resolvedExtends = (node.extends || [])
    .filter(isTruthy)
    .map((presetItem: string) => {
      if (!isAbsoluteUrl(presetItem) && !path.extname(presetItem)) {
        // The caller passes the Recheck presets as a plugin. Without it they are skipped,
        // so a config that uses Recheck still loads everywhere else.
        if (isRecheckPreset(presetItem) && !hasRecheckPlugin) return null;
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

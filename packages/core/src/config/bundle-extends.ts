import path from 'node:path';

import { isAbsoluteUrl } from '../ref-utils.js';
import { isTruthy } from '../utils/is-truthy.js';
import { type UserContext } from '../walk.js';
import { resolvePreset } from './config-resolvers.js';
import { isRecheckPreset } from './recheck.js';
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

  const recheckExtends: string[] = [];
  const bundledExtends: RawGovernanceConfig[] = [];
  for (const presetItem of (node.extends || []).filter(isTruthy)) {
    if (!isAbsoluteUrl(presetItem) && !path.extname(presetItem) && isRecheckPreset(presetItem)) {
      recheckExtends.push(presetItem);
      continue;
    }
    const resolved = resolveExtendsEntry(presetItem, ctx, plugins);
    if (!resolved) continue;
    const bundled = bundleExtends({ node: resolved, ctx, plugins });
    bundledExtends.push(bundled);
    recheckExtends.push(...(bundled.recheckExtends ?? []));
  }
  const merged = mergeExtends([...bundledExtends, { ...node, extends: undefined }]);
  const ordered = [...new Set([...recheckExtends, ...(node.recheckExtends ?? [])])];
  return ordered.length > 0 ? { ...merged, recheckExtends: ordered } : merged;
}

function resolveExtendsEntry(
  presetItem: string,
  ctx: UserContext,
  plugins: Plugin[]
): RawGovernanceConfig | null {
  if (!isAbsoluteUrl(presetItem) && !path.extname(presetItem)) {
    return resolvePreset(presetItem, plugins);
  }

  const resolvedRef = ctx.resolve({ $ref: presetItem });
  if (resolvedRef.location && resolvedRef.node !== undefined) {
    return resolvedRef.node as RawGovernanceConfig;
  }
  return null;
}

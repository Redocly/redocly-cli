import path from 'node:path';
import { isAbsoluteUrl } from '../ref-utils.js';
import { resolvePreset } from './config-resolvers.js';
import { mergeExtends } from './utils.js';
import { isTruthy } from '../utils/is-truthy.js';

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

  const extendsArray = node.extends || [];

  const resolvedExtends = extendsArray
    .map((presetItem) => {
      if (
        presetItem === undefined ||
        presetItem === null ||
        typeof presetItem !== 'string' ||
        !presetItem.trim()
      ) {
        return undefined;
      }

      // Named presets: merge their configs if they exist; ignore errors here.
      if (!isAbsoluteUrl(presetItem) && !path.extname(presetItem)) {
        try {
          return resolvePreset(presetItem, plugins) as RawGovernanceConfig | null;
        } catch {
          // Invalid preset names are reported during lintConfig; bundling stays best-effort.
          return undefined;
        }
      }

      const resolvedRef = ctx.resolve({ $ref: presetItem });

      if (resolvedRef.location && resolvedRef.node !== undefined) {
        return resolvedRef.node as RawGovernanceConfig;
      }

      return undefined;
    })
    .filter(isTruthy);

  return mergeExtends([
    ...resolvedExtends.map((nested) => bundleExtends({ node: nested, ctx, plugins })),
    { ...node, extends: undefined },
  ]);
}

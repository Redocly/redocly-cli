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

  const resolvedExtends = (node.extends || [])
    .map((presetItem, index) => {
      const configPath =
        (ctx.location?.source?.absoluteRef &&
          path.relative(process.cwd(), ctx.location.source.absoluteRef)) ||
        ctx.location?.source?.absoluteRef ||
        'redocly.yaml';

      if (presetItem === undefined) {
        ctx.report({
          message: `Could not resolve "extends" entry at index ${index} in ${configPath}. It may refer to a non-existent or invalid rules file.`,
          location: [ctx.location],
        });
        return undefined;
      }

      if (typeof presetItem !== 'string' || !presetItem.trim()) {
        ctx.report({
          message: `Invalid "extends" entry at index ${index} in ${configPath}. Expected a non-empty string (ruleset name, path, or URL), but got ${JSON.stringify(
            presetItem
          )}.`,
          location: [ctx.location],
        });
        return undefined;
      }

      if (!isAbsoluteUrl(presetItem) && !path.extname(presetItem)) {
        return resolvePreset(presetItem, plugins);
      }

      const resolvedRef = ctx.resolve({ $ref: presetItem });

      if (resolvedRef.location && resolvedRef.node !== undefined) {
        return resolvedRef.node as RawGovernanceConfig;
      }

      ctx.report({
        message: `Could not resolve "extends" entry "${presetItem}" in ${configPath}. Make sure the path, URL, or ruleset name is correct.`,
        location: [ctx.location],
      });
      return undefined;
    })
    .filter(isTruthy);

  return mergeExtends([
    ...resolvedExtends.map((nested) => bundleExtends({ node: nested, ctx, plugins })),
    { ...node, extends: undefined },
  ]);
}

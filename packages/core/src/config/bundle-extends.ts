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
  for (let index = 0; index < extendsArray.length; index++) {
    const item = extendsArray[index];
    if (item !== undefined && item !== null && typeof item !== 'string') {
      ctx.report({
        message: `Invalid "extends" entry: expected a string (ruleset name, path, or URL), but got ${JSON.stringify(
          item
        )}.`,
        location: ctx.location.child(['extends', index]),
        forceSeverity: 'error',
      });
    }
  }

  const resolvedExtends = extendsArray
    .map((presetItem, index) => {
      if (
        presetItem === undefined ||
        presetItem === null ||
        typeof presetItem !== 'string' ||
        !presetItem.trim()
      ) {
        return undefined;
      }

      if (!isAbsoluteUrl(presetItem) && !path.extname(presetItem)) {
        return resolvePreset(presetItem, plugins, ctx, ctx.location.child(['extends', index]));
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

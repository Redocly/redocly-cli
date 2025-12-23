import path from 'node:path';
import { isAbsoluteUrl } from '../../ref-utils.js';
import { resolvePreset } from '../../config/config-resolvers.js';
import { NoUnresolvedRefs, reportUnresolvedRef } from '../common/no-unresolved-refs.js';
import { isPlainObject } from '../../utils/is-plain-object.js';

import type { UserContext } from '../../walk.js';

export function ConfigNoUnresolvedRefs() {
  const base = NoUnresolvedRefs({});

  function validateConfigExtends(node: unknown, ctx: UserContext) {
    if (!isPlainObject(node)) return;
    const exts = (node as any).extends;
    if (!Array.isArray(exts)) return;

    exts.forEach((item, index) => {
      if (typeof item !== 'string' || !item.trim()) return;

      // Named presets (no extension, not a URL): validate that the preset exists.
      if (!isAbsoluteUrl(item) && !path.extname(item)) {
        const plugins = ctx.config?.plugins ?? [];
        // This will report a problem via ctx.report if the preset is invalid,
        // without throwing (because we pass ctx + location).
        resolvePreset(item, plugins as any, ctx, ctx.location.child(['extends', index]));
        return;
      }

      const resolved = ctx.resolve({ $ref: item });
      if (resolved.node !== undefined && resolved.location) return;

      reportUnresolvedRef(resolved as any, ctx.report, ctx.location.child(['extends', index]));
    });
  }

  return {
    ...base,
    ConfigGovernance(node: unknown, ctx: UserContext) {
      validateConfigExtends(node, ctx);
    },
    ConfigApisProperties(node: unknown, ctx: UserContext) {
      validateConfigExtends(node, ctx);
    },
    'rootRedoclyConfigSchema.scorecard.levels_items'(node: unknown, ctx: UserContext) {
      validateConfigExtends(node, ctx);
    },
  } as any;
}

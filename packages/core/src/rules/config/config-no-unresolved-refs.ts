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
      const itemLocation = ctx.location.child(['extends', index]);

      // Report validation errors for non-string entries
      if (typeof item !== 'string') {
        if (item !== undefined && item !== null) {
          ctx.report({
            message: `Invalid "extends" entry: expected string but got ${typeof item}`,
            location: itemLocation,
          });
        }
        return;
      }

      if (!item.trim()) return;

      // Named presets (no extension, not a URL): validate that the preset exists.
      if (!isAbsoluteUrl(item) && !path.extname(item)) {
        const plugins = ctx.config?.plugins ?? [];
        // This will report a problem via ctx.report if the preset is invalid,
        // without throwing (because we pass ctx + location).
        resolvePreset(item, plugins as any, ctx, itemLocation);
        return;
      }

      // File/URL references: validate they can be resolved
      const resolved = ctx.resolve({ $ref: item });
      if (resolved.node !== undefined && resolved.location) return;

      reportUnresolvedRef(resolved as any, ctx.report, itemLocation);
    });
  }

  // Check if the current location is inside an extends array
  function isInsideExtends(location: { pointer: string }): boolean {
    return location.pointer.includes('/extends/');
  }

  return {
    ...base,
    ref: {
      leave(_: any, ctx: any, resolved: any) {
        // Skip validation for refs inside extends arrays - those are handled by validateConfigExtends
        if (isInsideExtends(ctx.location)) return;

        if (resolved.node !== undefined) return;
        reportUnresolvedRef(resolved, ctx.report, ctx.location);
      },
    },
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

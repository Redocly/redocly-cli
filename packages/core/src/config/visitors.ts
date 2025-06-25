import path from 'node:path';
import { NormalizedConfigTypes } from '../types/redocly-yaml.js';
import { normalizeVisitors } from '../visitors.js';
import { replaceRef } from '../ref-utils.js';
import { bundleExtends } from './bundle-extends.js';

import type { OasRef } from '../typings/openapi.js';
import type { Plugin } from './types.js';
import type { ResolveResult, UserContext } from '../walk.js';

export function makePluginsCollectorVisitor() {
  const plugins: (string | Plugin)[] = [];

  function handleNode(node: any, ctx: UserContext) {
    if (Array.isArray(node.plugins)) {
      plugins.push(
        ...node.plugins.map((p: string) =>
          typeof p === 'string' ? path.resolve(path.dirname(ctx.location.source.absoluteRef), p) : p
        )
      );
      delete node.plugins;
    }
  }

  return normalizeVisitors(
    [
      {
        severity: 'error',
        ruleId: 'configBundler',
        visitor: {
          ref: {},
          ConfigGovernance: {
            leave(node: any, ctx: UserContext) {
              handleNode(node, ctx);
            },
          },
          ConfigApisProperties: {
            leave(node: any, ctx: UserContext) {
              handleNode(node, ctx);
            },
          },
          'rootRedoclyConfigSchema.scorecard.levels_items': {
            leave(node: any, ctx: UserContext) {
              handleNode(node, ctx);
            },
          },
          ConfigRoot: {
            leave(node: any) {
              if ((Array.isArray(node.plugins) && node.plugins.length > 0) || plugins.length > 0) {
                node.plugins = [...(node.plugins || []), ...plugins];
              }
            },
          },
        },
      },
    ],
    NormalizedConfigTypes
  );
}

export function makeConfigBundlerVisitor(plugins: Plugin[]) {
  function handleNode(node: any, ctx: UserContext) {
    if (node.extends) {
      const bundled = bundleExtends({ node, ctx, plugins });
      Object.assign(node, bundled);
      delete node.extends;
    }
  }
  return normalizeVisitors(
    [
      {
        severity: 'error',
        ruleId: 'configBundler',
        visitor: {
          ref: {
            leave(node: OasRef, ctx: UserContext, resolved: ResolveResult<any>) {
              replaceRef(node, resolved, ctx);
            },
          },
          ConfigGovernance: {
            leave(node: any, ctx: UserContext) {
              handleNode(node, ctx);
            },
          },
          ConfigApisProperties: {
            leave(node: any, ctx: UserContext) {
              // ignore extends from root config if defined in the current node
              handleNode(node, ctx);
            },
          },
          'rootRedoclyConfigSchema.scorecard.levels_items': {
            leave(node: any, ctx: UserContext) {
              handleNode(node, ctx);
            },
          },
          ConfigRoot: {
            leave(node: any, ctx: UserContext) {
              handleNode(node, ctx);
            },
          },
        },
      },
    ],
    NormalizedConfigTypes
  );
}

import { NormalizedConfigTypes } from '../types/redocly-yaml.js';
import { normalizeVisitors } from '../visitors.js';
import { replaceRef } from '../ref-utils.js';
import { bundleExtends } from './bundle-extends.js';
import { preResolvePluginPath } from './config-resolvers.js';

import type { OasRef } from '../typings/openapi.js';
import type { Plugin } from './types.js';
import type { ResolveResult, UserContext } from '../walk.js';

export function makePluginsCollectorVisitor(plugins: (string | Plugin)[], rootConfigDir: string) {
  function handleNode(node: any, ctx: UserContext) {
    if (Array.isArray(node.plugins)) {
      plugins.push(
        ...node.plugins.map((p: string | Plugin) => {
          return preResolvePluginPath(
            p,
            ctx.location.source.absoluteRef.replace(/^file:\/\//, ''), // remove file URL prefix for OpenAPI language server
            rootConfigDir
          );
        })
      );
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

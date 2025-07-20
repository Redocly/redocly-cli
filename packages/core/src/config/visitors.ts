import { NormalizedConfigTypes } from '../types/redocly-yaml.js';
import { normalizeVisitors } from '../visitors.js';
import { replaceRef } from '../ref-utils.js';
import { bundleExtends } from './bundle-extends.js';
import { preResolvePluginPath } from './config-resolvers.js';

import type { OasRef } from '../typings/openapi.js';
import type { Plugin } from './types.js';
import type { ResolveResult, UserContext } from '../walk.js';

export type PluginsCollectorVisitorData = {
  plugins: (string | Plugin)[];
  rootConfigDir: string;
};

export const PLUGINS_COLLECTOR_VISITOR_ID = 'pluginsCollector';

function collectorHandleNode(node: any, ctx: UserContext) {
  if (Array.isArray(node.plugins)) {
    const { plugins, rootConfigDir } = ctx.getVisitorData() as PluginsCollectorVisitorData;
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

export const pluginsCollectorVisitor = normalizeVisitors(
  [
    {
      severity: 'error',
      ruleId: PLUGINS_COLLECTOR_VISITOR_ID,
      visitor: {
        ref: {},
        ConfigGovernance: {
          leave(node: any, ctx: UserContext) {
            collectorHandleNode(node, ctx);
          },
        },
        ConfigApisProperties: {
          leave(node: any, ctx: UserContext) {
            collectorHandleNode(node, ctx);
          },
        },
        'rootRedoclyConfigSchema.scorecard.levels_items': {
          leave(node: any, ctx: UserContext) {
            collectorHandleNode(node, ctx);
          },
        },
        ConfigRoot: {
          leave(node: any, ctx: UserContext) {
            collectorHandleNode(node, ctx);
          },
        },
      },
    },
  ],
  NormalizedConfigTypes
);

export type ConfigBundlerVisitorData = {
  plugins: Plugin[];
};

export const CONFIG_BUNDLER_VISITOR_ID = 'configBundler';

function bundlerHandleNode(node: any, ctx: UserContext) {
  if (node.extends && node.extends.length > 0) {
    const { plugins } = ctx.getVisitorData() as ConfigBundlerVisitorData;
    const bundled = bundleExtends({ node, ctx, plugins });
    Object.assign(node, bundled);
    delete node.extends;
  }
}

export const configBundlerVisitor = normalizeVisitors(
  [
    {
      severity: 'error',
      ruleId: CONFIG_BUNDLER_VISITOR_ID,
      visitor: {
        ref: {
          leave(node: OasRef, ctx: UserContext, resolved: ResolveResult<any>) {
            replaceRef(node, resolved, ctx);
          },
        },
        ConfigGovernance: {
          leave(node: any, ctx: UserContext) {
            bundlerHandleNode(node, ctx);
          },
        },
        ConfigApisProperties: {
          leave(node: any, ctx: UserContext) {
            // ignore extends from root config if defined in the current node
            bundlerHandleNode(node, ctx);
          },
        },
        'rootRedoclyConfigSchema.scorecard.levels_items': {
          leave(node: any, ctx: UserContext) {
            bundlerHandleNode(node, ctx);
          },
        },
        ConfigRoot: {
          leave(node: any, ctx: UserContext) {
            bundlerHandleNode(node, ctx);
          },
        },
      },
    },
  ],
  NormalizedConfigTypes
);

import { getNormalizedConfigTypes } from '../types/redocly-yaml.js';
import { normalizeVisitors } from '../visitors.js';
import { replaceRef } from '../ref-utils.js';
import { bundleExtends } from './bundle-extends.js';
import { preResolvePluginPath } from './config-resolvers.js';
import { isPlainObject } from '../utils.js';
import { CONFIG_BUNDLER_VISITOR_ID, PLUGINS_COLLECTOR_VISITOR_ID } from './constants.js';

import type { PluginResolveInfo } from './config-resolvers.js';
import type { OasRef } from '../typings/openapi.js';
import type { Plugin } from './types.js';
import type { ResolveResult, UserContext } from '../walk.js';

export type PluginsCollectorVisitorData = {
  plugins: (PluginResolveInfo | Plugin)[];
  rootConfigDir: string;
};

function collectorHandleNode(node: unknown, ctx: UserContext) {
  if (isPlainObject(node) && Array.isArray(node.plugins)) {
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

// Cache for visitors
let _pluginsCollectorVisitor: any = null;

export async function getPluginsCollectorVisitor() {
  if (!_pluginsCollectorVisitor) {
    const NormalizedConfigTypes = await getNormalizedConfigTypes();
    _pluginsCollectorVisitor = normalizeVisitors(
      [
        {
          severity: 'error',
          ruleId: PLUGINS_COLLECTOR_VISITOR_ID,
          visitor: {
            ref: {},
            ConfigGovernance: {
              leave(node: unknown, ctx: UserContext) {
                collectorHandleNode(node, ctx);
              },
            },
            ConfigApisProperties: {
              leave(node: unknown, ctx: UserContext) {
                collectorHandleNode(node, ctx);
              },
            },
            'rootRedoclyConfigSchema.scorecard.levels_items': {
              leave(node: unknown, ctx: UserContext) {
                collectorHandleNode(node, ctx);
              },
            },
            ConfigRoot: {
              leave(node: unknown, ctx: UserContext) {
                collectorHandleNode(node, ctx);
              },
            },
          } as any,
        },
      ],
      NormalizedConfigTypes
    );
  }
  return _pluginsCollectorVisitor;
}

export type ConfigBundlerVisitorData = {
  plugins: Plugin[];
};

function bundlerHandleNode(node: unknown, ctx: UserContext) {
  if (isPlainObject(node) && node.extends) {
    const { plugins } = ctx.getVisitorData() as ConfigBundlerVisitorData;
    const bundled = bundleExtends({ node, ctx, plugins });
    Object.assign(node, bundled);
    delete node.extends;
  }
}

let _configBundlerVisitor: any = null;

export async function getConfigBundlerVisitor() {
  if (!_configBundlerVisitor) {
    const NormalizedConfigTypes = await getNormalizedConfigTypes();
    _configBundlerVisitor = normalizeVisitors(
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
              leave(node: unknown, ctx: UserContext) {
                bundlerHandleNode(node, ctx);
              },
            },
            ConfigApisProperties: {
              leave(node: unknown, ctx: UserContext) {
                // ignore extends from root config if defined in the current node
                bundlerHandleNode(node, ctx);
              },
            },
            'rootRedoclyConfigSchema.scorecard.levels_items': {
              leave(node: unknown, ctx: UserContext) {
                bundlerHandleNode(node, ctx);
              },
            },
            ConfigRoot: {
              leave(node: unknown, ctx: UserContext) {
                bundlerHandleNode(node, ctx);
              },
            },
          } as any,
        },
      ],
      NormalizedConfigTypes
    );
  }
  return _configBundlerVisitor;
}

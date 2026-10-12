import { CONFIG_NODE_TYPE_NAMES } from '@redocly/config';
import * as path from 'node:path';

import { hasUriScheme, isAbsoluteUrl, replaceRef } from '../ref-utils.js';
import { isNamedType } from '../types/index.js';
import { NormalizedConfigTypes } from '../types/redocly-yaml.js';
import type { OasRef } from '../typings/openapi.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import { isString } from '../utils/is-string.js';
import { normalizeVisitors } from '../visitors.js';
import type { ResolveResult, UserContext } from '../walk.js';
import { bundleExtends } from './bundle-extends.js';
import { preResolvePluginPath, type PluginResolveInfo } from './config-resolvers.js';
import { CONFIG_BUNDLER_VISITOR_ID, PLUGINS_COLLECTOR_VISITOR_ID } from './constants.js';
import type { Plugin } from './types.js';

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

export const pluginsCollectorVisitor = normalizeVisitors(
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
        [CONFIG_NODE_TYPE_NAMES.ScorecardClassicLevel]: {
          leave(node: unknown, ctx: UserContext) {
            collectorHandleNode(node, ctx);
          },
        },
        ConfigRoot: {
          leave(node: unknown, ctx: UserContext) {
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
  skipPluginEval?: boolean;
  rootRef: string;
  rebasedNodes: WeakSet<object>;
};

function bundlerHandleNode(node: unknown, ctx: UserContext) {
  if (isPlainObject(node) && node.extends) {
    const { plugins, skipPluginEval } = ctx.getVisitorData() as ConfigBundlerVisitorData;
    if (skipPluginEval) {
      // `extends` may reference plugin presets, which are unknown when plugin code is not evaluated.
      return;
    }
    const bundled = bundleExtends({ node, ctx, plugins });
    Object.assign(node, bundled);
    delete node.extends;
  }
}

function rebasePath(value: string, sourceRef: string, rootRef: string) {
  if (hasUriScheme(value) || path.isAbsolute(value)) {
    return value;
  }
  if (isAbsoluteUrl(sourceRef)) {
    return new URL(value, sourceRef).href;
  }
  const resolved = path.resolve(path.dirname(sourceRef), value);
  return path.relative(path.dirname(rootRef), resolved) || '.';
}

// The CLI resolves every config path from the root config folder, so a path from a referenced file is rewritten relative to that folder.
function rebaseFilePaths(node: unknown, ctx: UserContext) {
  const { rootRef, rebasedNodes } = ctx.getVisitorData() as ConfigBundlerVisitorData;
  const sourceRef = ctx.location.source.absoluteRef;
  if (!isPlainObject(node) || sourceRef === rootRef || rebasedNodes.has(node)) {
    return;
  }
  // the walker visits a shared `$ref` target once per node type name, so rebase each node once
  rebasedNodes.add(node);
  const rebaseValue = (value: unknown) =>
    isString(value) && value ? rebasePath(value, sourceRef, rootRef) : value;
  for (const [field, schema] of Object.entries(ctx.type.properties)) {
    const value = node[field];
    if (value === undefined || !isPlainObject(schema) || isNamedType(schema)) {
      continue;
    }
    if ((schema.format ?? schema.items?.format) === 'uri-reference') {
      node[field] = Array.isArray(value) ? value.map(rebaseValue) : rebaseValue(value);
    }
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
            rebaseFilePaths(node, ctx);
            replaceRef(node, resolved, ctx);
          },
        },
        any: {
          leave(node: unknown, ctx: UserContext) {
            rebaseFilePaths(node, ctx);
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
        [CONFIG_NODE_TYPE_NAMES.ScorecardClassicLevel]: {
          leave(node: unknown, ctx: UserContext) {
            bundlerHandleNode(node, ctx);
          },
        },
        ConfigRoot: {
          leave(node: unknown, ctx: UserContext) {
            bundlerHandleNode(node, ctx);
          },
        },
      },
    },
  ],
  NormalizedConfigTypes
);

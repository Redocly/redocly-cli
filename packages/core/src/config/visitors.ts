import { CONFIG_NODE_TYPE_NAMES } from '@redocly/config';
import * as path from 'node:path';

import { isAbsoluteUrl, replaceRef } from '../ref-utils.js';
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

// a reference with a scheme is absolute, whatever the scheme (RFC 3986); isAbsoluteUrl knows only a fixed list
const URI_SCHEME = /^[a-z][a-z\d+.-]*:/i;

// Paths in a `$ref`-ed file are written relative to that file, but the bundled config is read relative to the root config.
function rebaseFilePaths(node: unknown, ctx: UserContext) {
  const { rootRef, rebasedNodes } = ctx.getVisitorData() as ConfigBundlerVisitorData;
  const sourceRef = ctx.location.source.absoluteRef;
  if (!isPlainObject(node) || sourceRef === rootRef || rebasedNodes.has(node)) {
    return;
  }
  // the walker visits a shared `$ref` target once per node type name, so rebase each node once
  rebasedNodes.add(node);
  const rebase = (value: unknown) => {
    if (!isString(value) || !value || URI_SCHEME.test(value) || path.isAbsolute(value)) {
      return value;
    }
    if (isAbsoluteUrl(sourceRef)) {
      return new URL(value, sourceRef).href;
    }
    const resolved = path.resolve(path.dirname(sourceRef), value);
    return path.relative(path.dirname(rootRef), resolved) || '.';
  };
  for (const [field, schema] of Object.entries(ctx.type.properties)) {
    if (typeof schema === 'function' || isNamedType(schema)) {
      continue;
    }
    const value = node[field];
    if (schema?.format === 'uri-reference' && isString(value)) {
      node[field] = rebase(value);
    } else if (schema?.items?.format === 'uri-reference' && Array.isArray(value)) {
      node[field] = value.map(rebase);
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
            // fields written next to `$ref` belong to this file and never reach a leave hook of their own
            rebaseFilePaths(node, ctx);
            replaceRef(node, resolved, ctx);
          },
        },
        // every node type can declare file paths, so each node is checked against its own type
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

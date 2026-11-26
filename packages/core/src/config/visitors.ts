import { CONFIG_NODE_TYPE_NAMES } from '@redocly/config';
import * as path from 'node:path';
import * as url from 'node:url';

import { isAbsoluteUrl, isFileUrl, isRef, replaceRef } from '../ref-utils.js';
import { NormalizedConfigTypes } from '../types/redocly-yaml.js';
import type { OasRef } from '../typings/openapi.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import { isString } from '../utils/is-string.js';
import { slash } from '../utils/slash.js';
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
  // the nodes whose paths are rewritten: a node is visited once per node type it is reached as
  rewrittenNodes: WeakSet<object>;
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

function rewritePaths(value: unknown, dir: string) {
  const rewritePath = (item: unknown) => {
    if (!isString(item) || !item || isAbsoluteUrl(item) || path.isAbsolute(item)) {
      return item;
    }
    return slash(path.join(dir, item));
  };
  return Array.isArray(value) ? value.map(rewritePath) : rewritePath(value);
}

// the folder of a local referenced config file, relative to the root config folder;
// undefined for the root config and for remote files
function getReferencedLocalDir(sourceRef: string, rootRef: string): string | undefined {
  const toFilePath = (ref: string) => (isFileUrl(ref) ? url.fileURLToPath(ref) : ref);
  const sourcePath = toFilePath(sourceRef);
  if (sourceRef === rootRef || isAbsoluteUrl(sourcePath)) {
    return undefined;
  }
  return path.relative(path.dirname(toFilePath(rootRef)), path.dirname(sourcePath));
}

// every reader of the config resolves paths from the root config folder, so a path from a referenced
// file is rewritten relative to that folder
function rewriteUriReferenceProperties(node: unknown, ctx: UserContext) {
  const { rewrittenNodes, rootRef } = ctx.getVisitorData() as ConfigBundlerVisitorData;
  const fields = ctx.type.uriReferenceProperties;
  if (!fields || !isPlainObject(node) || rewrittenNodes.has(node)) {
    return;
  }
  rewrittenNodes.add(node);
  for (const field of fields) {
    // a `$ref` on the path field itself: the value is written in the referenced file
    const { node: value, location } = isRef(node[field])
      ? ctx.resolve(node[field])
      : { node: node[field], location: ctx.location };
    const sourceDir = location && getReferencedLocalDir(location.source.absoluteRef, rootRef);
    if (value !== undefined && sourceDir !== undefined) {
      node[field] = rewritePaths(value, sourceDir);
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
          enter(node: OasRef, ctx: UserContext) {
            // the fields written next to the `$ref` belong to the file of the `$ref`
            rewriteUriReferenceProperties(node, ctx);
          },
          leave(node: OasRef, ctx: UserContext, resolved: ResolveResult<any>) {
            replaceRef(node, resolved, ctx);
          },
        },
        any: {
          // on enter: a `$ref` on a path field is still in place, with the file of its value
          enter(node: unknown, ctx: UserContext) {
            rewriteUriReferenceProperties(node, ctx);
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

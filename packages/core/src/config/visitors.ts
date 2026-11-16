import { CONFIG_NODE_TYPE_NAMES } from '@redocly/config';
import * as path from 'node:path';
import * as url from 'node:url';

import { isAbsoluteUrl, isFileUrl, replaceRef } from '../ref-utils.js';
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

function resolvePath(value: unknown, dir: string) {
  if (!isString(value) || !value || isAbsoluteUrl(value) || path.isAbsolute(value)) {
    return value;
  }
  return path.resolve(dir, value);
}

function resolvePaths(value: unknown, dir: string) {
  return Array.isArray(value)
    ? value.map((item) => resolvePath(item, dir))
    : resolvePath(value, dir);
}

// the folder of a local referenced config file; undefined for the root config and for remote files
function getReferencedLocalDir(sourceRef: string, ctx: UserContext): string | undefined {
  const { rootRef } = ctx.getVisitorData() as ConfigBundlerVisitorData;
  const sourcePath = isFileUrl(sourceRef) ? url.fileURLToPath(sourceRef) : sourceRef;
  if (sourceRef === rootRef || isAbsoluteUrl(sourcePath)) {
    return undefined;
  }
  return path.dirname(sourcePath);
}

// commands resolve paths from the root config folder, so a path from a referenced file is made absolute
function resolveUriReferenceProperties(node: unknown, ctx: UserContext) {
  const sourceDir = getReferencedLocalDir(ctx.location.source.absoluteRef, ctx);
  if (!isPlainObject(node) || sourceDir === undefined) {
    return;
  }
  for (const field of ctx.type.uriReferenceProperties ?? []) {
    if (node[field] !== undefined) {
      node[field] = resolvePaths(node[field], sourceDir);
    }
  }
}

// a `$ref` on the path field itself: the value is written in the referenced file
function resolveUriReferenceValue(
  ctx: UserContext,
  resolved: ResolveResult<any>
): ResolveResult<any> {
  const schema = ctx.type.scalar;
  if (!resolved.location || (schema?.format ?? schema?.items?.format) !== 'uri-reference') {
    return resolved;
  }
  const sourceDir = getReferencedLocalDir(resolved.location.source.absoluteRef, ctx);
  if (sourceDir === undefined) {
    return resolved;
  }
  return { ...resolved, node: resolvePaths(resolved.node, sourceDir) };
}

export const configBundlerVisitor = normalizeVisitors(
  [
    {
      severity: 'error',
      ruleId: CONFIG_BUNDLER_VISITOR_ID,
      visitor: {
        ref: {
          leave(node: OasRef, ctx: UserContext, resolved: ResolveResult<any>) {
            // the fields written next to the `$ref` belong to the file of the `$ref`
            resolveUriReferenceProperties(node, ctx);
            replaceRef(node, resolveUriReferenceValue(ctx, resolved), ctx);
          },
        },
        any: {
          leave(node: unknown, ctx: UserContext) {
            resolveUriReferenceProperties(node, ctx);
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

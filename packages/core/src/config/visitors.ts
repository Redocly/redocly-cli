import { CONFIG_NODE_TYPE_NAMES } from '@redocly/config';
import * as path from 'node:path';

import { hasScheme, isAbsoluteUrl, replaceRef } from '../ref-utils.js';
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
  if (hasScheme(value) || path.isAbsolute(value)) {
    return value;
  }
  if (isAbsoluteUrl(sourceRef)) {
    return new URL(value, sourceRef).href;
  }
  const resolved = path.resolve(path.dirname(sourceRef), value);
  return path.relative(path.dirname(rootRef), resolved) || '.';
}

// a glob is matched against project paths: `/` and `**` already anchor it, a leading `!` negates the rest
function rebaseGlob(value: string, sourceRef: string, rootRef: string) {
  const pattern = value.replace(/^!+/, '');
  if (!pattern || pattern.startsWith('/') || pattern.startsWith('**') || isAbsoluteUrl(sourceRef)) {
    return value;
  }
  const dir = path
    .relative(path.dirname(rootRef), path.dirname(sourceRef))
    .split(path.sep)
    .join('/');
  const negation = value.slice(0, value.length - pattern.length);
  return dir ? negation + path.posix.join(dir, pattern) : value;
}

// one or more images, as a path or as "path mode" pairs separated by ", "; a token without a file extension is an icon name
function rebaseImage(value: string, sourceRef: string, rootRef: string) {
  return value
    .split(/\s*,\s*/)
    .map((entry) => {
      const [src, ...mode] = entry.trim().split(/\s+/);
      return [/\.\w+$/.test(src) ? rebasePath(src, sourceRef, rootRef) : src, ...mode].join(' ');
    })
    .join(', ');
}

const REBASERS: Record<string, typeof rebasePath> = {
  'uri-reference': rebasePath,
  glob: rebaseGlob,
  image: rebaseImage,
};

// Paths and globs in a `$ref`-ed file are written relative to that file, but the bundled config is read relative to the root config.
function rebaseFilePaths(node: unknown, ctx: UserContext) {
  const { rootRef, rebasedNodes } = ctx.getVisitorData() as ConfigBundlerVisitorData;
  const sourceRef = ctx.location.source.absoluteRef;
  if (!isPlainObject(node) || sourceRef === rootRef || rebasedNodes.has(node)) {
    return;
  }
  // the walker visits a shared `$ref` target once per node type name, so rebase each node once
  rebasedNodes.add(node);
  for (const [field, schema] of Object.entries(ctx.type.properties)) {
    const value = node[field];
    if (!isString(value) && !Array.isArray(value)) {
      continue;
    }
    // a oneOf property resolves to the branch that matches this value; a scalar branch keeps its format
    const propSchema = typeof schema === 'function' ? schema(value, field) : schema;
    if (!isPlainObject(propSchema) || isNamedType(propSchema)) {
      continue;
    }
    const format = propSchema.format ?? propSchema.items?.format;
    const rebase = format ? REBASERS[format] : undefined;
    if (!rebase) {
      continue;
    }
    const rebaseItem = (item: unknown) =>
      isString(item) && item ? rebase(item, sourceRef, rootRef) : item;
    node[field] = Array.isArray(value) ? value.map(rebaseItem) : rebaseItem(value);
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

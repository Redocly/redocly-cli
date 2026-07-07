import { escapePointerFragment } from '../ref-utils.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import type { UserContext } from '../walk.js';
import type { ApiMapNode, ApiMapOptions } from './types.js';

const SUMMARY_MAX_LENGTH = 200;

export function getStringProp(node: unknown, key: string): string | undefined {
  if (!isPlainObject(node)) return undefined;
  const value = node[key];
  return typeof value === 'string' && value ? value : undefined;
}

function makeSummary(node: unknown): string | undefined {
  const summary = getStringProp(node, 'summary');
  if (summary) return summary;
  const description = getStringProp(node, 'description');
  if (!description) return undefined;
  if (description.length <= SUMMARY_MAX_LENGTH) return description;
  return description.slice(0, SUMMARY_MAX_LENGTH).replace(/\s+\S*$/, '') + '...';
}

export function createApiMapHooks(root: ApiMapNode, opts: ApiMapOptions) {
  const stack: { obj: unknown; node: ApiMapNode }[] = [];
  const top = () => stack[stack.length - 1];
  const isDirectChild = (ctx: UserContext) => stack.length > 0 && ctx.parent === top().obj;

  function addNode(
    init: Pick<ApiMapNode, 'title' | 'summary' | 'method' | 'path'>,
    ctx: UserContext
  ): ApiMapNode {
    const parentNode = top().node;
    const fragment = escapePointerFragment(String(ctx.key));
    const node: ApiMapNode = {
      title: init.title,
      kind: ctx.type.name,
      pointer: parentNode.pointer === '#/' ? `#/${fragment}` : `${parentNode.pointer}/${fragment}`,
      ...(init.summary && { summary: init.summary }),
      ...(init.method && { method: init.method }),
      ...(init.path && { path: init.path }),
      ...(opts.sourceLocations && {
        source: { file: ctx.location.source.absoluteRef, pointer: ctx.location.pointer },
      }),
      nodes: [],
    };
    parentNode.nodes.push(node);
    return node;
  }

  const rootHooks = {
    enter(node: unknown) {
      root.title = getStringProp(isPlainObject(node) ? node.info : undefined, 'title') ?? 'API';
      stack.push({ obj: node, node: root });
    },
  };

  function sectionHooks(parentTypeName: string) {
    return {
      enter(node: unknown, ctx: UserContext) {
        if (!isDirectChild(ctx) || top().node.kind !== parentTypeName) return;
        const section = addNode({ title: String(ctx.key) }, ctx);
        stack.push({ obj: node, node: section });
      },
      leave(node: unknown) {
        if (top()?.obj !== node) return;
        const { node: section } = stack.pop()!;
        if (section.nodes.length === 0) {
          const siblings = top().node.nodes;
          siblings.splice(siblings.indexOf(section), 1);
        }
      },
    };
  }

  const containerHooks = {
    enter(node: unknown, ctx: UserContext) {
      if (!isDirectChild(ctx)) return;
      const container = addNode({ title: String(ctx.key), summary: makeSummary(node) }, ctx);
      stack.push({ obj: node, node: container });
    },
    leave(node: unknown) {
      if (top()?.obj === node) stack.pop();
    },
  };

  function operationHooks(fields: { method?: boolean; path?: boolean }) {
    return {
      enter(operation: unknown, ctx: UserContext) {
        if (!isDirectChild(ctx)) return;
        const parentNode = top().node;
        const key = String(ctx.key);
        addNode(
          {
            title:
              getStringProp(operation, 'operationId') ?? `${key.toUpperCase()} ${parentNode.title}`,
            summary: makeSummary(operation),
            method: fields.method ? key : undefined,
            path: fields.path ? parentNode.title : undefined,
          },
          ctx
        );
      },
    };
  }

  function leafHooks(titleProp?: string) {
    return {
      enter(node: unknown, ctx: UserContext) {
        if (!isDirectChild(ctx)) return;
        const title = titleProp && getStringProp(node, titleProp);
        addNode({ title: title || String(ctx.key), summary: makeSummary(node) }, ctx);
      },
    };
  }

  return { rootHooks, sectionHooks, containerHooks, operationHooks, leafHooks };
}

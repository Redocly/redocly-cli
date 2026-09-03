import {
  BaseResolver,
  detectSpec,
  getTypes,
  isAbsoluteUrl,
  logger,
  normalizeTypes,
  normalizeVisitors,
  resolveDocument,
  walkDocument,
  type Document,
  type Location,
  type ResolveResult,
  type UserContext,
  type WalkContext,
} from '@redocly/openapi-core';
import { relative, resolve } from 'node:path';

import type { VerifyConfigOptions } from '../types.js';
import { exitWithError } from '../utils/error.js';
import { getFallbackApisOrExit } from '../utils/miscellaneous.js';
import type { CommandArgs } from '../wrapper.js';

export type NodeTypeArgv = {
  api: string;
  pointer?: string;
  type?: string;
  summary?: boolean;
  parents?: boolean;
} & VerifyConfigOptions;

type FoundNode = {
  absoluteRef: string;
  pointer: string;
  types: string[];
  resolvesTo?: Location;
};

export async function handleNodeType({ argv, config, collectSpecData }: CommandArgs<NodeTypeArgv>) {
  const [{ path }] = await getFallbackApisOrExit([argv.api], config);
  const externalRefResolver = new BaseResolver(config.resolve);
  const document = (await externalRefResolver.resolveDocument(null, path, true)) as Document;
  collectSpecData?.(document);

  const specVersion = detectSpec(document.parsed);
  const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);

  // Not bundled: bundling rewrites the pointers of $ref-ed files.
  const nodes = new Map<string, FoundNode>();
  const recordNode = ({ source, pointer }: Location, typeName: string, resolvesTo?: Location) => {
    const key = `${source.absoluteRef}${pointer}`;
    const node = nodes.get(key);
    if (!node) {
      nodes.set(key, { absoluteRef: source.absoluteRef, pointer, types: [typeName], resolvesTo });
    } else if (!node.types.includes(typeName)) {
      node.types.push(typeName);
    }
  };

  const visitor = {
    any: {
      enter(_node: unknown, { location, rawLocation, type }: UserContext) {
        recordNode(rawLocation, type.name);
        recordNode(location, type.name);
      },
    },
    // The walker enters a node once, so a $ref site to an already visited target is recorded here.
    ref(_ref: unknown, { location, type }: UserContext, resolved: ResolveResult<object>) {
      recordNode(location, type.name, resolved.location);
    },
  };

  const ctx: WalkContext = {
    problems: [],
    specVersion,
    config,
    visitorsData: {},
  };

  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.Root,
    externalRefResolver,
  });

  walkDocument({
    document,
    rootType: types.Root,
    normalizedVisitors: normalizeVisitors(
      [{ severity: 'warn', ruleId: 'node-type', visitor }],
      types
    ),
    resolvedRefMap,
    ctx,
  });

  const allNodes = [...nodes.values()];

  if (argv.pointer) {
    const node = findNode(nodes, argv.pointer, document.source.absoluteRef);
    if (argv.parents) {
      printChains(chainsTo(nodes, node, document.source.absoluteRef));
    } else {
      logger.output(`${node.types.join('\n')}\n`);
    }
  } else if (argv.summary) {
    printSummary(allNodes);
  } else if (argv.type) {
    const typeName = argv.type;
    const filtered = allNodes.filter(({ types }) => types.includes(typeName));
    if (filtered.length === 0) {
      exitWithError(
        `No nodes of type '${typeName}'. Run the command with --summary to see the types used in this description.`
      );
    }
    if (argv.parents) {
      printDistinctChains(nodes, filtered, typeName, document.source.absoluteRef);
    } else {
      printTable(filtered);
    }
  } else {
    printTable(allNodes);
  }
}

// Ancestors are the recorded nodes at the shorter pointers on the same path. A chain that
// starts below the root document continues at the $ref sites that resolve to it or to one
// of its ancestors, because a $ref can enter a file at any pointer.
function chainsTo(
  nodes: Map<string, FoundNode>,
  node: FoundNode,
  rootRef: string,
  visited = new Set<string>()
): FoundNode[][] {
  const key = `${node.absoluteRef}${node.pointer}`;
  if (visited.has(key)) {
    return [[node]];
  }
  visited.add(key);

  const chain: FoundNode[] = [];
  const segments = node.pointer.split('/');

  for (let depth = 1; depth < segments.length; depth++) {
    const pointer = depth === 1 ? '#/' : segments.slice(0, depth).join('/');
    if (pointer === node.pointer) continue;
    const ancestor = nodes.get(`${node.absoluteRef}${pointer}`);
    if (ancestor) {
      chain.push(ancestor);
    }
  }
  chain.push(node);

  const chains: FoundNode[][] = [];
  if (chain[0].absoluteRef === rootRef && chain[0].pointer === '#/') {
    chains.push(chain);
  }

  for (const [depth, target] of chain.entries()) {
    const refSites = [...nodes.values()].filter(
      (candidate) =>
        candidate.resolvesTo?.source.absoluteRef === target.absoluteRef &&
        candidate.resolvesTo.pointer === target.pointer
    );
    // The $ref site has the type of its target, so the target drops out of the tail.
    const tail = chain.slice(depth + 1);
    for (const refSite of refSites) {
      chains.push(
        ...chainsTo(nodes, refSite, rootRef, visited).map((prefix) => [...prefix, ...tail])
      );
    }
  }

  return chains.length ? chains : [chain];
}

function printChains(chains: FoundNode[][]) {
  const lines = new Set(
    chains.map((chain) => chain.map(({ types }) => types.join(', ')).join(' → '))
  );
  for (const line of lines) {
    logger.output(`${line}\n`);
  }
}

function printDistinctChains(
  nodes: Map<string, FoundNode>,
  nodesOfType: FoundNode[],
  typeName: string,
  rootRef: string
) {
  const lines = new Set<string>();

  for (const node of nodesOfType) {
    for (const chain of chainsTo(nodes, node, rootRef)) {
      lines.add(
        chain
          .map(({ types }) => (types.includes(typeName) ? typeName : types.join(', ')))
          .join(' → ')
      );
    }
  }

  for (const line of lines) {
    logger.output(`${line}\n`);
  }
}

function findNode(nodes: Map<string, FoundNode>, pointer: string, rootRef: string): FoundNode {
  const [file, fragment] = pointer.split('#');
  const absoluteRef = file ? toAbsoluteRef(file) : rootRef;
  const node = nodes.get(`${absoluteRef}#${fragment || '/'}`);

  if (!node) {
    exitWithError(
      `No node at ${pointer}. ${
        describeClosestNode(nodes, absoluteRef, `#${fragment || '/'}`, file) ??
        `Check the pointer, and make sure the file is referenced from ${formatRef(rootRef)}.`
      }`
    );
  }

  return node;
}

function describeClosestNode(
  nodes: Map<string, FoundNode>,
  absoluteRef: string,
  pointer: string,
  filePrefix: string
): string | undefined {
  const segments = pointer.split('/');

  for (let depth = segments.length - 1; depth >= 1; depth--) {
    const closestPointer = depth === 1 ? '#/' : segments.slice(0, depth).join('/');
    const closest = nodes.get(`${absoluteRef}${closestPointer}`);
    if (!closest) continue;

    const missedSegment = segments[depth].toLowerCase();
    const childPrefix = depth === 1 ? '#/' : `${closestPointer}/`;
    const children = [...nodes.values()].filter(
      (child) =>
        child.absoluteRef === absoluteRef &&
        child.pointer.startsWith(childPrefix) &&
        !child.pointer.slice(childPrefix.length).includes('/')
    );
    const matching = children.filter((child) =>
      child.pointer.slice(childPrefix.length).toLowerCase().includes(missedSegment)
    );
    const suggestions = (matching.length ? matching : children).map(
      (child) => `  ${filePrefix}${child.pointer}`
    );
    const hiddenCount = suggestions.length - 20;
    if (hiddenCount > 0) {
      suggestions.length = 20;
      suggestions.push(`  …and ${hiddenCount} more`);
    }

    const closestDescription = `The closest node is ${closest.types.join(
      ', '
    )} at ${filePrefix}${closestPointer}.`;
    return suggestions.length
      ? `${closestDescription} Did you mean:\n${suggestions.join('\n')}`
      : closestDescription;
  }

  return undefined;
}

function printSummary(nodes: FoundNode[]) {
  const counts = new Map<string, number>();
  // A $ref site points to a node the walker enters anyway, so counting it would count that node twice.
  for (const { types, resolvesTo } of nodes) {
    if (resolvesTo) continue;
    for (const typeName of types) {
      counts.set(typeName, (counts.get(typeName) ?? 0) + 1);
    }
  }

  const typeNames = [...counts.keys()].sort();
  const columnWidth = Math.max(...typeNames.map((typeName) => typeName.length)) + 2;
  for (const typeName of typeNames) {
    logger.output(`${typeName.padEnd(columnWidth)}${counts.get(typeName)}\n`);
  }
}

function toAbsoluteRef(file: string) {
  return isAbsoluteUrl(file) ? file : resolve(process.cwd(), file);
}

function formatRef(absoluteRef: string) {
  return isAbsoluteUrl(absoluteRef) ? absoluteRef : relative(process.cwd(), absoluteRef);
}

function printTable(nodes: FoundNode[]) {
  const columnWidth = Math.max(...nodes.map(({ types }) => types.join(', ').length)) + 2;

  for (const { absoluteRef, pointer, types, resolvesTo } of nodes) {
    const target = resolvesTo
      ? ` → ${formatRef(resolvesTo.source.absoluteRef)}${
          resolvesTo.pointer === '#/' ? '' : resolvesTo.pointer
        }`
      : '';
    logger.output(
      `${types.join(', ').padEnd(columnWidth)}${formatRef(absoluteRef)}${pointer}${target}\n`
    );
  }
}

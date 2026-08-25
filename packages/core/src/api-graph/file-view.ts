import { collectReversePathsTo, type ApiAnalysis } from './build-graph.js';
import { toFileRange } from './build-index.js';
import {
  buildComponentListCard,
  buildOperationListCard,
  buildUsedByReportFromChains,
  type ComponentListCard,
  type OperationListCard,
  type UsedByReport,
} from './views.js';

export type FileCard = { file: string; defines: (OperationListCard | ComponentListCard)[] };

/**
 * Card-shaped view of everything a single file defines: every operation and component whose
 * resolved location lands in `filePath`. `filePath` is already normalized to the graph's file-id
 * form by the caller (see `toNodeId`/`toRelativePath`), so it's compared as-is.
 *
 * Returns `undefined` only when the file defines nothing AND isn't a node in the graph either —
 * i.e. it plays no part in this API description. A file that IS a graph node (the root document,
 * or a file whose only role is structural) but defines no operation or component of its own still
 * gets a card, just with an empty `defines`.
 */
export function buildFileCard(
  analysis: ApiAnalysis,
  filePath: string,
  options: { cwd: string }
): FileCard | undefined {
  const { cwd } = options;

  const operations = analysis.meta.operations.filter(
    (operation) => toFileRange(operation.location, cwd).file === filePath
  );
  const components = analysis.meta.components.filter(
    (component) => toFileRange(component.location, cwd).file === filePath
  );
  const isGraphNodeFile = analysis.graph.nodes.some((node) => node.file === filePath);
  if (operations.length === 0 && components.length === 0 && !isGraphNodeFile) {
    return undefined;
  }

  const defines: (OperationListCard | ComponentListCard)[] = [
    ...operations.map((operation) => buildOperationListCard(analysis, operation, cwd)),
    ...components.map((component) => buildComponentListCard(analysis, component, cwd)),
  ];
  return { file: filePath, defines };
}

/**
 * Reverse analysis for a whole file: seeds the BFS from every graph node the file defines
 * (operations, components, and any structural node stamped with this file), then merges the
 * resulting chains, keeping the shortest one per referrer. A referrer that itself lives in
 * `filePath` is excluded — a file doesn't count as affecting itself.
 */
export function buildFileUsedByReport(
  analysis: ApiAnalysis,
  filePath: string,
  cwd: string
): UsedByReport {
  const seedIds = [
    ...new Set(
      analysis.graph.nodes
        .filter((node) => node.file === filePath && !node.root)
        .map((node) => node.id)
    ),
  ];

  const shortestChains = new Map<string, string[]>();
  for (const seedId of seedIds) {
    for (const [referrerId, chain] of collectReversePathsTo(seedId, analysis.graph.edges)) {
      const shortest = shortestChains.get(referrerId);
      if (!shortest || chain.length < shortest.length) {
        shortestChains.set(referrerId, chain);
      }
    }
  }

  return buildUsedByReportFromChains(
    analysis,
    { id: filePath, file: filePath },
    shortestChains,
    cwd,
    new Set(seedIds)
  );
}

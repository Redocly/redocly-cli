import { logger, type ApiMapNode } from '@redocly/openapi-core';
import * as colors from 'colorette';

export function printApiMapStylish(node: ApiMapNode, depth = 0) {
  const indent = '  '.repeat(depth);
  const source = node.source
    ? colors.dim(
        ` (${node.source.file}:${node.source.startLine}:${node.source.startCol}-${node.source.endLine}:${node.source.endCol})`
      )
    : '';
  logger.output(
    `${indent}${node.title} ${colors.dim(node.kind)} ${colors.cyan(node.pointer)}${source}\n`
  );
  for (const child of node.nodes) {
    printApiMapStylish(child, depth + 1);
  }
}

import type { ComponentListCard, OperationListCard } from '@redocly/openapi-core';

/** `--brief` shape for an operation listing entry: coordinates and identity, no refs/usedBy. */
export type BriefOperationEntry = {
  method: string;
  path?: string;
  webhook?: string;
  operationId?: string;
  summary?: string;
  lines: [number, number];
  file?: string;
};

/** `--brief` shape for a component listing entry: coordinates and identity, no refs/usedBy. */
export type BriefComponentEntry = {
  name: string;
  summary?: string;
  lines: [number, number];
  file?: string;
};

/** Same file-spanning rule the stylish renderer uses: only call out the file once more than one is in play. */
function spansMultipleFiles(items: { file: string }[]): boolean {
  return new Set(items.map((item) => item.file)).size > 1;
}

function toBriefOperation(item: OperationListCard, showFile: boolean): BriefOperationEntry {
  return {
    method: item.method,
    ...(item.path !== undefined ? { path: item.path } : {}),
    ...(item.webhook !== undefined ? { webhook: item.webhook } : {}),
    ...(item.operationId ? { operationId: item.operationId } : {}),
    ...(item.summary ? { summary: item.summary } : {}),
    lines: [item.start_line, item.end_line],
    ...(showFile ? { file: item.file } : {}),
  };
}

function toBriefComponent(item: ComponentListCard, showFile: boolean): BriefComponentEntry {
  return {
    name: item.name,
    ...(item.summary ? { summary: item.summary } : {}),
    lines: [item.start_line, item.end_line],
    ...(showFile ? { file: item.file } : {}),
  };
}

export function briefOperations(items: OperationListCard[]): BriefOperationEntry[] {
  const showFile = spansMultipleFiles(items);
  return items.map((item) => toBriefOperation(item, showFile));
}

export function briefComponents(items: ComponentListCard[]): BriefComponentEntry[] {
  const showFile = spansMultipleFiles(items);
  return items.map((item) => toBriefComponent(item, showFile));
}

/** A `--file` card's `defines` array mixes operation and component entries; project each by kind. */
export function briefDefines(
  items: (OperationListCard | ComponentListCard)[]
): (BriefOperationEntry | BriefComponentEntry)[] {
  const showFile = spansMultipleFiles(items);
  return items.map((item) =>
    'method' in item ? toBriefOperation(item, showFile) : toBriefComponent(item, showFile)
  );
}

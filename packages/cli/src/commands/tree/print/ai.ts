import type { ComponentListCard, OperationListCard } from '@redocly/openapi-core';

/** `ai` listing shape for an operation entry: coordinates and identity, no refs/usedBy. */
export type AiOperationEntry = {
  method: string;
  path?: string;
  webhook?: string;
  operationId?: string;
  summary?: string;
  lines: [number, number];
  file?: string;
};

/** `ai` listing shape for a component entry: coordinates and identity, no refs/usedBy. */
export type AiComponentEntry = {
  name: string;
  summary?: string;
  lines: [number, number];
  file?: string;
};

/** Same file-spanning rule the stylish renderer uses: only call out the file once more than one is in play. */
function spansMultipleFiles(items: { file: string }[]): boolean {
  return new Set(items.map((item) => item.file)).size > 1;
}

function toAiOperationEntry(item: OperationListCard, showFile: boolean): AiOperationEntry {
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

function toAiComponentEntry(item: ComponentListCard, showFile: boolean): AiComponentEntry {
  return {
    name: item.name,
    ...(item.summary ? { summary: item.summary } : {}),
    lines: [item.start_line, item.end_line],
    ...(showFile ? { file: item.file } : {}),
  };
}

export function aiOperations(items: OperationListCard[]): AiOperationEntry[] {
  const showFile = spansMultipleFiles(items);
  return items.map((item) => toAiOperationEntry(item, showFile));
}

export function aiComponents(items: ComponentListCard[]): AiComponentEntry[] {
  const showFile = spansMultipleFiles(items);
  return items.map((item) => toAiComponentEntry(item, showFile));
}

/** A `--file` card's `defines` array mixes operation and component entries; project each by kind. */
export function aiDefines(
  items: (OperationListCard | ComponentListCard)[]
): (AiOperationEntry | AiComponentEntry)[] {
  const showFile = spansMultipleFiles(items);
  return items.map((item) =>
    'method' in item ? toAiOperationEntry(item, showFile) : toAiComponentEntry(item, showFile)
  );
}

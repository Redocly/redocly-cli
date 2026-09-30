import type { DiffResult, JudgedChange, SpecVersion } from '@redocly/openapi-core';

import { formatPath } from '../../../utils/miscellaneous.js';
import { toJsonChange } from './json.js';

const SPEC_NAMES: Record<SpecVersion, string> = {
  oas2: 'OpenAPI 2.0',
  oas3_0: 'OpenAPI 3.0',
  oas3_1: 'OpenAPI 3.1',
  oas3_2: 'OpenAPI 3.2',
  async2: 'AsyncAPI 2',
  async3: 'AsyncAPI 3',
  arazzo1: 'Arazzo 1.0',
  arazzo1_1: 'Arazzo 1.1',
  overlay1: 'Overlay 1',
  openrpc1: 'OpenRPC 1',
  graphql: 'GraphQL',
};

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderChange(change: JudgedChange): string {
  const address = change.kind === 'modified' ? `${change.key} · ${change.property}` : change.key;
  const { base, revision } = toJsonChange(change);
  return `
    <details class="change ${change.impact}">
      <summary>
        <span class="badge">${escapeHtml(change.impact)}</span>
        <code>${escapeHtml(change.kind)}</code>
        <code class="loc">${escapeHtml(address)}</code>
        ${change.verdicts
          .map(
            (verdict) =>
              `<span class="msg">${escapeHtml(verdict.message)}</span> <span class="rules">${escapeHtml(
                verdict.ruleId
              )}</span>`
          )
          .join(' ')}
      </summary>
      <pre>${escapeHtml(JSON.stringify({ base, revision }, null, 2))}</pre>
    </details>`;
}

export function htmlDiff(result: DiffResult): string {
  const { major, minor, patch } = result.summary;
  const { base, revision } = result.specVersions;
  const specs =
    base === revision ? SPEC_NAMES[base] : `${SPEC_NAMES[base]} → ${SPEC_NAMES[revision]}`;
  const bumpSpan = result.bump
    ? `<span style="color:#9aa5b1">requires a ${escapeHtml(result.bump)} bump</span>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>API diff</title>
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; margin: 2rem auto; max-width: 60rem; padding: 0 1rem; color: #1f2933; }
  h1 { font-size: 1.4rem; }
  .summary span { margin-right: 1rem; font-weight: 600; }
  .change { border: 1px solid #e0e4e8; border-radius: 6px; margin: .5rem 0; padding: .25rem .75rem; }
  .change summary { cursor: pointer; display: flex; gap: .6rem; align-items: baseline; flex-wrap: wrap; }
  .badge { border-radius: 4px; padding: 0 .5rem; font-size: .8rem; color: #fff; }
  .major .badge { background: #c0392b; }
  .minor .badge { background: #1e8449; }
  .patch .badge { background: #9aa5b1; }
  .msg { color: #52606d; }
  .rules { color: #9aa5b1; font-size: .85rem; }
  pre { background: #f5f7fa; padding: .75rem; border-radius: 6px; overflow-x: auto; }
  code.loc { word-break: break-all; }
</style>
</head>
<body>
<h1>API diff: ${escapeHtml(formatPath(result.files.base))} → ${escapeHtml(formatPath(result.files.revision))}</h1>
<p class="summary">
  <span style="color:#c0392b">${major} major</span>
  <span style="color:#1e8449">${minor} minor</span>
  <span style="color:#9aa5b1">${patch} patch</span>
  ${bumpSpan}
  <span style="color:#9aa5b1">${escapeHtml(specs)}</span>
</p>
${result.changes.map(renderChange).join('\n')}
</body>
</html>`;
}

import type { Change, DiffResult } from '../engine/types.js';

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const IMPACT_CLASS: Record<Change['compat'], string> = {
  breaking: 'breaking',
  'non-breaking': 'ok',
};

function renderChange(change: Change): string {
  const location = change.property ? `${change.pointer} · ${change.property}` : change.pointer;
  const payload = {
    ...(change.base ? { base: change.base } : {}),
    ...(change.revision ? { revision: change.revision } : {}),
  };
  return `
    <details class="change ${IMPACT_CLASS[change.compat]}">
      <summary>
        <span class="badge">${escapeHtml(change.compat)}</span>
        <code>${escapeHtml(change.kind)}</code>
        <code class="loc">${escapeHtml(location)}</code>
        ${change.message ? `<span class="msg">${escapeHtml(change.message)}</span>` : ''}
        ${change.ruleIds ? `<span class="rules">${escapeHtml(change.ruleIds.join(', '))}</span>` : ''}
      </summary>
      <pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>
    </details>`;
}

export function htmlDiff(result: DiffResult): string {
  const { breaking, nonBreaking } = result.summary;
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
  .breaking .badge { background: #c0392b; }
  .ok .badge { background: #1e8449; }
  .msg { color: #52606d; }
  .rules { color: #9aa5b1; font-size: .85rem; }
  pre { background: #f5f7fa; padding: .75rem; border-radius: 6px; overflow-x: auto; }
  code.loc { word-break: break-all; }
</style>
</head>
<body>
<h1>API diff</h1>
<p class="summary">
  <span style="color:#c0392b">${breaking} breaking</span>
  <span style="color:#1e8449">${nonBreaking} non-breaking</span>
  <span style="color:#9aa5b1">${escapeHtml(result.specVersions.base)} → ${escapeHtml(
    result.specVersions.revision
  )}</span>
</p>
${result.changes.map(renderChange).join('\n')}
</body>
</html>`;
}

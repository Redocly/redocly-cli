import type { TreeView } from '../index.js';
import type { TreeFormat } from '../types.js';

export function renderView(view: TreeView, format: TreeFormat): string {
  const payload = viewPayload(view);
  if (format === 'json') return JSON.stringify(payload, null, 2);
  return renderViewStylish(view);
}

function viewPayload(view: TreeView): unknown {
  switch (view.kind) {
    case 'overview':
      return view.overview;
    case 'operations':
      return view.items;
    case 'paths':
      return view.items;
    case 'components':
      return { section: view.section, items: view.items };
    case 'operation-card':
    case 'component-card':
      return view.card;
    case 'used-by':
      return view.report;
  }
}

// Task 7 replaces this JSON fallback with the real stylish renderer.
export function renderViewStylish(view: TreeView): string {
  return JSON.stringify(viewPayload(view), null, 2);
}

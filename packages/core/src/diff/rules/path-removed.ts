import { nameOf } from '../diff-node.js';
import type { DiffRule } from '../types.js';

// `/menu/{id}` and `/menu/{itemId}` are one URL: a template names its variables for the docs only.
const templateShape = (path: unknown) => String(path).replace(/\{[^}]+\}/g, '{}');

export const PathRemoved: DiffRule = () => ({
  Paths: {
    PathItem(change, { report }) {
      if (change.kind === 'removed') {
        report({ message: `Path \`${nameOf(change.node)}\` was removed.` });
      }
      if (change.kind !== 'modified' || change.property !== 'key') return;

      const { value: before } = change.base;
      const { value: after } = change.revision;
      if (templateShape(before) !== templateShape(after)) {
        report({ message: `Path \`${before}\` was renamed to \`${after}\`.` });
      }
    },
  },
  Root: {
    Paths(change, { report }) {
      if (change.kind === 'removed') report({ message: 'All paths were removed.' });
    },
    WebhooksMap(change, { report }) {
      if (change.kind === 'removed') report({ message: 'All webhooks were removed.' });
    },
  },
  // A webhook's key names it for the docs, so only its removal is reported.
  WebhooksMap: {
    PathItem(change, { report }) {
      if (change.kind === 'removed') {
        report({ message: `Webhook \`${nameOf(change.node)}\` was removed.` });
      }
    },
  },
  // A callback is the API calling the client back, judged like a webhook. The callbacks of
  // `components` are reported where an operation uses them.
  Operation: {
    CallbacksMap(change, { report }) {
      if (change.kind === 'removed') report({ message: 'All callbacks were removed.' });
    },
    Callback(change, { report }) {
      if (change.kind === 'removed') {
        report({ message: `Callback \`${nameOf(change.node)}\` was removed.` });
      }
    },
  },
  CallbacksMap: {
    Callback: {
      PathItem(change, { report }) {
        if (change.kind !== 'removed') return;

        const callback = nameOf(change.node.parent!);
        report({ message: `Callback \`${callback}\` no longer calls \`${nameOf(change.node)}\`.` });
      },
    },
  },
});

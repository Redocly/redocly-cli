import type { Arazzo1Rule, Async2Rule, Async3Rule, Oas2Rule, Oas3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const NoUnsafeMarkdown: Oas3Rule | Oas2Rule | Async3Rule | Async2Rule | Arazzo1Rule = () => {
  return {
    any(node: Record<string, unknown>, { report, location }: UserContext) {
      if (typeof node.description !== 'string') return;
      if (/<script\b/i.test(node.description)) {
        report({
          message: "Markdown descriptions must not contain '<script>' tags.",
          location: location.child(['description']),
          reference: 'https://redocly.com/docs/cli/rules/common/no-unsafe-markdown',
        });
      }
      if (/<[a-z][^>]*\bon[a-z]+\s*=/i.test(node.description)) {
        report({
          message: 'Markdown descriptions must not contain HTML event handler attributes.',
          location: location.child(['description']),
          reference: 'https://redocly.com/docs/cli/rules/common/no-unsafe-markdown',
        });
      }
      if (/(?:\]\(\s*|\b(?:href|src)\s*=\s*["']?\s*)javascript:/i.test(node.description)) {
        report({
          message: "Markdown descriptions must not contain 'javascript:' URLs.",
          location: location.child(['description']),
          reference: 'https://redocly.com/docs/cli/rules/common/no-unsafe-markdown',
        });
      }
    },
  };
};

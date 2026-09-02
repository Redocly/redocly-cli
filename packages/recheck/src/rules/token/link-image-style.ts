import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md054.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
// Relies on `getReferenceLinkImageData` (helpers.ts) for its `definitions`
// map only (to resolve a full/collapsed/shortcut reference's destination
// for the url_inline/autolink-eligibility check) -- unaffected by that
// helper's undefined-reference DEVIATION note, since an undefined
// reference has no destination to resolve here regardless.
import type { TokenRule } from '../types.js';
import { getDescendantsByType, getReferenceLinkImageData } from './helpers.js';

const nextLinesRe = /[\r\n][\s\S]*$/;
const backslashEscapeRe = /\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g;

function removeBackslashEscapes(text: string): string {
  return text.replace(backslashEscapeRe, '$1');
}

const autolinkDisallowedRe = /[ <>]/;

function autolinkAble(destination: string): boolean {
  try {
    new URL(destination);
  } catch {
    // Not an absolute URL
    return false;
  }
  return !autolinkDisallowedRe.test(destination);
}

export const linkImageStyle: TokenRule = {
  name: 'link-image-style',
  tags: ['images', 'links'],
  fixable: true,
  defaults: {
    message: 'Link and image style',
    autolink: true,
    inline: true,
    full: true,
    collapsed: true,
    shortcut: true,
    urlInline: true,
  },
  check(ctx) {
    const config = ctx.config;
    const autolink = config.autolink === undefined || !!config.autolink;
    const inline = config.inline === undefined || !!config.inline;
    const full = config.full === undefined || !!config.full;
    const collapsed = config.collapsed === undefined || !!config.collapsed;
    const shortcut = config.shortcut === undefined || !!config.shortcut;
    const urlInline = config.urlInline === undefined || !!config.urlInline;
    if (autolink && inline && full && collapsed && shortcut && urlInline) {
      // Everything allowed, nothing to check
      return;
    }

    const { definitions } = getReferenceLinkImageData(ctx.tree);
    const links = filterByTypes(ctx.tree, ['autolink', 'image', 'link']);
    for (const link of links) {
      const { endColumn, endLine, startColumn, startLine, text, type } = link;
      const image = type === 'image';
      let label: string | null = null;
      let destination: string | null = null;
      let isError = false;

      if (type === 'autolink') {
        destination =
          getDescendantsByType(link, [['autolinkEmail', 'autolinkProtocol']])[0]?.text ?? null;
        label = destination;
        isError = !autolink && Boolean(destination);
      } else {
        label = getDescendantsByType(link, ['label', 'labelText'])[0]?.text ?? null;
        destination =
          getDescendantsByType(link, [
            'resource',
            'resourceDestination',
            ['resourceDestinationLiteral', 'resourceDestinationRaw'],
            'resourceDestinationString',
          ])[0]?.text ?? null;
        if (destination) {
          // link kind is an inline link
          const title = getDescendantsByType(link, [
            'resource',
            'resourceTitle',
            'resourceTitleString',
          ])[0]?.text;
          isError =
            !inline ||
            (!urlInline &&
              autolink &&
              !image &&
              !title &&
              label === destination &&
              autolinkAble(destination));
        } else {
          // link kind is a full/collapsed/shortcut reference link
          const isShortcut = getDescendantsByType(link, ['reference']).length === 0;
          const referenceString = getDescendantsByType(link, ['reference', 'referenceString'])[0]
            ?.text;
          const isCollapsed = referenceString === undefined;
          const definition = definitions.get(referenceString || (label ?? ''));
          destination = definition?.[1] || '';
          isError = Boolean(
            destination && (isShortcut ? !shortcut : isCollapsed ? !collapsed : !full)
          );
        }
      }

      if (isError) {
        let fixInfo:
          | { lineNumber: number; editColumn: number; deleteCount: number; insertText?: string }
          | undefined;
        if (startLine === endLine) {
          const range: [number, number] = [startColumn, endColumn - startColumn];
          let insertText: string | null = null;
          const canInline = inline && label;
          const canAutolink =
            autolink && !image && destination !== null && autolinkAble(destination);
          if (canInline && (urlInline || !canAutolink)) {
            // Most useful form
            const prefix = image ? '!' : '';
            const escapedLabel = (label ?? '').replace(/[[\]]/g, '\\$&');
            const escapedDestination = (destination ?? '').replace(/[()]/g, '\\$&');
            insertText = `${prefix}[${escapedLabel}](${escapedDestination})`;
          } else if (canAutolink) {
            // Simplest form
            insertText = `<${removeBackslashEscapes(destination ?? '')}>`;
          }
          if (insertText) {
            fixInfo = {
              lineNumber: startLine,
              editColumn: range[0],
              deleteCount: range[1],
              insertText,
            };
          }
        }
        ctx.onError({
          line: startLine,
          column: startLine === endLine ? startColumn : undefined,
          context: text.replace(nextLinesRe, ''),
          fixInfo,
        });
      }
    }
  },
};

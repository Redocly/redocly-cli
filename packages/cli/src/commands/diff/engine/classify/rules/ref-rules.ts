import { warning, type DiffRule } from '../../types.js';

// Pointer-aligned comparison cannot verify whether two different targets are
// content-equivalent (spec §7.3, §13) — honest verdict is a warning.
export const refTargetChanged: DiffRule = {
  id: 'ref-target-changed',
  description:
    'A $ref now points to a different target; content equivalence cannot be verified automatically.',
  visit(change, ctx) {
    if (change.kind !== 'changed' || !change.property) return;
    const wasRef = change.property in (ctx.base(change.pointer)?.refs ?? {});
    const isRefNow = change.property in (ctx.revision(change.pointer)?.refs ?? {});
    if (!wasRef && !isRefNow) return;
    return warning(
      `Reference target changed from '${change.base?.value}' to '${change.revision?.value}' — review manually.`
    );
  },
};

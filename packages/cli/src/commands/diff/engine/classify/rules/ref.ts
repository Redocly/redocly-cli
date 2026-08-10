import { breaking, type DiffRule } from '../../types.js';

// Pointer-aligned comparison cannot verify whether two different targets are
// content-equivalent (spec §7.3, §13) — the conservative verdict is breaking.
export const refTargetChanged: DiffRule = {
  id: 'ref-target-changed',
  description:
    'The `$ref` points to a different target. The diff cannot check that the new target is equivalent.',
  visit(change, ctx) {
    if (change.kind !== 'changed' || !change.property) return;
    const wasRef = change.property in (ctx.base(change.pointer)?.refs ?? {});
    const isRefNow = change.property in (ctx.revision(change.pointer)?.refs ?? {});
    if (!wasRef && !isRefNow) return;
    return breaking(
      `The reference target changed from '${change.base?.value}' to '${change.revision?.value}'. The diff cannot check that the two targets are equivalent.`
    );
  },
};

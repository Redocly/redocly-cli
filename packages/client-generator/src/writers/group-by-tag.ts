import type { ApiModel, OperationModel } from '../intermediate-representation/model.js';

export type TagGroup = {
  /** The safe file stem for this group (without extension). */
  stem: string;
  operations: OperationModel[];
};

/**
 * Sanitize a tag into a file stem: keep alphanumerics, `_`, and `-`; replace any
 * other character (spaces, slashes, dots) with `-`; collapse repeats; trim edge
 * dashes. Dots are intentionally dropped so a tag can never collide with the
 * `.http`/`.schemas` sibling files. Falls back to `tag` if nothing survives.
 */
export function sanitizeTagStem(tag: string): string {
  const stem = tag
    .replace(/[^A-Za-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return stem.length > 0 ? stem : 'tag';
}

/**
 * Group a model's operations into per-file buckets for `tags` / `tags-split`
 * output, using **first-tag assignment**: each operation lands in exactly one
 * group (its first tag, or `default` when untagged). Buckets are returned in
 * first-seen order for deterministic file ordering.
 *
 * Stems are sanitized and de-duplicated (a `-2`, `-3`, … suffix on collision),
 * and the `--output` anchor stem is reserved so a tag can't overwrite the entry
 * or shared files.
 */
export function groupByTag(model: ApiModel, anchorStem: string): TagGroup[] {
  const order: string[] = [];
  const buckets = new Map<string, OperationModel[]>();
  for (const service of model.services) {
    for (const op of service.operations) {
      const key = op.tags[0] ?? '';
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = [];
        buckets.set(key, bucket);
        order.push(key);
      }
      bucket.push(op);
    }
  }

  const used = new Set<string>([anchorStem]);
  const groups: TagGroup[] = [];
  for (const key of order) {
    const base = key === '' ? 'default' : sanitizeTagStem(key);
    let stem = base;
    let n = 2;
    while (used.has(stem)) stem = `${base}-${n++}`;
    used.add(stem);
    groups.push({ stem, operations: buckets.get(key)! });
  }
  return groups;
}

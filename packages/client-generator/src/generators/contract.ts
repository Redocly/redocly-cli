/**
 * The custom-generator contract version: the shape of the IR (`ApiModel`), the
 * `GeneratorInput`, and the authoring helpers a generator is written against.
 *
 * Bump ONLY on a breaking change to any of those (removing/renaming a field,
 * changing semantics) — additive changes keep the number. A generator that
 * declares a different contract is rejected at resolve time with the fix path,
 * so a breaking change surfaces as one clear message instead of silently wrong
 * output. Ejected generators are stamped with the current value at prepare time
 * (see scripts/generate-eject-assets.mjs, which reads this file).
 */
export const GENERATOR_CONTRACT = 1;

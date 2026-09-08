// Neutral option types every generator (any output language) may need to honor.
// They live in the authoring toolkit — not the TypeScript emitters — so a language
// generator can type its plumbing without importing TS-specific modules.

/**
 * How `format: date-time`/`date` string fields are typed:
 * - `'string'` (default): the wire shape — an ISO string.
 * - `'Date'`: the target language's date object (`Date` in TypeScript, `datetime`
 *   in Python, `time.Time` in Go, `DateTimeImmutable` in PHP). The generated
 *   client converts on the wire boundary, so the values match the types.
 */
export type DateType = 'string' | 'Date';

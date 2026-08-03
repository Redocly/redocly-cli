/**
 * How `format: date-time`/`date` string fields are typed:
 * - `'string'` (default): the wire shape — an ISO string.
 * - `'Date'`: a `Date` reference. Opt-in; pair with the `transformers` generator
 *   so the runtime value matches (the client stays zero-dep — `Date` is standard).
 */
export type DateType = 'string' | 'Date';

import type { GeneratedDocument, JsonSchema } from './generator.js';

const MAX_TRACKED_VALUES = 10;
const MIN_ENUM_OBSERVATIONS = 4;
const MAX_ENUM_VALUES = 5;
const MAX_ENUM_VALUE_LENGTH = 30;
const ENUM_VALUE_RE = /^[a-zA-Z][a-zA-Z0-9]*(?:[_\-.][a-zA-Z0-9]+)*$/;
const HEXISH_RE = /^[0-9a-f-]{8,}$/i;

const FORMAT_MATCHERS: [string, RegExp][] = [
  ['uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i],
  ['date-time', /^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[Zz]|[+-]\d{2}:\d{2})$/],
  ['date', /^\d{4}-\d{2}-\d{2}$/],
  ['email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/],
  ['uri', /^https?:\/\/\S+$/],
  ['ipv4', /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/],
];

export type StringObservations = {
  /** Formats every observed value matched so far, in detection priority order. */
  formats: string[];
  /** Distinct observed values; emptied once `overflow` is set. */
  values: string[];
  count: number;
  overflow: boolean;
};

/**
 * Observations live outside the schema nodes so they never leak into the
 * serialized document; merge paths and node copies must propagate them
 * explicitly via mergeObservations/copyObservations.
 */
const observationsByNode = new WeakMap<JsonSchema, StringObservations>();

export function observeString(value: string): StringObservations {
  return {
    formats: FORMAT_MATCHERS.filter(([, pattern]) => pattern.test(value)).map(([format]) => format),
    values: [value],
    count: 1,
    overflow: false,
  };
}

export function mergeObservations(
  a: StringObservations | undefined,
  b: StringObservations | undefined
): StringObservations | undefined {
  if (!a) return b;
  if (!b) return a;

  const merged: StringObservations = {
    formats: a.formats.filter((format) => b.formats.includes(format)),
    values: [],
    count: a.count + b.count,
    overflow: a.overflow || b.overflow,
  };
  if (!merged.overflow) {
    const values = [...a.values];
    for (const value of b.values) {
      if (!values.includes(value)) {
        values.push(value);
      }
    }
    if (values.length > MAX_TRACKED_VALUES) {
      merged.overflow = true;
    } else {
      merged.values = values;
    }
  }
  return merged;
}

export function setObservations(schema: JsonSchema, observations: StringObservations): void {
  observationsByNode.set(schema, observations);
}

export function getObservations(schema: JsonSchema): StringObservations | undefined {
  return observationsByNode.get(schema);
}

export function copyObservations(source: JsonSchema, target: JsonSchema): void {
  const observations = observationsByNode.get(source);
  if (observations) {
    observationsByNode.set(target, observations);
  }
}

function isEnumLikeValue(value: string): boolean {
  return (
    value.length <= MAX_ENUM_VALUE_LENGTH && !HEXISH_RE.test(value) && ENUM_VALUE_RE.test(value)
  );
}

export function distillObservations(
  observations: StringObservations,
  allowEnum: boolean
): Pick<JsonSchema, 'format' | 'enum'> {
  if (observations.formats.length > 0) {
    return { format: observations.formats[0] };
  }
  if (
    allowEnum &&
    !observations.overflow &&
    observations.count >= MIN_ENUM_OBSERVATIONS &&
    observations.values.length > 0 &&
    observations.values.length <= MAX_ENUM_VALUES &&
    observations.values.length * 2 <= observations.count &&
    observations.values.every(isEnumLikeValue)
  ) {
    return { enum: [...observations.values].sort() };
  }
  return {};
}

function applyToSchema(schema: JsonSchema): void {
  const observations = observationsByNode.get(schema);
  if (observations) {
    const types = typeof schema.type === 'string' ? [schema.type] : (schema.type ?? []);
    if (types.includes('string')) {
      Object.assign(schema, distillObservations(observations, types.length === 1));
    }
  }
  for (const property of Object.values(schema.properties ?? {})) {
    applyToSchema(property);
  }
  if (schema.additionalProperties) {
    applyToSchema(schema.additionalProperties);
  }
  if (schema.items) {
    applyToSchema(schema.items);
  }
  for (const member of schema.oneOf ?? []) {
    applyToSchema(member);
  }
}

/**
 * Turn the string values observed in the traffic into `format` and `enum`
 * constraints. Runs after component extraction so that a component pools the
 * evidence from every operation it was observed in.
 */
export function applyValueInference(document: GeneratedDocument): GeneratedDocument {
  for (const pathItem of Object.values(document.paths)) {
    for (const operation of Object.values(pathItem)) {
      for (const media of Object.values(operation.requestBody?.content ?? {})) {
        applyToSchema(media.schema);
      }
      for (const response of Object.values(operation.responses)) {
        for (const media of Object.values(response.content ?? {})) {
          applyToSchema(media.schema);
        }
      }
    }
  }
  for (const schema of Object.values(document.components?.schemas ?? {})) {
    applyToSchema(schema);
  }
  return document;
}

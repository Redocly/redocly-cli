// generate-client telemetry collectors. Two hard rules (documented on the
// telemetry docs page): user code contents, paths, and generator names are never
// transmitted — only the names of OUR exported helpers a custom generator imports,
// counts, and coarse error categories. Everything rides the REDOCLY_TELEMETRY opt-out.

export type GenerateClientTelemetry = {
  generate_client_builtin_generators?: string[];
  generate_client_custom_generators_count?: number;
  generate_client_toolkit_imports?: string[];
  generate_client_error_category?: string;
  /** Ejected built-ins in the run, as `<name>@<ejected-from-version>` (from OUR provenance header). */
  generate_client_ejected_generators?: string[];
};

/** Populated by handleGenerateClient; spread into the telemetry payload by the wrapper. */
export const generateClientTelemetry: GenerateClientTelemetry = {};

/** Allowlist for the builtin-usage event — anything not here is counted, never named. */
export const BUILTIN_GENERATOR_NAMES = new Set([
  'sdk',
  'zod',
  'tanstack-query',
  'tanstack-query-vue',
  'tanstack-query-svelte',
  'tanstack-query-solid',
  'swr',
  'transformers',
  'mock',
  'cli',
  'python',
  'go',
  'php',
]);

const IMPORT_RE =
  /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*['"]@redocly\/client-generator(?:\/generate)?['"]/g;

/** Names of OUR exports found in an import from '@redocly/client-generator[/generate]'. */
export function collectToolkitImports(source: string, knownHelpers: readonly string[]): string[] {
  const known = new Set(knownHelpers);
  const found = new Set<string>();
  for (const match of source.matchAll(IMPORT_RE)) {
    for (const raw of match[1].split(',')) {
      const name = raw
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)[0]
        .trim();
      if (known.has(name)) found.add(name);
    }
  }
  return [...found];
}

const PROVENANCE_RE =
  /^\/\/ Ejected from @redocly\/client-generator@([\w.-]+) — the built-in "([a-z-]+)" generator\./;

/**
 * The `<name>`/`<version>` from OUR eject provenance header, when the file carries one
 * and the name is allowlisted — an ejected generator's origin, never user-authored text.
 */
export function parseEjectedProvenance(
  source: string
): { name: string; version: string } | undefined {
  const match = source.match(PROVENANCE_RE);
  if (!match || !BUILTIN_GENERATOR_NAMES.has(match[2])) return undefined;
  return { name: match[2], version: match[1] };
}

/** Coarse category from an error message — never the message itself. */
export function categorizeGenerateClientError(message: string): string {
  if (message.includes('Invalid pagination configuration')) return 'pagination';
  if (message.includes('Could not load generator')) return 'generator-load';
  if (/^Generator "[^"]+" failed:/.test(message)) return 'generator-run';
  if (message.includes('Unknown generator') || message.includes('does not support')) {
    return 'not-supported';
  }
  return 'other';
}

export type EjectGeneratorTelemetry = {
  /** 'eject' | 'update' | 'guidance' | 'architect'. */
  eject_generator_action?: string;
  /** Allowlisted built-in name only; architect and unknown names stay unnamed. */
  eject_generator_name?: string;
  /** Coarse outcome: success | conflicts | already-exists | missing-pristine | merge-tool-missing | unknown-generator | builtin-name | invalid-name. */
  eject_generator_outcome?: string;
  eject_generator_conflicts?: number;
};

/** Populated by the eject/architect handlers; spread into the telemetry payload by the wrapper. */
export const ejectGeneratorTelemetry: EjectGeneratorTelemetry = {};

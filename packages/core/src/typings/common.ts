export interface StatsRow {
  metric: string;
  total: number;
  color: 'red' | 'yellow' | 'green' | 'white' | 'magenta' | 'cyan';
  items?: Set<string>;
  counts?: Record<string, number>;
}

export type OASStatsName =
  | 'operations'
  | 'refs'
  | 'tags'
  | 'externalDocs'
  | 'pathItems'
  | 'links'
  | 'schemas'
  | 'webhooks'
  | 'parameters'
  | 'xExtensions';

export type AsyncAPIStatsName =
  | 'operations'
  | 'refs'
  | 'tags'
  | 'externalDocs'
  | 'channels'
  | 'schemas'
  | 'parameters'
  | 'xExtensions';

export type StatsName = OASStatsName | AsyncAPIStatsName;
export type OASStatsAccumulator = Record<OASStatsName, StatsRow>;
export type AsyncAPIStatsAccumulator = Record<AsyncAPIStatsName, StatsRow>;
export type StatsAccumulator = OASStatsAccumulator | AsyncAPIStatsAccumulator;

// Per `x-` extension: usage count, and a bounded sample of property names → property values.
export type VendorExtension = { count: number; props: Record<string, Set<string>> };
export type SpecVendorExtensionsAccumulator = Record<string, VendorExtension>;

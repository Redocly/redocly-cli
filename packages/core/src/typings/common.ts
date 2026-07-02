export interface StatsRow {
  metric: string;
  total: number;
  color: 'red' | 'yellow' | 'green' | 'white' | 'magenta' | 'cyan';
  items?: Set<string>;
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
  | 'parameters';

export type AsyncAPIStatsName =
  | 'operations'
  | 'refs'
  | 'tags'
  | 'externalDocs'
  | 'channels'
  | 'schemas'
  | 'parameters';

export type StatsName = OASStatsName | AsyncAPIStatsName;
export type OASStatsAccumulator = Record<OASStatsName, StatsRow>;
export type AsyncAPIStatsAccumulator = Record<AsyncAPIStatsName, StatsRow>;
export type StatsAccumulator = OASStatsAccumulator | AsyncAPIStatsAccumulator;

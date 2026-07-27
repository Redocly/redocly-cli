import type { TrafficFormat, TrafficParser } from '../types/index.js';
import { readProbe } from '../utils/files.js';
import { HarTrafficParser } from './har.js';
import { KongTrafficParser } from './kong.js';
import { NdjsonTrafficParser } from './ndjson.js';
import { ApacheJsonTrafficParser, NginxJsonTrafficParser } from './webserver-json.js';

const PARSERS: TrafficParser[] = [
  new HarTrafficParser(),
  new KongTrafficParser(),
  new NginxJsonTrafficParser(),
  new ApacheJsonTrafficParser(),
  new NdjsonTrafficParser(),
];

export async function selectTrafficParser(
  filePath: string,
  format: TrafficFormat
): Promise<TrafficParser | undefined> {
  if (format !== 'auto') {
    const parser = PARSERS.find((candidate) => candidate.id === format);
    if (!parser) {
      throw new Error(`Unsupported parser format: ${format}`);
    }
    return parser;
  }

  const probe = await readProbe(filePath);
  return PARSERS.find((candidate) => candidate.canParse(filePath, probe));
}

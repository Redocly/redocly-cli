import path from 'node:path';
import { pathToFileURL } from 'node:url';

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

function normalizeParserExport(value: unknown): TrafficParser[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value as TrafficParser[];
  }

  return [value as TrafficParser];
}

export async function loadTrafficParsers(modulePaths: string[]): Promise<TrafficParser[]> {
  const parsers: TrafficParser[] = [];

  for (const modulePath of modulePaths) {
    const absolutePath = path.resolve(process.cwd(), modulePath);
    const moduleUrl = pathToFileURL(absolutePath).toString();
    const loadedModule = await import(moduleUrl);

    const exportedParsers = normalizeParserExport(
      loadedModule.default ?? loadedModule.parsers ?? loadedModule.parser
    );

    if (exportedParsers.length === 0) {
      throw new Error(`Traffic parser module "${modulePath}" does not export a parser.`);
    }

    parsers.push(...exportedParsers);
  }

  for (const parser of parsers) {
    if (
      !parser ||
      typeof parser.id !== 'string' ||
      typeof parser.canParse !== 'function' ||
      typeof parser.parse !== 'function'
    ) {
      throw new Error('Invalid traffic parser plugin. Expected { id, canParse, parse }.');
    }
  }

  return parsers;
}

export async function selectTrafficParser(
  filePath: string,
  format: TrafficFormat,
  externalParsers: TrafficParser[] = []
): Promise<TrafficParser | undefined> {
  const parserPool = [...externalParsers, ...PARSERS];

  if (format !== 'auto') {
    const parser = parserPool.find((candidate) => candidate.id === format);
    if (!parser) {
      throw new Error(`Unsupported parser format: ${format}`);
    }
    return parser;
  }

  const probe = await readProbe(filePath);
  return parserPool.find((candidate) => candidate.canParse(filePath, probe));
}

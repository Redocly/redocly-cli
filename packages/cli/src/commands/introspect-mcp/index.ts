import { isPlainObject, logger, parseYaml, stringifyYaml } from '@redocly/openapi-core';
import { blue, gray, yellow } from 'colorette';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { AbortFlowError, exitWithError } from '../../utils/error.js';
import { type CommandArgs } from '../../wrapper.js';
import { describeXMcpChanges } from './check.js';
import { introspectMcpServer, type McpTarget } from './introspect.js';
import { updateDescription } from './update-description.js';

export type IntrospectMcpCommandArgv = {
  'server-url'?: string;
  command?: string;
  output: string;
  header?: string[];
  check: boolean;
  config?: string;
};

function parseHeaders(rawHeaders: string[] = []): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const rawHeader of rawHeaders) {
    const separatorIndex = rawHeader.indexOf(':');
    if (separatorIndex === -1) {
      exitWithError(`Invalid header "${rawHeader}". Use the "Name: value" format.`);
    }
    const name = rawHeader.slice(0, separatorIndex).trim();
    const value = rawHeader.slice(separatorIndex + 1).trim();
    if (!name || !value) {
      exitWithError(`Invalid header "${rawHeader}". Use the "Name: value" format.`);
    }
    headers[name] = value;
  }
  return headers;
}

// Split a command line on whitespace, keeping segments in single or double quotes together,
// so paths and arguments with spaces survive. The command is spawned directly - no shell.
function splitCommand(rawCommand: string): string[] {
  const commandParts: string[] = [];
  let currentPart = '';
  let openQuote: '"' | "'" | undefined;
  let partStarted = false;
  for (const character of rawCommand) {
    if (openQuote) {
      if (character === openQuote) {
        openQuote = undefined;
      } else {
        currentPart += character;
      }
    } else if (character === '"' || character === "'") {
      openQuote = character;
      partStarted = true;
    } else if (/\s/.test(character)) {
      if (partStarted || currentPart) {
        commandParts.push(currentPart);
        currentPart = '';
        partStarted = false;
      }
    } else {
      currentPart += character;
    }
  }
  if (openQuote) {
    exitWithError(`Unclosed ${openQuote} quote in --command.`);
  }
  if (partStarted || currentPart) {
    commandParts.push(currentPart);
  }
  return commandParts;
}

function resolveTarget(argv: IntrospectMcpCommandArgv): McpTarget {
  if (argv.command) {
    const [command, ...args] = splitCommand(argv.command);
    if (!command) {
      exitWithError('The --command option cannot be empty.');
    }
    return { kind: 'stdio', command, args };
  }
  let url: URL;
  try {
    url = new URL(argv['server-url'] ?? '');
  } catch {
    exitWithError(`Invalid MCP server URL: ${argv['server-url']}.`);
  }
  return { kind: 'http', url, headers: parseHeaders(argv.header) };
}

export async function handleIntrospectMcp({
  argv,
  version,
}: CommandArgs<IntrospectMcpCommandArgv>) {
  const target = resolveTarget(argv);
  const outputFile = argv.output;

  logger.info(
    gray(
      `\n  Connecting to the MCP server at ${
        target.kind === 'http' ? target.url.href : argv.command
      }... \n`
    )
  );
  const snapshot = await introspectMcpServer(target, version);

  const isNewDocument = !existsSync(outputFile);
  let existingDocument: Record<string, unknown> | undefined;
  if (!isNewDocument) {
    let document: unknown;
    try {
      document = parseYaml(readFileSync(outputFile, 'utf-8'));
    } catch (error) {
      exitWithError(
        `Failed to parse ${outputFile}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    if (!isPlainObject(document)) {
      exitWithError(`Expected ${outputFile} to contain an OpenAPI description object.`);
    }
    existingDocument = document;
  }

  const serverUrl = target.kind === 'http' ? argv['server-url'] : undefined;

  if (argv.check) {
    if (!existingDocument) {
      exitWithError(
        `Cannot check ${outputFile} - the file does not exist. Run the command without --check to create it.`
      );
    }
    const updatedDocument = updateDescription(
      structuredClone(existingDocument),
      snapshot,
      serverUrl
    );
    const changes = describeXMcpChanges(existingDocument, updatedDocument);
    if (changes.length === 0) {
      logger.info('\n' + blue(`${yellow(outputFile)} is up to date with the MCP server.`) + '\n');
      return;
    }
    logger.error(`\n${outputFile} is out of date with the MCP server:\n`);
    for (const change of changes) {
      logger.error(`  - ${change}\n`);
    }
    logger.error('\nRun the command without --check to update it.\n');
    throw new AbortFlowError();
  }

  const openapiDocument = updateDescription(existingDocument, snapshot, serverUrl);

  const content = outputFile.endsWith('.json')
    ? JSON.stringify(openapiDocument, null, 2) + '\n'
    : stringifyYaml(openapiDocument);
  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, content);

  logger.info(
    `Recorded ${snapshot.tools.length} tool(s), ${snapshot.prompts.length} prompt(s), and ${snapshot.resources.length} resource(s).\n`
  );
  logger.info(
    '\n' +
      blue(
        `${isNewDocument ? 'Created' : 'Updated'} ${yellow(outputFile)} with the MCP server capabilities in the x-mcp extension.`
      ) +
      '\n'
  );
  if (isNewDocument) {
    logger.warn(`The info section of ${outputFile} is scaffolded - review and complete it.\n`);
  }
}

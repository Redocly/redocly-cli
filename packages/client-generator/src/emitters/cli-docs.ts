// The cli-docs emitter: renders the Markdown reference for the generated CLI from the
// SAME command table `runCli` dispatches on, and the same `groupSlug`/`envPrefix` the
// runtime addresses groups and reads credentials with. A second model would drift from
// the tool the first time either side changed.

import { Printer } from '../authoring/printer.js';
import { envPrefix, groupSlug, type CliCommand, type CliFlag } from '../runtime/cli.js';

export type CliDocsOptions = {
  /** Page heading. */
  title: string;
  /** Emit YAML front matter carrying the title, for docs sites that expect it. */
  frontmatter: boolean;
  /** The command name the CLI prints and derives its credential variables from. */
  binName: string;
  /** Auth schemes the description declares, in the order the CLI resolves them. */
  schemes: Array<{ key: string; kind: 'bearer' | 'basic' | 'apiKey' }>;
};

/** Table-cell-safe text: one line, and pipes escaped so they don't open a column. */
function cell(text: string | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim().replace(/\|/g, '\\|');
}

/** How a command is typed at the prompt: `<group-slug> <name>`, or just `<name>`. */
function address(command: CliCommand): string {
  return [command.group === undefined ? undefined : groupSlug(command.group), command.name]
    .filter(Boolean)
    .join(' ');
}

function usageLine(binName: string, command: CliCommand): string {
  const words = [
    binName,
    address(command),
    ...command.positionals.map((positional) => `<${positional.name}>`),
    ...command.flags.filter((flag) => flag.required).map((flag) => `--${flag.name} <${flag.type}>`),
    ...(command.body ? [command.body.required ? "--json '<json>'" : "[--json '<json>']"] : []),
  ];
  return words.filter((word) => word !== '').join(' ');
}

function writeFlagTable(printer: Printer, flags: CliFlag[]): void {
  printer.line('| Flag | Type | Required | Description |');
  printer.line('| ---- | ---- | -------- | ----------- |');
  for (const flag of flags) {
    const description = [
      cell(flag.description),
      flag.enum === undefined
        ? ''
        : `One of ${flag.enum.map((value) => `\`${value}\``).join(', ')}.`,
      flag.type === 'array' ? 'Repeat the flag for multiple values.' : '',
    ]
      .filter((part) => part !== '')
      .join(' ');
    printer.line(
      `| \`--${flag.name}\` | ${flag.type} | ${flag.required ? 'yes' : 'no'} | ${description} |`
    );
  }
  printer.blank();
}

function writeCommand(printer: Printer, command: CliCommand, options: CliDocsOptions): void {
  printer.line(`### \`${address(command)}\``);
  printer.blank();
  if (command.summary !== undefined) {
    printer.line(cell(command.summary));
    printer.blank();
  }
  printer.line(`\`${command.method} ${command.path}\``);
  printer.blank();
  printer.line('```sh');
  printer.line(usageLine(options.binName, command));
  printer.line('```');
  printer.blank();
  if (command.positionals.length > 0) {
    printer.line('| Argument | Description |');
    printer.line('| -------- | ----------- |');
    for (const positional of command.positionals) {
      printer.line(`| \`<${positional.name}>\` | ${cell(positional.description)} |`);
    }
    printer.blank();
  }
  if (command.flags.length > 0) writeFlagTable(printer, command.flags);
  const notes = [
    command.body === undefined
      ? ''
      : `Takes a JSON body${command.body.required ? ' (required)' : ''}: \`--json '<json>'\`, \`--json @file.json\`, or \`--json @-\` for stdin.`,
    command.paginated === true
      ? 'Paginated: `--page-all` follows every page, printing one JSON page per line.'
      : '',
    command.sse === true ? 'Streams server-sent events as one JSON object per line.' : '',
    command.blob === true ? 'Returns binary content, so `--output <path>` is required.' : '',
  ].filter((note) => note !== '');
  for (const note of notes) printer.line(note);
  if (notes.length > 0) printer.blank();
}

/** The whole page: heading, global flags, credentials, exit codes, then every command. */
export function renderCliDocs(commands: CliCommand[], options: CliDocsOptions): string {
  const printer = new Printer();
  if (options.frontmatter) {
    printer.line('---');
    printer.line(`title: ${options.title}`);
    printer.line('---');
    printer.blank();
  }
  printer.line(`# ${options.title}`);
  printer.blank();
  printer.line(
    `Generated command-line reference for \`${options.binName}\`, produced from the API description by \`redocly generate-client\`.`
  );
  printer.line('Re-run generation to update it — this file is not hand-edited.');
  printer.blank();

  printer.line('## Usage');
  printer.blank();
  printer.line('```sh');
  printer.line(`${options.binName} <command> [flags]`);
  printer.line(`${options.binName} --help`);
  printer.line(`${options.binName} schema <command>   # request/response schemas`);
  printer.line('```');
  printer.blank();

  printer.line('## Global flags');
  printer.blank();
  printer.line('| Flag | Description |');
  printer.line('| ---- | ----------- |');
  for (const [flag, description] of [
    ['--server-url <url>', 'Override the server URL included in the client.'],
    ['--format <json\\|ndjson>', 'Output format.'],
    ['--dry-run', 'Print the prepared request, credentials redacted, without sending it.'],
    ['--page-all', 'Follow pagination, printing one JSON page per line.'],
    ['--output <path>', 'Write the response body to a file. Required for binary responses.'],
    ['--token <token>', 'Bearer token, overriding the environment.'],
    ['--json <json\\|@file\\|@->', 'Request body, inline or from a file or stdin.'],
  ] as const) {
    printer.line(`| \`${flag}\` | ${description} |`);
  }
  printer.blank();

  const prefix = envPrefix(options.binName);
  printer.line('## Credentials');
  printer.blank();
  if (options.schemes.length === 0) {
    printer.line('The description declares no security schemes, so no credentials are read.');
  } else {
    printer.line('Credentials come from the environment:');
    printer.blank();
    printer.line('| Scheme | Variable |');
    printer.line('| ------ | -------- |');
    for (const scheme of options.schemes) {
      const variable =
        scheme.kind === 'bearer'
          ? `\`${prefix}_TOKEN\` (or \`--token\`)`
          : scheme.kind === 'basic'
            ? `\`${prefix}_USERNAME\` and \`${prefix}_PASSWORD\``
            : `\`${prefix}_API_KEY_${envPrefix(scheme.key)}\``;
      printer.line(`| ${scheme.kind} (\`${scheme.key}\`) | ${variable} |`);
    }
  }
  printer.blank();

  printer.line('## Exit codes');
  printer.blank();
  printer.line('| Code | Meaning |');
  printer.line('| ---- | ------- |');
  for (const [code, meaning] of [
    [0, 'success'],
    [1, 'API error (status other than 401 or 403)'],
    [2, 'auth error (401 or 403)'],
    [3, 'validation error'],
    [4, 'usage error (unknown command or flag, bad `--json`)'],
  ] as const) {
    printer.line(`| ${code} | ${meaning} |`);
  }
  printer.blank();
  printer.line('Errors print one JSON object to stderr, so stdout stays clean for piping.');
  printer.blank();

  // One section per tag, in the order the description declares them, then the untagged
  // commands — the same order `--help` lists them in.
  const groups = [...new Set(commands.map((command) => command.group))];
  for (const group of groups) {
    const inGroup = commands.filter((command) => command.group === group);
    if (group === undefined) {
      printer.line('## Commands');
      printer.blank();
    } else {
      printer.line(`## ${group}`);
      printer.blank();
      printer.line(`Addressed as \`${options.binName} ${groupSlug(group)} <command>\`.`);
      printer.blank();
    }
    for (const command of inGroup) writeCommand(printer, command, options);
  }
  return (
    printer
      .toString()
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd() + '\n'
  );
}

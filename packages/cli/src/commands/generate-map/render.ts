import type { ApiMap } from './build.js';

export function renderApiMap(map: ApiMap): string {
  // Pass one: lay out the body and remember where each group's `##` heading lands,
  // as an offset from the body's first line.
  const body: string[] = ['== operations'];
  const groupOffsets: {
    name: string;
    count: number;
    summary?: string;
    start: number;
    end: number;
  }[] = [];
  for (const group of map.groups) {
    if (body.length > 1) body.push('');
    const start = body.length;
    body.push(`## ${group.name}`, ...group.rows);
    groupOffsets.push({
      name: group.name,
      count: group.rows.length,
      summary: group.summary,
      start,
      end: body.length - 1,
    });
  }
  if (map.webhooks.length > 0) body.push('', '== webhooks', ...map.webhooks);

  // Pass two: the prefix length is now fixed, so toc ranges become absolute line numbers.
  const prefix: string[] = [`# ${map.headline}`, ...map.legend.map((line) => `# ${line}`)];
  if (map.servers !== undefined) prefix.push(`servers: ${map.servers}`);
  if (map.security.length > 0) prefix.push('', '== security', ...map.security);
  prefix.push('', '== toc');
  const bodyFirstLine = prefix.length + groupOffsets.length + 2; // toc rows + blank + body start, 1-based

  for (const group of groupOffsets) {
    const summary = group.summary === undefined ? '' : ` — ${group.summary}`;
    prefix.push(
      `${group.name} (${group.count}) L${bodyFirstLine + group.start}-${bodyFirstLine + group.end}${summary}`
    );
  }
  prefix.push('');

  return [...prefix, ...body].join('\n') + '\n';
}

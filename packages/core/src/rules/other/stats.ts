import { isRef } from '../../ref-utils.js';
import type {
  AsyncAPIStatsAccumulator,
  OASStatsAccumulator,
  StatsAccumulator,
  StatsRow,
} from '../../typings/common.js';
import type {
  Oas3Link,
  Oas3Operation,
  Oas3Parameter,
  Oas3Tag,
  Oas3_2Tag,
  OasRef,
} from '../../typings/openapi.js';
import type { Oas2Parameter } from '../../typings/swagger.js';
import type { UserContext } from '../../walk.js';

function countExtension(row: StatsRow, ctx: UserContext) {
  if (isRef(ctx.parent)) return;
  const extensionName = ctx.key.toString();
  const counts = (row.counts ??= {});
  counts[extensionName] = (counts[extensionName] ?? 0) + 1;
}

function finalizeStats(statsAccumulator: StatsAccumulator) {
  for (const row of Object.values(statsAccumulator)) {
    if (row.items) {
      row.total = row.items.size;
    }
  }
  const { xExtensions } = statsAccumulator;
  const counts = xExtensions.counts ?? {};
  const extensionNames = Object.keys(counts).sort();
  xExtensions.total = extensionNames.length;
  xExtensions.counts = Object.fromEntries(extensionNames.map((name) => [name, counts[name]]));
}

export const StatsOAS = (statsAccumulator: OASStatsAccumulator) => {
  return {
    SpecExtension: {
      enter(_node: unknown, ctx: UserContext) {
        countExtension(statsAccumulator.xExtensions, ctx);
      },
    },
    XCodeSampleList: {
      enter(_node: unknown, ctx: UserContext) {
        countExtension(statsAccumulator.xExtensions, ctx);
      },
    },
    ExamplesMap: {
      enter(_node: unknown, ctx: UserContext) {
        if (ctx.key.toString().startsWith('x-')) {
          countExtension(statsAccumulator.xExtensions, ctx);
        }
      },
    },
    EnumDescriptions: {
      enter(_node: unknown, ctx: UserContext) {
        countExtension(statsAccumulator.xExtensions, ctx);
      },
    },
    TagGroups: {
      enter(_node: unknown, ctx: UserContext) {
        countExtension(statsAccumulator.xExtensions, ctx);
      },
    },
    Logo: {
      enter(_node: unknown, ctx: UserContext) {
        countExtension(statsAccumulator.xExtensions, ctx);
      },
    },
    XServerList: {
      enter(_node: unknown, ctx: UserContext) {
        countExtension(statsAccumulator.xExtensions, ctx);
      },
    },
    XUsePkce: {
      enter(_node: unknown, ctx: UserContext) {
        countExtension(statsAccumulator.xExtensions, ctx);
      },
    },
    Operation: {
      enter(_node: unknown, ctx: UserContext) {
        if (ctx.key.toString().startsWith('x-')) {
          countExtension(statsAccumulator.xExtensions, ctx);
        }
      },
    },
    ExternalDocs: {
      leave() {
        statsAccumulator.externalDocs.total++;
      },
    },
    ref: {
      enter(ref: OasRef) {
        statsAccumulator.refs.items!.add(ref['$ref']);
      },
    },
    Tag: {
      leave(tag: Oas3Tag | Oas3_2Tag) {
        statsAccumulator.tags.items!.add(tag.name);
      },
    },
    Link: {
      leave(link: Oas3Link) {
        statsAccumulator.links.items!.add(link.operationId!);
      },
    },
    WebhooksMap: {
      enter(_node: unknown, ctx: UserContext) {
        if (ctx.key.toString().startsWith('x-')) {
          countExtension(statsAccumulator.xExtensions, ctx);
        }
      },
      Operation: {
        leave(operation: Oas3Operation) {
          statsAccumulator.webhooks.total++;
          if (operation.tags) {
            for (const tag of operation.tags) {
              statsAccumulator.tags.items!.add(tag);
            }
          }
        },
      },
    },
    Paths: {
      PathItem: {
        leave() {
          statsAccumulator.pathItems.total++;
        },
        Operation: {
          leave(operation: Oas3Operation) {
            statsAccumulator.operations.total++;
            if (operation.tags) {
              for (const tag of operation.tags) {
                statsAccumulator.tags.items!.add(tag);
              }
            }
          },
        },
        Parameter: {
          leave(parameter: Oas2Parameter | Oas3Parameter) {
            statsAccumulator.parameters.items!.add(parameter.name);
          },
        },
      },
    },
    NamedSchemas: {
      Schema: {
        leave() {
          statsAccumulator.schemas.total++;
        },
      },
    },
    Root: {
      leave() {
        finalizeStats(statsAccumulator);
      },
    },
  };
};

export const StatsAsync2 = (statsAccumulator: AsyncAPIStatsAccumulator) => {
  return {
    SpecExtension: {
      enter(_node: unknown, ctx: UserContext) {
        countExtension(statsAccumulator.xExtensions, ctx);
      },
    },
    ExternalDocs: {
      leave() {
        statsAccumulator.externalDocs.total++;
      },
    },
    ref: {
      enter(ref: OasRef) {
        statsAccumulator.refs.items!.add(ref['$ref']);
      },
    },
    Tag: {
      leave(tag: Oas3Tag) {
        statsAccumulator.tags.items!.add(tag.name);
      },
    },
    ChannelMap: {
      Channel: {
        leave() {
          statsAccumulator.channels.total++;
        },
        Operation: {
          leave(operation: any) {
            statsAccumulator.operations.total++;
            if (operation.tags) {
              for (const tag of operation.tags) {
                statsAccumulator.tags.items!.add(tag);
              }
            }
          },
        },
        Parameter: {
          leave(_: unknown, { key }: UserContext) {
            statsAccumulator.parameters.items!.add(key.toString());
          },
        },
      },
    },
    NamedSchemas: {
      Schema: {
        leave() {
          statsAccumulator.schemas.total++;
        },
      },
    },
    Root: {
      leave() {
        finalizeStats(statsAccumulator);
      },
    },
  };
};

export const StatsAsync3 = (statsAccumulator: AsyncAPIStatsAccumulator) => {
  return {
    SpecExtension: {
      enter(_node: unknown, ctx: UserContext) {
        countExtension(statsAccumulator.xExtensions, ctx);
      },
    },
    ExternalDocs: {
      leave() {
        statsAccumulator.externalDocs.total++;
      },
    },
    ref: {
      enter(ref: OasRef) {
        statsAccumulator.refs.items!.add(ref['$ref']);
      },
    },
    Tag: {
      leave(tag: Oas3Tag) {
        statsAccumulator.tags.items!.add(tag.name);
      },
    },
    NamedChannels: {
      Channel: {
        leave() {
          statsAccumulator.channels.total++;
        },
        Parameter: {
          leave(_: unknown, { key }: UserContext) {
            statsAccumulator.parameters.items!.add(key.toString());
          },
        },
      },
    },
    NamedOperations: {
      Operation: {
        leave(operation: any) {
          statsAccumulator.operations.total++;
          if (operation.tags) {
            for (const tag of operation.tags) {
              statsAccumulator.tags.items!.add(tag);
            }
          }
        },
      },
    },
    NamedSchemas: {
      Schema: {
        leave() {
          statsAccumulator.schemas.total++;
        },
      },
    },
    Root: {
      leave() {
        finalizeStats(statsAccumulator);
      },
    },
  };
};

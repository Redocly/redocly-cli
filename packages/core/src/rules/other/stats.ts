import type {
  OASStatsAccumulator,
  AsyncAPIStatsAccumulator,
  SpecVendorExtensionsAccumulator,
  StatsAccumulator,
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
import { collectSpecExtension } from '../../utils/spec-extensions.js';
import type { UserContext } from '../../walk.js';

function finalizeStats(
  statsAccumulator: StatsAccumulator,
  extensions: SpecVendorExtensionsAccumulator
) {
  for (const row of Object.values(statsAccumulator)) {
    if (row.items) {
      row.total = row.items.size;
    }
  }
  const extensionNames = Object.keys(extensions).sort();
  statsAccumulator.xExtensions.total = extensionNames.length;
  statsAccumulator.xExtensions.details = Object.fromEntries(
    extensionNames.map((name) => [name, extensions[name]])
  );
}

export const StatsOAS = (statsAccumulator: OASStatsAccumulator) => {
  const extensions: SpecVendorExtensionsAccumulator = {};

  return {
    SpecExtension: {
      enter(node: unknown, ctx: UserContext) {
        collectSpecExtension(extensions, ctx.key.toString(), node);
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
      enter(node: unknown, ctx: UserContext) {
        if (ctx.key === 'x-webhooks') {
          collectSpecExtension(extensions, 'x-webhooks', node);
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
    Operation: {
      enter(operation: Oas3Operation, ctx: UserContext) {
        if (ctx.key === 'x-query') {
          collectSpecExtension(extensions, 'x-query', operation);
        }
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
        finalizeStats(statsAccumulator, extensions);
      },
    },
  };
};

export const StatsAsync2 = (statsAccumulator: AsyncAPIStatsAccumulator) => {
  const extensions: SpecVendorExtensionsAccumulator = {};

  return {
    SpecExtension: {
      enter(node: unknown, ctx: UserContext) {
        collectSpecExtension(extensions, ctx.key.toString(), node);
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
          leave(parameter: any) {
            if (parameter.name) {
              statsAccumulator.parameters.items!.add(parameter.name);
            }
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
        finalizeStats(statsAccumulator, extensions);
      },
    },
  };
};

export const StatsAsync3 = (statsAccumulator: AsyncAPIStatsAccumulator) => {
  const extensions: SpecVendorExtensionsAccumulator = {};

  return {
    SpecExtension: {
      enter(node: unknown, ctx: UserContext) {
        collectSpecExtension(extensions, ctx.key.toString(), node);
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
          leave(parameter: any) {
            if (parameter.name) {
              statsAccumulator.parameters.items!.add(parameter.name);
            }
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
        finalizeStats(statsAccumulator, extensions);
      },
    },
  };
};

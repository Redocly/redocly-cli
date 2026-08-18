import type { NormalizedNodeType } from '../../types/index.js';
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
import { isPlainObject } from '../../utils/is-plain-object.js';
import type { UserContext } from '../../walk.js';

function countExtensions(row: StatsRow, node: unknown, type: NormalizedNodeType) {
  if (!type.extensionsPrefix || !isPlainObject(node)) return;
  const counts = (row.counts ??= {});
  for (const propName of Object.keys(node)) {
    if (propName.startsWith(type.extensionsPrefix)) {
      counts[propName] = (counts[propName] ?? 0) + 1;
    }
  }
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
    ExternalDocs: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
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
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
      leave(tag: Oas3Tag | Oas3_2Tag) {
        statsAccumulator.tags.items!.add(tag.name);
      },
    },
    Link: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
      leave(link: Oas3Link) {
        statsAccumulator.links.items!.add(link.operationId!);
      },
    },
    WebhooksMap: {
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
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
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
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
      leave() {
        finalizeStats(statsAccumulator);
      },
    },
    AuthorizationCode: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Callback: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    ClientCredentials: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Components: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Contact: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    DeviceAuthorization: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Discriminator: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Encoding: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Example: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Header: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    ImplicitFlow: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Info: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    License: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Logo: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    MediaType: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    OAuth2Flows: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Operation: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Parameter: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    ParameterItems: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    PasswordFlow: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    PathItem: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    RequestBody: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Response: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Responses: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Schema: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Scopes: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    SecurityScheme: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Server: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    ServerVariable: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    TagGroup: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Xml: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
  };
};

export const StatsAsync2 = (statsAccumulator: AsyncAPIStatsAccumulator) => {
  return {
    ExternalDocs: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
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
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
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
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
      leave() {
        finalizeStats(statsAccumulator);
      },
    },
    AuthorizationCode: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Channel: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    ChannelBindings: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    ClientCredentials: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Components: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Contact: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    CorrelationId: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    ImplicitFlow: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Info: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    License: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Message: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    MessageBindings: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    MessageExample: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    MessageTrait: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Operation: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    OperationBindings: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    OperationTrait: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Parameter: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    PasswordFlow: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Schema: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    SecurityScheme: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    SecuritySchemeFlows: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Server: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    ServerBindings: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    ServerVariable: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
  };
};

export const StatsAsync3 = (statsAccumulator: AsyncAPIStatsAccumulator) => {
  return {
    ExternalDocs: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
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
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
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
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
      leave() {
        finalizeStats(statsAccumulator);
      },
    },
    AuthorizationCode: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Channel: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    ChannelBindings: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    ClientCredentials: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Components: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Contact: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    CorrelationId: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    ImplicitFlow: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Info: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    License: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Message: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    MessageBindings: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    MessageExample: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    MessageTrait: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Operation: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    OperationBindings: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    OperationReply: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    OperationReplyAddress: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    OperationTrait: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Parameter: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    PasswordFlow: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Schema: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    SecurityScheme: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    SecuritySchemeFlows: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    Server: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    ServerBindings: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
    ServerVariable: {
      enter(node: unknown, ctx: UserContext) {
        countExtensions(statsAccumulator.xExtensions, node, ctx.type);
      },
    },
  };
};

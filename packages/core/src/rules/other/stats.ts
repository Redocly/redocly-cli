import type { OASStatsAccumulator, AsyncAPIStatsAccumulator } from '../../typings/common.js';
import type { Oas3Parameter, OasRef, Oas3Tag, Oas3_2Tag } from '../../typings/openapi.js';
import type { Oas2Parameter } from '../../typings/swagger.js';

export const StatsOAS = (statsAccumulator: OASStatsAccumulator) => {
  return {
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
      leave(link: any) {
        statsAccumulator.links.items!.add(link.operationId);
      },
    },
    WebhooksMap: {
      Operation: {
        leave(operation: any) {
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
        statsAccumulator.parameters.total = statsAccumulator.parameters.items!.size;
        statsAccumulator.refs.total = statsAccumulator.refs.items!.size;
        statsAccumulator.links.total = statsAccumulator.links.items!.size;
        statsAccumulator.tags.total = statsAccumulator.tags.items!.size;
      },
    },
  };
};

export const StatsAsync2 = (statsAccumulator: AsyncAPIStatsAccumulator) => {
  return {
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
        statsAccumulator.parameters.total = statsAccumulator.parameters.items!.size;
        statsAccumulator.refs.total = statsAccumulator.refs.items!.size;
        statsAccumulator.tags.total = statsAccumulator.tags.items!.size;
      },
    },
  };
};

export const StatsAsync3 = (statsAccumulator: AsyncAPIStatsAccumulator) => {
  return {
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
        statsAccumulator.parameters.total = statsAccumulator.parameters.items!.size;
        statsAccumulator.refs.total = statsAccumulator.refs.items!.size;
        statsAccumulator.tags.total = statsAccumulator.tags.items!.size;
      },
    },
  };
};

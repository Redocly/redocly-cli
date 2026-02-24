import type { Oas3Parameter, OasRef, Oas3Tag, Oas3_2Tag } from '../../typings/openapi.js';
import type { Oas2Parameter } from '../../typings/swagger.js';
import type { StatsAccumulator } from '../../typings/common.js';

// OpenAPI Stats (for OAS 2.x and 3.x)
export const StatsOAS = (statsAccumulator: StatsAccumulator) => {
  return {
    Root: {
      leave() {
        if (statsAccumulator.parameters) {
          statsAccumulator.parameters.total = statsAccumulator.parameters.items!.size;
        }
        if (statsAccumulator.refs) {
          statsAccumulator.refs.total = statsAccumulator.refs.items!.size;
        }
        if (statsAccumulator.links) {
          statsAccumulator.links.total = statsAccumulator.links.items!.size;
        }
        if (statsAccumulator.tags) {
          statsAccumulator.tags.total = statsAccumulator.tags.items!.size;
        }
      },
    },
    ExternalDocs: {
      leave() {
        if (statsAccumulator.externalDocs) {
          statsAccumulator.externalDocs.total++;
        }
      },
    },
    ref: {
      enter(ref: OasRef) {
        statsAccumulator.refs?.items!.add(ref['$ref']);
      },
    },
    Tag: {
      leave(tag: Oas3Tag | Oas3_2Tag) {
        statsAccumulator.tags?.items!.add(tag.name);
      },
    },
    Link: {
      leave(link: any) {
        statsAccumulator.links?.items!.add(link.operationId);
      },
    },
    WebhooksMap: {
      Operation: {
        leave(operation: any) {
          if (statsAccumulator.webhooks) {
            statsAccumulator.webhooks.total++;
          }
          if (operation.tags) {
            for (const tag of operation.tags) {
              statsAccumulator.tags?.items!.add(tag);
            }
          }
        },
      },
    },
    Paths: {
      PathItem: {
        leave() {
          if (statsAccumulator.pathItems) {
            statsAccumulator.pathItems.total++;
          }
        },
        Operation: {
          leave(operation: any) {
            if (statsAccumulator.operations) {
              statsAccumulator.operations.total++;
            }
            if (operation.tags) {
              for (const tag of operation.tags) {
                statsAccumulator.tags?.items!.add(tag);
              }
            }
          },
        },
        Parameter: {
          leave(parameter: Oas2Parameter | Oas3Parameter) {
            statsAccumulator.parameters?.items!.add(parameter.name);
          },
        },
      },
    },
    NamedSchemas: {
      Schema: {
        leave() {
          if (statsAccumulator.schemas) {
            statsAccumulator.schemas.total++;
          }
        },
      },
    },
  };
};

// AsyncAPI 2.x Stats
export const StatsAsync2 = (statsAccumulator: StatsAccumulator) => {
  return {
    Root: {
      leave() {
        if (statsAccumulator.parameters) {
          statsAccumulator.parameters.total = statsAccumulator.parameters.items!.size;
        }
        if (statsAccumulator.refs) {
          statsAccumulator.refs.total = statsAccumulator.refs.items!.size;
        }
        if (statsAccumulator.tags) {
          statsAccumulator.tags.total = statsAccumulator.tags.items!.size;
        }
      },
    },
    ExternalDocs: {
      leave() {
        if (statsAccumulator.externalDocs) {
          statsAccumulator.externalDocs.total++;
        }
      },
    },
    ref: {
      enter(ref: OasRef) {
        statsAccumulator.refs?.items!.add(ref['$ref']);
      },
    },
    Tag: {
      leave(tag: Oas3Tag | Oas3_2Tag) {
        statsAccumulator.tags?.items!.add(tag.name);
      },
    },
    ChannelMap: {
      Channel: {
        leave() {
          if (statsAccumulator.channels) {
            statsAccumulator.channels.total++;
          }
        },
        Operation: {
          leave(operation: any) {
            if (statsAccumulator.operations) {
              statsAccumulator.operations.total++;
            }
            if (operation.tags) {
              for (const tag of operation.tags) {
                statsAccumulator.tags?.items!.add(tag);
              }
            }
          },
        },
        Parameter: {
          leave(parameter: any) {
            if (parameter.name) {
              statsAccumulator.parameters?.items!.add(parameter.name);
            }
          },
        },
      },
    },
    NamedSchemas: {
      Schema: {
        leave() {
          if (statsAccumulator.schemas) {
            statsAccumulator.schemas.total++;
          }
        },
      },
    },
  };
};

// AsyncAPI 3.x Stats
export const StatsAsync3 = (statsAccumulator: StatsAccumulator) => {
  return {
    Root: {
      leave() {
        if (statsAccumulator.parameters) {
          statsAccumulator.parameters.total = statsAccumulator.parameters.items!.size;
        }
        if (statsAccumulator.refs) {
          statsAccumulator.refs.total = statsAccumulator.refs.items!.size;
        }
        if (statsAccumulator.tags) {
          statsAccumulator.tags.total = statsAccumulator.tags.items!.size;
        }
      },
    },
    ExternalDocs: {
      leave() {
        if (statsAccumulator.externalDocs) {
          statsAccumulator.externalDocs.total++;
        }
      },
    },
    ref: {
      enter(ref: OasRef) {
        statsAccumulator.refs?.items!.add(ref['$ref']);
      },
    },
    Tag: {
      leave(tag: Oas3Tag | Oas3_2Tag) {
        statsAccumulator.tags?.items!.add(tag.name);
      },
    },
    NamedChannels: {
      Channel: {
        leave() {
          if (statsAccumulator.channels) {
            statsAccumulator.channels.total++;
          }
        },
        Parameter: {
          leave(parameter: any) {
            if (parameter.name) {
              statsAccumulator.parameters?.items!.add(parameter.name);
            }
          },
        },
      },
    },
    NamedOperations: {
      Operation: {
        leave(operation: any) {
          if (statsAccumulator.operations) {
            statsAccumulator.operations.total++;
          }
          if (operation.tags) {
            for (const tag of operation.tags) {
              statsAccumulator.tags?.items!.add(tag);
            }
          }
        },
      },
    },
    NamedSchemas: {
      Schema: {
        leave() {
          if (statsAccumulator.schemas) {
            statsAccumulator.schemas.total++;
          }
        },
      },
    },
  };
};

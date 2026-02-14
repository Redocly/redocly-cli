import type { StatsAccumulator } from '../../typings/common.js';
import type { Oas3Parameter, OasRef, Oas3Tag, Oas3_2Tag } from '../../typings/openapi.js';
import type { Oas2Parameter } from '../../typings/swagger.js';
import type { SpecVersion } from '../../oas-types.js';

// Common visitor for all specs (refs, tags, externalDocs, links)
const getCommonVisitor = (statsAccumulator: StatsAccumulator) => ({
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
});

// OpenAPI-specific visitor (OAS 2.x and 3.x)
const getOpenApiVisitor = (statsAccumulator: StatsAccumulator) => ({
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
});

// AsyncAPI 2.x-specific visitor
const getAsync2Visitor = (statsAccumulator: StatsAccumulator) => ({
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
});

// AsyncAPI 3.x-specific visitor
const getAsync3Visitor = (statsAccumulator: StatsAccumulator) => ({
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
        // Handle refs in messages array (AsyncAPI 3 specific)
        // Note: The ref visitor may not catch refs in arrays due to walker limitations,
        // so we manually count them here.
        if (Array.isArray(operation.messages)) {
          for (const message of operation.messages) {
            if (message && message.$ref) {
              statsAccumulator.refs.items!.add(message.$ref);
            }
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
});

export const Stats = (statsAccumulator: StatsAccumulator, specVersion?: SpecVersion) => {
  const commonVisitor = getCommonVisitor(statsAccumulator);

  // Select spec-specific visitor based on detected spec
  let specVisitor = {};
  if (specVersion === 'async2') {
    specVisitor = getAsync2Visitor(statsAccumulator);
  } else if (specVersion === 'async3') {
    specVisitor = getAsync3Visitor(statsAccumulator);
  } else {
    // Default to OpenAPI for oas2, oas3_0, oas3_1, oas3_2
    specVisitor = getOpenApiVisitor(statsAccumulator);
  }

  return {
    Root: {
      leave() {
        statsAccumulator.parameters.total = statsAccumulator.parameters.items!.size;
        statsAccumulator.refs.total = statsAccumulator.refs.items!.size;
        statsAccumulator.links.total = statsAccumulator.links.items!.size;
        statsAccumulator.tags.total = statsAccumulator.tags.items!.size;
      },
    },
    ...commonVisitor,
    ...specVisitor,
  };
};

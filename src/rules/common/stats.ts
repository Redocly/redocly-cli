import { Oas3Parameter, OasRef } from '../../typings/openapi';
import { Oas2Parameter } from '../../typings/swagger';
import { StatsCount } from '../../typings/common';

export const makeStatsVisitor = (statsCount: StatsCount) => {
  return {
    ExternalDocs: { leave() { statsCount.externalDocs.total++; }},
    ref: { enter(ref: OasRef) { statsCount.refs.items!.add(ref['$ref']); }},
    Tag: { enter() { statsCount.tags.total++; }},
    Link: { leave(link: any) { statsCount.links.items!.add(link.operationId); }},
    PathMap: {
      leave() {
        statsCount.parameters.total = statsCount.parameters.items!.size;
        statsCount.refs.total = statsCount.refs.items!.size;
        statsCount.links.total = statsCount.links.items!.size;
      },
      PathItem: {
        leave() { statsCount.pathItems.total++; },
        Operation: { leave() { statsCount.operations.total++; }},
        Parameter: { leave(parameter: Oas2Parameter | Oas3Parameter) {
          statsCount.parameters.items!.add(parameter.name)
        }}
      }
    },
    NamedSchemas: {
      Schema: { leave() { statsCount.schemas.total++; }}
    }
  }
}

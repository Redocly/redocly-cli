import { Oas3Parameter, OasRef } from '../../typings/openapi';
import { Oas2Parameter } from '../../typings/swagger';
import { StatsAccumulator } from '../../typings/common';

export const Stats = (statsAccumulator: StatsAccumulator) => {
  return {
    ExternalDocs: { leave() { statsAccumulator.externalDocs.total++; }},
    ref: { enter(ref: OasRef) { statsAccumulator.refs.items!.add(ref['$ref']); }},
    Tag: { enter() { statsAccumulator.tags.total++; }},
    Link: { leave(link: any) { statsAccumulator.links.items!.add(link.operationId); }},
    PathMap: {
      leave() {
        statsAccumulator.parameters.total = statsAccumulator.parameters.items!.size;
        statsAccumulator.refs.total = statsAccumulator.refs.items!.size;
        statsAccumulator.links.total = statsAccumulator.links.items!.size;
      },
      PathItem: {
        leave() { statsAccumulator.pathItems.total++; },
        Operation: { leave() { statsAccumulator.operations.total++; }},
        Parameter: { leave(parameter: Oas2Parameter | Oas3Parameter) {
            statsAccumulator.parameters.items!.add(parameter.name)
        }}
      }
    },
    NamedSchemas: {
      Schema: { leave() { statsAccumulator.schemas.total++; }}
    }
  }
}

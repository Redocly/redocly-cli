import { COMPONENTS } from '../../split/types.js';
import type { AnyOas3Definition, JoinDocumentContext } from '../types.js';
import { addPrefix } from './add-prefix.js';

export function collectComponents({
  joinedDef,
  openapi,
  context,
}: {
  joinedDef: any;
  openapi: AnyOas3Definition;
  context: JoinDocumentContext;
}) {
  const { api, potentialConflicts, componentsPrefix } = context;
  const { components } = openapi;
  if (components) {
    if (!joinedDef.hasOwnProperty(COMPONENTS)) {
      joinedDef[COMPONENTS] = {};
    }
    for (const [component, componentObj] of Object.entries(components)) {
      if (!potentialConflicts[COMPONENTS].hasOwnProperty(component)) {
        potentialConflicts[COMPONENTS][component] = {};
        joinedDef[COMPONENTS][component] = {};
      }
      for (const item of Object.keys(componentObj)) {
        const componentPrefix = addPrefix(item, componentsPrefix!);
        potentialConflicts.components[component][componentPrefix] = [
          ...(potentialConflicts.components[component][item] || []),
          { [api]: componentObj[item] },
        ];
        joinedDef.components[component][componentPrefix] = componentObj[item];
      }
    }
  }
}

import * as path from 'node:path';

import { addPrefix } from './add-prefix.js';

export function addComponentsPrefix(description: string, componentsPrefix: string) {
  return description.replace(/"(#\/components\/.*?)"/g, (match) => {
    const componentName = path.basename(match);
    return match.replace(componentName, addPrefix(componentName, componentsPrefix));
  });
}

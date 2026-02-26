import { isRef, isPlainObject } from '@redocly/openapi-core';
import * as path from 'node:path';

import { crawl, startsWithComponents } from '../../split/index.js';

export function replace$Refs(obj: unknown, componentsPrefix: string) {
  crawl(obj, (node: Record<string, unknown>) => {
    if (isRef(node) && startsWithComponents(node.$ref)) {
      const name = path.basename(node.$ref);
      node.$ref = node.$ref.replace(name, componentsPrefix + '_' + name);
    } else if (isPlainObject(node.discriminator) && isPlainObject(node.discriminator.mapping)) {
      const { mapping } = node.discriminator;
      for (const name of Object.keys(mapping)) {
        const mappingPointer = mapping[name];
        if (typeof mappingPointer === 'string' && startsWithComponents(mappingPointer)) {
          mapping[name] = mappingPointer
            .split('/')
            .map((name, i, arr) => {
              return arr.length - 1 === i && !name.includes(componentsPrefix)
                ? componentsPrefix + '_' + name
                : name;
            })
            .join('/');
        }
      }
    }
  });
}

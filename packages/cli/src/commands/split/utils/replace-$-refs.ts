import { slash, isRef, isPlainObject } from '@redocly/openapi-core';
import * as path from 'node:path';

import { type ComponentsFiles, type RefObject } from '../types.js';
import { crawl } from './crawl.js';
import { startsWithComponents } from './starts-with-components.js';

export function replace$Refs(
  obj: unknown,
  relativeFrom: string,
  componentFiles = {} as ComponentsFiles
) {
  crawl(obj, (node: Record<string, unknown>) => {
    if (isRef(node) && startsWithComponents(node.$ref)) {
      replace(node as RefObject, '$ref');
    } else if (isPlainObject(node.discriminator) && isPlainObject(node.discriminator.mapping)) {
      const { mapping } = node.discriminator;
      for (const name of Object.keys(mapping)) {
        const mappingPointer = mapping[name];
        if (typeof mappingPointer === 'string' && startsWithComponents(mappingPointer)) {
          replace(node.discriminator.mapping as RefObject, name);
        }
      }
    }
  });

  function replace(node: RefObject, key: string) {
    const splittedNode = node[key].split('/');
    const name = splittedNode.pop();
    const groupName = splittedNode[2];
    const filesGroupName = componentFiles[groupName];
    if (!filesGroupName || !filesGroupName[name!]) return;
    let filename = slash(path.relative(relativeFrom, filesGroupName[name!].filename));
    if (!filename.startsWith('.')) {
      filename = './' + filename;
    }
    node[key] = filename;
  }
}

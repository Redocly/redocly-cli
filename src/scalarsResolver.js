import path from 'path';
import fs from 'fs';
import createError from './error';


export default function resolveScalars(resolvedNode, definition, ctx) {
  Object.keys(definition.properties)
    .filter((k) => resolvedNode[k])
    .filter((k) => typeof resolvedNode[k] === 'object')
    .filter((k) => definition.resolvableScalars && definition.resolvableScalars.indexOf(k) !== -1)
    .filter((k) => resolvedNode[k].$ref)
    .forEach((k) => {
      const resolvedFilePath = path.resolve(path.dirname(ctx.filePath), resolvedNode[k].$ref);
      ctx.fileDependencies.add(resolvedFilePath);
      if (fs.existsSync(resolvedFilePath)) {
        resolvedNode[k] = fs.readFileSync(resolvedFilePath, 'utf-8');
      } else {
        ctx.path.push(k);
        ctx.path.push('$ref');
        ctx.result.push(createError('Reference does not exist.', resolvedNode, ctx, { fromRule: 'resolve-scalars' }));
        ctx.path.pop();
        ctx.path.pop();
      }
    });
}

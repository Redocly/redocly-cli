/* eslint-disable no-case-declarations */
/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import isEqual from 'lodash.isequal';

import { getMsgLevelFromString } from '../error/default';

const getComponentName = (refString, components, componentType, node, ctx) => {
  const errors = [];

  refString = refString.replace('#/', '/');
  const itemNameBase = path.basename(refString, path.extname(refString));
  const pathParts = path.dirname(refString).split('/');

  const componentsGroup = components[componentType];
  if (!componentsGroup) return { name: itemNameBase, errors };

  let name = itemNameBase;
  let i = pathParts.length - 1;

  while (componentsGroup[name] && !isEqual(componentsGroup[name], node) && i >= 0) {
    const prevName = name;
    name = `${pathParts[i]}_${itemNameBase}`;

    errors.push(
      ctx.createError(
        `Two schemas with the same name but different content are referneced. Renamed ${prevName} to ${name}`,
        'key',
      ),
    );
    i--;
  }

  if (i >= 0) return { name, errors };

  let serialId = 0;
  while (componentsGroup[name] && !isEqual(componentsGroup[name], node)) {
    serialId++;
    name = `${name}-${serialId}`;
  }

  return { name, errors };
};

class Bundler {
  constructor(config) {
    this.config = config;
    this.nameConflictsEnabled = this.config.nameConflicts !== 'off';
    if (this.nameConflictsEnabled) {
      this.nameConflictsSeverity = getMsgLevelFromString(this.config.nameConflicts || '');
    }
    this.components = {};
  }

  static get rule() {
    return 'bundler';
  }

  defNameToType(definitionName) {
    switch (definitionName) {
      case 'OpenAPISchema':
        return 'schemas';
      case 'OpenAPIParameter':
        return 'parameters';
      case 'OpenAPIResponse':
        return 'responses';
      case 'OpenAPIExample':
        return 'examples';
      case 'OpenAPIRequestBody':
        return 'requestBodies';
      case 'OpenAPIHeader':
        return 'headers';
      case 'OpenAPISecuritySchema':
        return 'securitySchemes';
      case 'OpenAPILink':
        return 'links';
      case 'OpenAPICallback':
        return 'callbacks';
      default:
        return null;
    }
  }

  any() {
    return {
      onExit: (node, definition, ctx, unresolvedNode) => {
        let errors = [];

        if (Object.keys(unresolvedNode).indexOf('$ref') !== -1) {
          const componentType = this.defNameToType(definition.name);

          if (!componentType) {
            delete unresolvedNode.$ref;
            Object.assign(unresolvedNode, node);
          } else {
            // eslint-disable-next-line prefer-const
            const { name, errors: nameErrors } = getComponentName(
              unresolvedNode.$ref, this.components, componentType, node, ctx,
            );

            errors.push(...nameErrors);

            const newRef = `#/components/${componentType}/${name}`;

            if (!this.components[componentType]) {
              this.components[componentType] = {};
            }

            this.components[componentType][name] = node;
            unresolvedNode.$ref = newRef;
          }
        }

        errors.forEach((e) => {
          e.severity = this.nameConflictsSeverity;
        });

        if (!this.nameConflictsEnabled) {
          errors = [];
        }

        return errors;
      },
    };
  }

  OpenAPIRoot() {
    return {
      onExit: (node, definition, ctx) => {
        if (!node.components) {
          node.components = {};
        }

        if (ctx.result.length > 0) {
          ctx.bundlingResult = null;
          return null;
        }

        Object.keys(this.components).forEach((component) => {
          node.components[component] = node.components[component] ? node.components[component] : {};
          Object.assign(node.components[component], this.components[component]);
        });

        let outputFile;

        if (this.config.output) {
          outputFile = this.config.output;
          const nameParts = outputFile.split('.');
          const ext = nameParts[nameParts.length - 1];

          const outputPath = `${process.cwd()}/${outputFile}`;

          const outputDir = path.dirname(outputPath);
          fs.mkdirSync(outputDir, { recursive: true });

          let fileData = null;

          switch (ext) {
            case 'json':
              fileData = JSON.stringify(node, null, 2);
              break;
            case 'yaml':
            case 'yml':
            default:
              fileData = yaml.safeDump(node);
              break;
          }
          fs.writeFileSync(`${outputPath}`, fileData);
        } else if (this.config.outputObject) {
          ctx.bundlingResult = node;
        } else {
          // default output to stdout, if smbd wants to pipe it
          process.stdout.write(yaml.safeDump(node));
          process.stdout.write('\n');
        }
        return null;
      },
    };
  }
}

module.exports = Bundler;

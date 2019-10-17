/* eslint-disable no-case-declarations */
/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import AbstractVisitor from './utils/AbstractVisitor';

class Bundler extends AbstractVisitor {
  constructor(config) {
    super(config);
    this.components = {};
  }

  static get ruleName() {
    return 'bundler';
  }

  get rule() {
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
        if (Object.keys(unresolvedNode).indexOf('$ref') !== -1) {
          const componentType = this.defNameToType(definition.name);

          if (!componentType) {
            delete unresolvedNode.$ref;
            Object.assign(unresolvedNode, node);
          } else {
            const itemName = `${unresolvedNode.$ref.split('/')[unresolvedNode.$ref.split('/').length - 1]}`;
            const newRef = `#/components/${componentType}/${itemName}`;

            if (!this.components[componentType]) {
              this.components[componentType] = {};
            }

            this.components[componentType][itemName] = node;
            unresolvedNode.$ref = newRef;
          }
        }
      },
    };
  }

  OpenAPIRoot() {
    return {
      onExit: (node, definition, ctx) => {
        if (!node.components) {
          node.components = {};
        }

        Object.keys(this.components).forEach((component) => {
          node.components[component] = node.components[component] ? node.components[component] : {};
          Object.assign(node.components[component], this.components[component]);
        });

        let outputFile = 'bundle.yaml';

        if (this.config.output) {
          outputFile = this.config.output;
        }

        const nameParts = outputFile.split('.');
        const ext = nameParts[nameParts.length - 1];

        switch (ext) {
          case 'json':
            fs.writeFileSync(`${path.dirname(ctx.filePath)}/${outputFile}`, JSON.stringify(node, null, 2));
            break;
          case 'yaml':
          case 'yml':
          default:
            const yamlDoc = yaml.safeDump(node);
            fs.writeFileSync(`${path.dirname(ctx.filePath)}/${outputFile}`, yamlDoc);
            break;
        }
      },
    };
  }
}

module.exports = Bundler;

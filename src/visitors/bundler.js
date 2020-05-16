/* eslint-disable no-case-declarations */
/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
import path from 'path';
import isEqual from 'lodash.isequal';

import { getMsgLevelFromString, messageLevels } from '../error/default';
import OpenAPISchemaObject from '../types/OAS3/OpenAPISchema';
import { MAPPING_DATA_KEY } from '../types/OAS3/OpenAPIDiscriminator';
import { isRef } from '../utils';

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
        `Two schemas are referenced with the same name but different content. Renamed ${prevName} to ${name}`,
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
    this.oas2components = {};

    this.newRefNodes = new Map();
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
      case 'OAS2Schema':
        return 'definitions';
      case 'OAS2Response':
        return 'responses';
      case 'OAS2Parameter':
        return 'parameters';
      default:
        return null;
    }
  }

  includeImplicitDiscriminator(pointer, schemas, ctx, { traverseNode, visited }) {
    const $ref = `#/${pointer.join('/')}`;

    for (const [name, schema] of Object.entries(schemas || {})) {
      if (schema.allOf && schema.allOf.find((s) => s.$ref === $ref)) {
        const existingSchema = this.components.schemas && this.components.schemas[name];
        if (existingSchema && !isEqual(existingSchema, schema)) {
          ctx.report({
            message: `Implicitly mapped discriminator schema "${name}" conflicts with existing schema. Skipping.`,
            reportOnKey: true,
          });
        }

        this.components.schemas = this.components.schemas || {};
        this.components.schemas[name] = schema;

        ctx.pathStack.push({
          path: ctx.path,
          file: ctx.filePath,
          document: ctx.document,
          source: ctx.source,
        });

        ctx.path = ['components', 'schemas', name];
        traverseNode(schema, OpenAPISchemaObject, ctx, visited);
        ctx.path = ctx.pathStack.pop().path;
      }
    }
  }

  saveComponent(ctx, node, name, componentType) {
    let ref;
    if (ctx.openapiVersion === 3) {
      ref = `#/components/${componentType}/${name}`;

      if (!this.components[componentType]) {
        this.components[componentType] = {};
      }

      this.components[componentType][name] = node;
    } else {
      switch (componentType) {
        case 'definitions':
          ref = `#/definitions/${name}`;
          break;
        case 'parameters':
          ref = `#/parameters/${name}`;
          break;
        case 'responses':
          ref = `#/responses/${name}`;
          break;
        default:
          return null;
      }

      if (!this.oas2components[componentType]) {
        this.oas2components[componentType] = {};
      }
      this.oas2components[componentType][name] = node;
    }
    return ref;
  }

  enter() {
    return {
      onExit: (node, definition, ctx, unresolvedNode, { traverseNode, visited }) => {
        let errors = [];

        if (ctx.openapiVersion === 3
          && node.discriminator
          && !node.oneOf
          && !node.anyOf
          && !node.mapping) {
          errors = this.includeImplicitDiscriminator(
            ctx.path,
            ctx.document.components && ctx.document.components.schemas,
            ctx,
            { traverseNode, visited },
          );
        }

        if (unresolvedNode && node !== unresolvedNode && isRef(unresolvedNode)) {
          const componentType = this.defNameToType(definition.name);

          if (!componentType) {
            delete unresolvedNode.$ref;
            Object.assign(unresolvedNode, node);
          } else if (!this.newRefNodes.has(unresolvedNode)) {
            const { name, errors: nameErrors } = getComponentName(
              unresolvedNode.$ref, this.components, componentType, node, ctx,
            );

            errors.push(...nameErrors);

            const newRef = this.saveComponent(ctx, node, name, componentType);
            if (!newRef) {
              delete unresolvedNode.$ref;
              Object.assign(unresolvedNode, node);
              return errors;
            }

            // we can't replace nodes in-place as non-idempotent
            // nodes will be visited again and will fail bundling
            // so we save it and replace at the end
            this.newRefNodes.set(unresolvedNode, newRef);
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

  OAS2Root() {
    return {
      onExit: (node, definition, ctx) => {
        if (!this.config.ignoreErrors && ctx.result.some((e) => e.severity === messageLevels.ERROR)) {
          ctx.bundlingResult = null;
          return null;
        }

        for (const [unresolvedNode, newRef] of this.newRefNodes.entries()) {
          unresolvedNode.$ref = newRef;
        }

        Object.keys(this.oas2components).forEach((component) => {
          node[component] = node[component] ? node[component] : {};
          Object.assign(node[component], this.oas2components[component]);
        });

        ctx.bundlingResult = node;
        return null;
      },
    };
  }

  OpenAPIRoot() {
    return {
      onExit: (node, definition, ctx) => {
        if (!node.components) {
          node.components = {};
        }

        if (!this.config.ignoreErrors && ctx.result.some((e) => e.severity === messageLevels.ERROR)) {
          ctx.bundlingResult = null;
          return null;
        }

        for (const [unresolvedNode, newRef] of this.newRefNodes.entries()) {
          if (unresolvedNode[MAPPING_DATA_KEY]) { // FIXME: too hack
            const { mapping, key } = unresolvedNode[MAPPING_DATA_KEY];
            mapping[key] = newRef;
          } else {
            unresolvedNode.$ref = newRef;
          }
        }

        Object.keys(this.components).forEach((component) => {
          node.components[component] = node.components[component] ? node.components[component] : {};
          Object.assign(node.components[component], this.components[component]);
        });

        ctx.bundlingResult = node;
        return null;
      },
    };
  }
}

module.exports = Bundler;

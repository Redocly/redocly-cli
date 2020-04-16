/* eslint-disable no-underscore-dangle */
class OperationTags {
  static get rule() {
    return 'operation-tags-defined';
  }

  constructor() {
    this.globalTagNames = [];
    this.operationTags = []; // { name, path }
  }

  _finishValidation() {
    return {
      onExit: (_node, _, ctx) => {
        const errors = [];
        for (const tag of this.operationTags) {
          if (this.globalTagNames.indexOf(tag.name) === -1) {
            const tmpPath = ctx.path;
            ctx.path = tag.path;
            errors.push(ctx.createError('Operation tags should be defined in the top level "tags" object.', 'value'));
            ctx.path = tmpPath;
          }
        }
        return errors;
      },
    };
  }

  _processGlobalTag() {
    return {
      onEnter: (node) => {
        this.globalTagNames.push(node.name);
      },
    };
  }

  _processOperationTag() {
    return {
      onEnter: (node, _, ctx) => {
        if (!node.tags) return;
        node.tags.forEach((tag, id) => {
          this.operationTags.push({
            name: tag,
            path: Array.from([...ctx.path, 'tags', id]),
          });
        });
      },
    };
  }

  OpenAPITag() {
    return this._processGlobalTag();
  }

  OAS2Tag() {
    return this._processGlobalTag();
  }

  OpenAPIOperation() {
    return this._processOperationTag();
  }

  OAS2Operation() {
    return this._processOperationTag();
  }

  OAS2Root() {
    return this._finishValidation();
  }

  OpenAPIRoot() {
    return this._finishValidation();
  }
}

module.exports = OperationTags;

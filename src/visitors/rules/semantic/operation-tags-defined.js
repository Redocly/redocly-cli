/* eslint-disable no-underscore-dangle */
class OperationTags {
  static get rule() {
    return 'operation-tags-defined';
  }

  constructor() {
    this.globalTagNames = [];
  }

  _readGlobalTags() {
    return {
      onEnter: (node) => {
        this.globalTagNames = node.tags ? node.tags.map((tag) => tag.name) : [];
      },
    };
  }

  _processOperationTags() {
    return {
      onEnter: (node, _, ctx) => {
        if (!node.tags) return [];
        const errors = [];
        for (const tag of node.tags) {
          if (this.globalTagNames.indexOf(tag.name) === -1) {
            errors.push(ctx.createError('Operation tags should be defined in the top level "tags" object.', 'value'));
          }
        }
        return errors;
      },
    };
  }

  OpenAPIOperation() {
    return this._processOperationTags();
  }

  OAS2Operation() {
    return this._processOperationTags();
  }

  OAS2Root() {
    return this._readGlobalTags();
  }

  OpenAPIRoot() {
    return this._readGlobalTags();
  }
}

module.exports = OperationTags;

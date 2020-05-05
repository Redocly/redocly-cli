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
        for (let i = 0; i < node.tags.length; i++) {
          if (this.globalTagNames.indexOf(node.tags[i].name) === -1) {
            ctx.path.push('tags');
            ctx.path.push(i);
            errors.push(ctx.createError('Operation tags should be defined in the top level "tags" object.', 'key'));
            ctx.path.pop();
            ctx.path.pop();
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

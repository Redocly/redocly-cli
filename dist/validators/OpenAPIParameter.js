"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OpenAPIParameterMap = exports.OpenAPIParameter = void 0;

var _error = _interopRequireDefault(require("../error"));

var _OpenAPISchema = _interopRequireDefault(require("./OpenAPISchema"));

var _OpenAPIMediaObject = require("./OpenAPIMediaObject");

var _OpenAPIExample = require("./OpenAPIExample");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const OpenAPIParameter = {
  validators: {
    name() {
      return (node, ctx) => {
        if (!node) return null;
        if (!node.name || typeof node.name !== 'string') return (0, _error.default)('name is required and must be a string', node, ctx);

        if (node.in && node.in === 'path' && [...ctx.path, ...ctx.pathStack.flat()].filter(pathNode => typeof pathNode === 'string' && pathNode.indexOf(`{${node.name}}`) !== -1).length === 0 && (ctx.path.indexOf('components') === -1 || ctx.pathStack.flat().indexOf('paths') !== -1)) {
          // console.log(ctx.path);
          return (0, _error.default)('The "name" field value is not in the current parameter path.', node, ctx);
        }

        return null;
      };
    },

    in() {
      return (node, ctx) => {
        if (!node) return null;
        if (!node.in) return (0, _error.default)('in field is required for Parameter object', node, ctx);
        if (typeof node.in !== 'string') return (0, _error.default)('in field must be a string', node, ctx);
        if (!['query', 'header', 'path', 'cookie'].includes(node.in)) return (0, _error.default)("in value can be only one of: 'query', 'header', 'path', 'cookie'", node, ctx);
        return null;
      };
    },

    description() {
      return (node, ctx) => {
        if (node && node.description && typeof node.description !== 'string') return (0, _error.default)('description field must be a string', node, ctx);
        return null;
      };
    },

    required() {
      return (node, ctx) => {
        if (node && node.required && typeof node.required !== 'boolean') return (0, _error.default)('required field must be a boolean', node, ctx);

        if (node && node.in && node.in === 'path' && node.required !== true) {
          return (0, _error.default)('If the parameter location is "path", this property is REQUIRED and its value MUST be true.', node, ctx);
        }

        return null;
      };
    },

    deprecated() {
      return (node, ctx) => {
        if (node && node.deprecated && typeof node.deprecated !== 'boolean') return (0, _error.default)('deprecated field must be a boolean', node, ctx);
        return null;
      };
    },

    allowEmptyValue() {
      return (node, ctx) => {
        if (node && node.allowEmptyValue && typeof node.allowEmptyValue !== 'boolean') return (0, _error.default)('allowEmptyValue field must be a boolean', node, ctx);
        return null;
      };
    },

    style() {
      return (node, ctx) => {
        if (node && node.style && typeof node.style !== 'string') {
          return (0, _error.default)('The style field must be a string for Parameter object', node, ctx);
        }

        return null;
      };
    },

    explode() {
      return (node, ctx) => {
        if (node && node.explode && typeof node.explode !== 'boolean') return (0, _error.default)('explode field must be a boolean', node, ctx);
        return null;
      };
    },

    allowReserved() {
      return (node, ctx) => {
        if (node && node.allowReserved && typeof node.allowReserved !== 'boolean') return (0, _error.default)('allowReserved field must be a boolean', node, ctx);
        return null;
      };
    },

    example() {
      return (node, ctx) => {
        if (node.example && node.examples) return (0, _error.default)('The example field is mutually exclusive of the examples field.', node, ctx);
        return null;
      };
    },

    examples() {
      return (node, ctx) => {
        if (node.example && node.examples) return (0, _error.default)('The examples field is mutually exclusive of the example field.', node, ctx);
        return null;
      };
    },

    schema() {
      return (node, ctx) => {
        if (node.schema && node.content) {
          return (0, _error.default)('A parameter MUST contain either a schema property, or a content property, but not both.', node, ctx);
        }

        return null;
      };
    },

    content() {
      return (node, ctx) => {
        if (node.schema && node.content) {
          return (0, _error.default)('A parameter MUST contain either a schema property, or a content property, but not both.', node, ctx);
        }

        return null;
      };
    }

  },
  properties: {
    schema: _OpenAPISchema.default,
    content: _OpenAPIMediaObject.OpenAPIMediaTypeObject,
    examples: _OpenAPIExample.OpenAPIExampleMap
  }
};
exports.OpenAPIParameter = OpenAPIParameter;
const OpenAPIParameterMap = {
  properties(node) {
    const props = {};
    Object.keys(node).forEach(k => {
      props[k] = OpenAPIParameter;
    });
    return props;
  }

};
exports.OpenAPIParameterMap = OpenAPIParameterMap;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElQYXJhbWV0ZXIuanMiXSwibmFtZXMiOlsiT3BlbkFQSVBhcmFtZXRlciIsInZhbGlkYXRvcnMiLCJuYW1lIiwibm9kZSIsImN0eCIsImluIiwicGF0aCIsInBhdGhTdGFjayIsImZsYXQiLCJmaWx0ZXIiLCJwYXRoTm9kZSIsImluZGV4T2YiLCJsZW5ndGgiLCJpbmNsdWRlcyIsImRlc2NyaXB0aW9uIiwicmVxdWlyZWQiLCJkZXByZWNhdGVkIiwiYWxsb3dFbXB0eVZhbHVlIiwic3R5bGUiLCJleHBsb2RlIiwiYWxsb3dSZXNlcnZlZCIsImV4YW1wbGUiLCJleGFtcGxlcyIsInNjaGVtYSIsImNvbnRlbnQiLCJwcm9wZXJ0aWVzIiwiT3BlbkFQSVNjaGVtYU9iamVjdCIsIk9wZW5BUElNZWRpYVR5cGVPYmplY3QiLCJPcGVuQVBJRXhhbXBsZU1hcCIsIk9wZW5BUElQYXJhbWV0ZXJNYXAiLCJwcm9wcyIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwiayJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOztBQUVBOztBQUNBOztBQUNBOzs7O0FBRU8sTUFBTUEsZ0JBQWdCLEdBQUc7QUFDOUJDLEVBQUFBLFVBQVUsRUFBRTtBQUNWQyxJQUFBQSxJQUFJLEdBQUc7QUFDTCxhQUFPLENBQUNDLElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUksQ0FBQ0QsSUFBTCxFQUFXLE9BQU8sSUFBUDtBQUNYLFlBQUksQ0FBQ0EsSUFBSSxDQUFDRCxJQUFOLElBQWMsT0FBT0MsSUFBSSxDQUFDRCxJQUFaLEtBQXFCLFFBQXZDLEVBQWlELE9BQU8sb0JBQVksdUNBQVosRUFBcURDLElBQXJELEVBQTJEQyxHQUEzRCxDQUFQOztBQUNqRCxZQUFJRCxJQUFJLENBQUNFLEVBQUwsSUFBV0YsSUFBSSxDQUFDRSxFQUFMLEtBQVksTUFBdkIsSUFDQyxDQUFDLEdBQUdELEdBQUcsQ0FBQ0UsSUFBUixFQUFjLEdBQUdGLEdBQUcsQ0FBQ0csU0FBSixDQUFjQyxJQUFkLEVBQWpCLEVBQ0FDLE1BREEsQ0FDUUMsUUFBRCxJQUFjLE9BQU9BLFFBQVAsS0FBb0IsUUFBcEIsSUFBZ0NBLFFBQVEsQ0FBQ0MsT0FBVCxDQUFrQixJQUFHUixJQUFJLENBQUNELElBQUssR0FBL0IsTUFBdUMsQ0FBQyxDQUQ3RixFQUVBVSxNQUZBLEtBRVcsQ0FIWixLQUlFUixHQUFHLENBQUNFLElBQUosQ0FBU0ssT0FBVCxDQUFpQixZQUFqQixNQUFtQyxDQUFDLENBQXBDLElBQXlDUCxHQUFHLENBQUNHLFNBQUosQ0FBY0MsSUFBZCxHQUFxQkcsT0FBckIsQ0FBNkIsT0FBN0IsTUFBMEMsQ0FBQyxDQUp0RixDQUFKLEVBS0U7QUFDQTtBQUNBLGlCQUFPLG9CQUFZLDhEQUFaLEVBQTRFUixJQUE1RSxFQUFrRkMsR0FBbEYsQ0FBUDtBQUNEOztBQUNELGVBQU8sSUFBUDtBQUNELE9BYkQ7QUFjRCxLQWhCUzs7QUFpQlZDLElBQUFBLEVBQUUsR0FBRztBQUNILGFBQU8sQ0FBQ0YsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSSxDQUFDRCxJQUFMLEVBQVcsT0FBTyxJQUFQO0FBQ1gsWUFBSSxDQUFDQSxJQUFJLENBQUNFLEVBQVYsRUFBYyxPQUFPLG9CQUFZLDJDQUFaLEVBQXlERixJQUF6RCxFQUErREMsR0FBL0QsQ0FBUDtBQUNkLFlBQUksT0FBT0QsSUFBSSxDQUFDRSxFQUFaLEtBQW1CLFFBQXZCLEVBQWlDLE9BQU8sb0JBQVksMkJBQVosRUFBeUNGLElBQXpDLEVBQStDQyxHQUEvQyxDQUFQO0FBQ2pDLFlBQUksQ0FBQyxDQUFDLE9BQUQsRUFBVSxRQUFWLEVBQW9CLE1BQXBCLEVBQTRCLFFBQTVCLEVBQXNDUyxRQUF0QyxDQUErQ1YsSUFBSSxDQUFDRSxFQUFwRCxDQUFMLEVBQThELE9BQU8sb0JBQVksa0VBQVosRUFBZ0ZGLElBQWhGLEVBQXNGQyxHQUF0RixDQUFQO0FBQzlELGVBQU8sSUFBUDtBQUNELE9BTkQ7QUFPRCxLQXpCUzs7QUEwQlZVLElBQUFBLFdBQVcsR0FBRztBQUNaLGFBQU8sQ0FBQ1gsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxJQUFJQSxJQUFJLENBQUNXLFdBQWIsSUFBNEIsT0FBT1gsSUFBSSxDQUFDVyxXQUFaLEtBQTRCLFFBQTVELEVBQXNFLE9BQU8sb0JBQVksb0NBQVosRUFBa0RYLElBQWxELEVBQXdEQyxHQUF4RCxDQUFQO0FBQ3RFLGVBQU8sSUFBUDtBQUNELE9BSEQ7QUFJRCxLQS9CUzs7QUFnQ1ZXLElBQUFBLFFBQVEsR0FBRztBQUNULGFBQU8sQ0FBQ1osSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxJQUFJQSxJQUFJLENBQUNZLFFBQWIsSUFBeUIsT0FBT1osSUFBSSxDQUFDWSxRQUFaLEtBQXlCLFNBQXRELEVBQWlFLE9BQU8sb0JBQVksa0NBQVosRUFBZ0RaLElBQWhELEVBQXNEQyxHQUF0RCxDQUFQOztBQUNqRSxZQUFJRCxJQUFJLElBQUlBLElBQUksQ0FBQ0UsRUFBYixJQUFtQkYsSUFBSSxDQUFDRSxFQUFMLEtBQVksTUFBL0IsSUFBeUNGLElBQUksQ0FBQ1ksUUFBTCxLQUFrQixJQUEvRCxFQUFxRTtBQUNuRSxpQkFBTyxvQkFBWSw0RkFBWixFQUEwR1osSUFBMUcsRUFBZ0hDLEdBQWhILENBQVA7QUFDRDs7QUFDRCxlQUFPLElBQVA7QUFDRCxPQU5EO0FBT0QsS0F4Q1M7O0FBeUNWWSxJQUFBQSxVQUFVLEdBQUc7QUFDWCxhQUFPLENBQUNiLElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUlELElBQUksSUFBSUEsSUFBSSxDQUFDYSxVQUFiLElBQTJCLE9BQU9iLElBQUksQ0FBQ2EsVUFBWixLQUEyQixTQUExRCxFQUFxRSxPQUFPLG9CQUFZLG9DQUFaLEVBQWtEYixJQUFsRCxFQUF3REMsR0FBeEQsQ0FBUDtBQUNyRSxlQUFPLElBQVA7QUFDRCxPQUhEO0FBSUQsS0E5Q1M7O0FBK0NWYSxJQUFBQSxlQUFlLEdBQUc7QUFDaEIsYUFBTyxDQUFDZCxJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLElBQUlBLElBQUksQ0FBQ2MsZUFBYixJQUFnQyxPQUFPZCxJQUFJLENBQUNjLGVBQVosS0FBZ0MsU0FBcEUsRUFBK0UsT0FBTyxvQkFBWSx5Q0FBWixFQUF1RGQsSUFBdkQsRUFBNkRDLEdBQTdELENBQVA7QUFDL0UsZUFBTyxJQUFQO0FBQ0QsT0FIRDtBQUlELEtBcERTOztBQXFEVmMsSUFBQUEsS0FBSyxHQUFHO0FBQ04sYUFBTyxDQUFDZixJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLElBQUlBLElBQUksQ0FBQ2UsS0FBYixJQUFzQixPQUFPZixJQUFJLENBQUNlLEtBQVosS0FBc0IsUUFBaEQsRUFBMEQ7QUFDeEQsaUJBQU8sb0JBQVksdURBQVosRUFBcUVmLElBQXJFLEVBQTJFQyxHQUEzRSxDQUFQO0FBQ0Q7O0FBQ0QsZUFBTyxJQUFQO0FBQ0QsT0FMRDtBQU1ELEtBNURTOztBQTZEVmUsSUFBQUEsT0FBTyxHQUFHO0FBQ1IsYUFBTyxDQUFDaEIsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxJQUFJQSxJQUFJLENBQUNnQixPQUFiLElBQXdCLE9BQU9oQixJQUFJLENBQUNnQixPQUFaLEtBQXdCLFNBQXBELEVBQStELE9BQU8sb0JBQVksaUNBQVosRUFBK0NoQixJQUEvQyxFQUFxREMsR0FBckQsQ0FBUDtBQUMvRCxlQUFPLElBQVA7QUFDRCxPQUhEO0FBSUQsS0FsRVM7O0FBbUVWZ0IsSUFBQUEsYUFBYSxHQUFHO0FBQ2QsYUFBTyxDQUFDakIsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxJQUFJQSxJQUFJLENBQUNpQixhQUFiLElBQThCLE9BQU9qQixJQUFJLENBQUNpQixhQUFaLEtBQThCLFNBQWhFLEVBQTJFLE9BQU8sb0JBQVksdUNBQVosRUFBcURqQixJQUFyRCxFQUEyREMsR0FBM0QsQ0FBUDtBQUMzRSxlQUFPLElBQVA7QUFDRCxPQUhEO0FBSUQsS0F4RVM7O0FBeUVWaUIsSUFBQUEsT0FBTyxHQUFHO0FBQ1IsYUFBTyxDQUFDbEIsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxDQUFDa0IsT0FBTCxJQUFnQmxCLElBQUksQ0FBQ21CLFFBQXpCLEVBQW1DLE9BQU8sb0JBQVksZ0VBQVosRUFBOEVuQixJQUE5RSxFQUFvRkMsR0FBcEYsQ0FBUDtBQUNuQyxlQUFPLElBQVA7QUFDRCxPQUhEO0FBSUQsS0E5RVM7O0FBK0VWa0IsSUFBQUEsUUFBUSxHQUFHO0FBQ1QsYUFBTyxDQUFDbkIsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxDQUFDa0IsT0FBTCxJQUFnQmxCLElBQUksQ0FBQ21CLFFBQXpCLEVBQW1DLE9BQU8sb0JBQVksZ0VBQVosRUFBOEVuQixJQUE5RSxFQUFvRkMsR0FBcEYsQ0FBUDtBQUNuQyxlQUFPLElBQVA7QUFDRCxPQUhEO0FBSUQsS0FwRlM7O0FBcUZWbUIsSUFBQUEsTUFBTSxHQUFHO0FBQ1AsYUFBTyxDQUFDcEIsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxDQUFDb0IsTUFBTCxJQUFlcEIsSUFBSSxDQUFDcUIsT0FBeEIsRUFBaUM7QUFDL0IsaUJBQU8sb0JBQVkseUZBQVosRUFBdUdyQixJQUF2RyxFQUE2R0MsR0FBN0csQ0FBUDtBQUNEOztBQUNELGVBQU8sSUFBUDtBQUNELE9BTEQ7QUFNRCxLQTVGUzs7QUE2RlZvQixJQUFBQSxPQUFPLEdBQUc7QUFDUixhQUFPLENBQUNyQixJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLENBQUNvQixNQUFMLElBQWVwQixJQUFJLENBQUNxQixPQUF4QixFQUFpQztBQUMvQixpQkFBTyxvQkFBWSx5RkFBWixFQUF1R3JCLElBQXZHLEVBQTZHQyxHQUE3RyxDQUFQO0FBQ0Q7O0FBQ0QsZUFBTyxJQUFQO0FBQ0QsT0FMRDtBQU1EOztBQXBHUyxHQURrQjtBQXVHOUJxQixFQUFBQSxVQUFVLEVBQUU7QUFDVkYsSUFBQUEsTUFBTSxFQUFFRyxzQkFERTtBQUVWRixJQUFBQSxPQUFPLEVBQUVHLDBDQUZDO0FBR1ZMLElBQUFBLFFBQVEsRUFBRU07QUFIQTtBQXZHa0IsQ0FBekI7O0FBOEdBLE1BQU1DLG1CQUFtQixHQUFHO0FBQ2pDSixFQUFBQSxVQUFVLENBQUN0QixJQUFELEVBQU87QUFDZixVQUFNMkIsS0FBSyxHQUFHLEVBQWQ7QUFDQUMsSUFBQUEsTUFBTSxDQUFDQyxJQUFQLENBQVk3QixJQUFaLEVBQWtCOEIsT0FBbEIsQ0FBMkJDLENBQUQsSUFBTztBQUMvQkosTUFBQUEsS0FBSyxDQUFDSSxDQUFELENBQUwsR0FBV2xDLGdCQUFYO0FBQ0QsS0FGRDtBQUdBLFdBQU84QixLQUFQO0FBQ0Q7O0FBUGdDLENBQTVCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNyZWF0ZUVycm9yIGZyb20gJy4uL2Vycm9yJztcblxuaW1wb3J0IE9wZW5BUElTY2hlbWFPYmplY3QgZnJvbSAnLi9PcGVuQVBJU2NoZW1hJztcbmltcG9ydCB7IE9wZW5BUElNZWRpYVR5cGVPYmplY3QgfSBmcm9tICcuL09wZW5BUElNZWRpYU9iamVjdCc7XG5pbXBvcnQgeyBPcGVuQVBJRXhhbXBsZU1hcCB9IGZyb20gJy4vT3BlbkFQSUV4YW1wbGUnO1xuXG5leHBvcnQgY29uc3QgT3BlbkFQSVBhcmFtZXRlciA9IHtcbiAgdmFsaWRhdG9yczoge1xuICAgIG5hbWUoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAoIW5vZGUpIHJldHVybiBudWxsO1xuICAgICAgICBpZiAoIW5vZGUubmFtZSB8fCB0eXBlb2Ygbm9kZS5uYW1lICE9PSAnc3RyaW5nJykgcmV0dXJuIGNyZWF0ZUVycm9yKCduYW1lIGlzIHJlcXVpcmVkIGFuZCBtdXN0IGJlIGEgc3RyaW5nJywgbm9kZSwgY3R4KTtcbiAgICAgICAgaWYgKG5vZGUuaW4gJiYgbm9kZS5pbiA9PT0gJ3BhdGgnXG4gICAgICAgICAgJiYgWy4uLmN0eC5wYXRoLCAuLi5jdHgucGF0aFN0YWNrLmZsYXQoKV1cbiAgICAgICAgICAgIC5maWx0ZXIoKHBhdGhOb2RlKSA9PiB0eXBlb2YgcGF0aE5vZGUgPT09ICdzdHJpbmcnICYmIHBhdGhOb2RlLmluZGV4T2YoYHske25vZGUubmFtZX19YCkgIT09IC0xKVxuICAgICAgICAgICAgLmxlbmd0aCA9PT0gMFxuICAgICAgICAgICYmIChjdHgucGF0aC5pbmRleE9mKCdjb21wb25lbnRzJykgPT09IC0xIHx8IGN0eC5wYXRoU3RhY2suZmxhdCgpLmluZGV4T2YoJ3BhdGhzJykgIT09IC0xKVxuICAgICAgICApIHtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyhjdHgucGF0aCk7XG4gICAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgXCJuYW1lXCIgZmllbGQgdmFsdWUgaXMgbm90IGluIHRoZSBjdXJyZW50IHBhcmFtZXRlciBwYXRoLicsIG5vZGUsIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgaW4oKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAoIW5vZGUpIHJldHVybiBudWxsO1xuICAgICAgICBpZiAoIW5vZGUuaW4pIHJldHVybiBjcmVhdGVFcnJvcignaW4gZmllbGQgaXMgcmVxdWlyZWQgZm9yIFBhcmFtZXRlciBvYmplY3QnLCBub2RlLCBjdHgpO1xuICAgICAgICBpZiAodHlwZW9mIG5vZGUuaW4gIT09ICdzdHJpbmcnKSByZXR1cm4gY3JlYXRlRXJyb3IoJ2luIGZpZWxkIG11c3QgYmUgYSBzdHJpbmcnLCBub2RlLCBjdHgpO1xuICAgICAgICBpZiAoIVsncXVlcnknLCAnaGVhZGVyJywgJ3BhdGgnLCAnY29va2llJ10uaW5jbHVkZXMobm9kZS5pbikpIHJldHVybiBjcmVhdGVFcnJvcihcImluIHZhbHVlIGNhbiBiZSBvbmx5IG9uZSBvZjogJ3F1ZXJ5JywgJ2hlYWRlcicsICdwYXRoJywgJ2Nvb2tpZSdcIiwgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgZGVzY3JpcHRpb24oKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLmRlc2NyaXB0aW9uICYmIHR5cGVvZiBub2RlLmRlc2NyaXB0aW9uICE9PSAnc3RyaW5nJykgcmV0dXJuIGNyZWF0ZUVycm9yKCdkZXNjcmlwdGlvbiBmaWVsZCBtdXN0IGJlIGEgc3RyaW5nJywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgcmVxdWlyZWQoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLnJlcXVpcmVkICYmIHR5cGVvZiBub2RlLnJlcXVpcmVkICE9PSAnYm9vbGVhbicpIHJldHVybiBjcmVhdGVFcnJvcigncmVxdWlyZWQgZmllbGQgbXVzdCBiZSBhIGJvb2xlYW4nLCBub2RlLCBjdHgpO1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLmluICYmIG5vZGUuaW4gPT09ICdwYXRoJyAmJiBub2RlLnJlcXVpcmVkICE9PSB0cnVlKSB7XG4gICAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yKCdJZiB0aGUgcGFyYW1ldGVyIGxvY2F0aW9uIGlzIFwicGF0aFwiLCB0aGlzIHByb3BlcnR5IGlzIFJFUVVJUkVEIGFuZCBpdHMgdmFsdWUgTVVTVCBiZSB0cnVlLicsIG5vZGUsIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgZGVwcmVjYXRlZCgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUuZGVwcmVjYXRlZCAmJiB0eXBlb2Ygbm9kZS5kZXByZWNhdGVkICE9PSAnYm9vbGVhbicpIHJldHVybiBjcmVhdGVFcnJvcignZGVwcmVjYXRlZCBmaWVsZCBtdXN0IGJlIGEgYm9vbGVhbicsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIGFsbG93RW1wdHlWYWx1ZSgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUuYWxsb3dFbXB0eVZhbHVlICYmIHR5cGVvZiBub2RlLmFsbG93RW1wdHlWYWx1ZSAhPT0gJ2Jvb2xlYW4nKSByZXR1cm4gY3JlYXRlRXJyb3IoJ2FsbG93RW1wdHlWYWx1ZSBmaWVsZCBtdXN0IGJlIGEgYm9vbGVhbicsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIHN0eWxlKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS5zdHlsZSAmJiB0eXBlb2Ygbm9kZS5zdHlsZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBzdHlsZSBmaWVsZCBtdXN0IGJlIGEgc3RyaW5nIGZvciBQYXJhbWV0ZXIgb2JqZWN0Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBleHBsb2RlKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS5leHBsb2RlICYmIHR5cGVvZiBub2RlLmV4cGxvZGUgIT09ICdib29sZWFuJykgcmV0dXJuIGNyZWF0ZUVycm9yKCdleHBsb2RlIGZpZWxkIG11c3QgYmUgYSBib29sZWFuJywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgYWxsb3dSZXNlcnZlZCgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUuYWxsb3dSZXNlcnZlZCAmJiB0eXBlb2Ygbm9kZS5hbGxvd1Jlc2VydmVkICE9PSAnYm9vbGVhbicpIHJldHVybiBjcmVhdGVFcnJvcignYWxsb3dSZXNlcnZlZCBmaWVsZCBtdXN0IGJlIGEgYm9vbGVhbicsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIGV4YW1wbGUoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZS5leGFtcGxlICYmIG5vZGUuZXhhbXBsZXMpIHJldHVybiBjcmVhdGVFcnJvcignVGhlIGV4YW1wbGUgZmllbGQgaXMgbXV0dWFsbHkgZXhjbHVzaXZlIG9mIHRoZSBleGFtcGxlcyBmaWVsZC4nLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBleGFtcGxlcygpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlLmV4YW1wbGUgJiYgbm9kZS5leGFtcGxlcykgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgZXhhbXBsZXMgZmllbGQgaXMgbXV0dWFsbHkgZXhjbHVzaXZlIG9mIHRoZSBleGFtcGxlIGZpZWxkLicsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIHNjaGVtYSgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlLnNjaGVtYSAmJiBub2RlLmNvbnRlbnQpIHtcbiAgICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3IoJ0EgcGFyYW1ldGVyIE1VU1QgY29udGFpbiBlaXRoZXIgYSBzY2hlbWEgcHJvcGVydHksIG9yIGEgY29udGVudCBwcm9wZXJ0eSwgYnV0IG5vdCBib3RoLicsIG5vZGUsIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgY29udGVudCgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlLnNjaGVtYSAmJiBub2RlLmNvbnRlbnQpIHtcbiAgICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3IoJ0EgcGFyYW1ldGVyIE1VU1QgY29udGFpbiBlaXRoZXIgYSBzY2hlbWEgcHJvcGVydHksIG9yIGEgY29udGVudCBwcm9wZXJ0eSwgYnV0IG5vdCBib3RoLicsIG5vZGUsIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG4gIHByb3BlcnRpZXM6IHtcbiAgICBzY2hlbWE6IE9wZW5BUElTY2hlbWFPYmplY3QsXG4gICAgY29udGVudDogT3BlbkFQSU1lZGlhVHlwZU9iamVjdCxcbiAgICBleGFtcGxlczogT3BlbkFQSUV4YW1wbGVNYXAsXG4gIH0sXG59O1xuXG5leHBvcnQgY29uc3QgT3BlbkFQSVBhcmFtZXRlck1hcCA9IHtcbiAgcHJvcGVydGllcyhub2RlKSB7XG4gICAgY29uc3QgcHJvcHMgPSB7fTtcbiAgICBPYmplY3Qua2V5cyhub2RlKS5mb3JFYWNoKChrKSA9PiB7XG4gICAgICBwcm9wc1trXSA9IE9wZW5BUElQYXJhbWV0ZXI7XG4gICAgfSk7XG4gICAgcmV0dXJuIHByb3BzO1xuICB9LFxufTtcbiJdfQ==
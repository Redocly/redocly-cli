"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _error = _interopRequireDefault(require("../error"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = {
  validators: {
    name() {
      return (node, ctx) => {
        if (node && node.name && typeof node.name !== 'string') return (0, _error.default)('name of the Xml object must be a string', node, ctx);
        return null;
      };
    },

    namespace() {
      return (node, ctx) => {
        // TODO: add validation that format is uri
        if (node && node.namespace && typeof node.namespace !== 'string') return (0, _error.default)('namespace of the Xml object must be a string', node, ctx);
        return null;
      };
    },

    prefix() {
      return (node, ctx) => {
        if (node && node.prefix && typeof node.prefix !== 'string') return (0, _error.default)('prefix of the Xml object must be a string', node, ctx);
        return null;
      };
    },

    attribute() {
      return (node, ctx) => {
        if (node && node.attribute && typeof node.attribute !== 'boolean') return (0, _error.default)('attribute of the Xml object must be a boolean', node, ctx);
        return null;
      };
    },

    wrapped() {
      return (node, ctx) => {
        if (node && node.wrapped && typeof node.wrapped !== 'boolean') return (0, _error.default)('wrapped of the Xml object must be a boolean', node, ctx);
        return null;
      };
    }

  }
};
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElYTUwuanMiXSwibmFtZXMiOlsidmFsaWRhdG9ycyIsIm5hbWUiLCJub2RlIiwiY3R4IiwibmFtZXNwYWNlIiwicHJlZml4IiwiYXR0cmlidXRlIiwid3JhcHBlZCJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOzs7O2VBRWU7QUFDYkEsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZDLElBQUFBLElBQUksR0FBRztBQUNMLGFBQU8sQ0FBQ0MsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDcEIsWUFBSUQsSUFBSSxJQUFJQSxJQUFJLENBQUNELElBQWIsSUFBcUIsT0FBT0MsSUFBSSxDQUFDRCxJQUFaLEtBQXFCLFFBQTlDLEVBQXdELE9BQU8sb0JBQVkseUNBQVosRUFBdURDLElBQXZELEVBQTZEQyxHQUE3RCxDQUFQO0FBQ3hELGVBQU8sSUFBUDtBQUNELE9BSEQ7QUFJRCxLQU5TOztBQU9WQyxJQUFBQSxTQUFTLEdBQUc7QUFDVixhQUFPLENBQUNGLElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCO0FBQ0EsWUFBSUQsSUFBSSxJQUFJQSxJQUFJLENBQUNFLFNBQWIsSUFBMEIsT0FBT0YsSUFBSSxDQUFDRSxTQUFaLEtBQTBCLFFBQXhELEVBQWtFLE9BQU8sb0JBQVksOENBQVosRUFBNERGLElBQTVELEVBQWtFQyxHQUFsRSxDQUFQO0FBQ2xFLGVBQU8sSUFBUDtBQUNELE9BSkQ7QUFLRCxLQWJTOztBQWNWRSxJQUFBQSxNQUFNLEdBQUc7QUFDUCxhQUFPLENBQUNILElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUlELElBQUksSUFBSUEsSUFBSSxDQUFDRyxNQUFiLElBQXVCLE9BQU9ILElBQUksQ0FBQ0csTUFBWixLQUF1QixRQUFsRCxFQUE0RCxPQUFPLG9CQUFZLDJDQUFaLEVBQXlESCxJQUF6RCxFQUErREMsR0FBL0QsQ0FBUDtBQUM1RCxlQUFPLElBQVA7QUFDRCxPQUhEO0FBSUQsS0FuQlM7O0FBb0JWRyxJQUFBQSxTQUFTLEdBQUc7QUFDVixhQUFPLENBQUNKLElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUlELElBQUksSUFBSUEsSUFBSSxDQUFDSSxTQUFiLElBQTBCLE9BQU9KLElBQUksQ0FBQ0ksU0FBWixLQUEwQixTQUF4RCxFQUFtRSxPQUFPLG9CQUFZLCtDQUFaLEVBQTZESixJQUE3RCxFQUFtRUMsR0FBbkUsQ0FBUDtBQUNuRSxlQUFPLElBQVA7QUFDRCxPQUhEO0FBSUQsS0F6QlM7O0FBMEJWSSxJQUFBQSxPQUFPLEdBQUc7QUFDUixhQUFPLENBQUNMLElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUlELElBQUksSUFBSUEsSUFBSSxDQUFDSyxPQUFiLElBQXdCLE9BQU9MLElBQUksQ0FBQ0ssT0FBWixLQUF3QixTQUFwRCxFQUErRCxPQUFPLG9CQUFZLDZDQUFaLEVBQTJETCxJQUEzRCxFQUFpRUMsR0FBakUsQ0FBUDtBQUMvRCxlQUFPLElBQVA7QUFDRCxPQUhEO0FBSUQ7O0FBL0JTO0FBREMsQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjcmVhdGVFcnJvciBmcm9tICcuLi9lcnJvcic7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgdmFsaWRhdG9yczoge1xuICAgIG5hbWUoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLm5hbWUgJiYgdHlwZW9mIG5vZGUubmFtZSAhPT0gJ3N0cmluZycpIHJldHVybiBjcmVhdGVFcnJvcignbmFtZSBvZiB0aGUgWG1sIG9iamVjdCBtdXN0IGJlIGEgc3RyaW5nJywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgbmFtZXNwYWNlKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgLy8gVE9ETzogYWRkIHZhbGlkYXRpb24gdGhhdCBmb3JtYXQgaXMgdXJpXG4gICAgICAgIGlmIChub2RlICYmIG5vZGUubmFtZXNwYWNlICYmIHR5cGVvZiBub2RlLm5hbWVzcGFjZSAhPT0gJ3N0cmluZycpIHJldHVybiBjcmVhdGVFcnJvcignbmFtZXNwYWNlIG9mIHRoZSBYbWwgb2JqZWN0IG11c3QgYmUgYSBzdHJpbmcnLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBwcmVmaXgoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLnByZWZpeCAmJiB0eXBlb2Ygbm9kZS5wcmVmaXggIT09ICdzdHJpbmcnKSByZXR1cm4gY3JlYXRlRXJyb3IoJ3ByZWZpeCBvZiB0aGUgWG1sIG9iamVjdCBtdXN0IGJlIGEgc3RyaW5nJywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgYXR0cmlidXRlKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS5hdHRyaWJ1dGUgJiYgdHlwZW9mIG5vZGUuYXR0cmlidXRlICE9PSAnYm9vbGVhbicpIHJldHVybiBjcmVhdGVFcnJvcignYXR0cmlidXRlIG9mIHRoZSBYbWwgb2JqZWN0IG11c3QgYmUgYSBib29sZWFuJywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgd3JhcHBlZCgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUud3JhcHBlZCAmJiB0eXBlb2Ygbm9kZS53cmFwcGVkICE9PSAnYm9vbGVhbicpIHJldHVybiBjcmVhdGVFcnJvcignd3JhcHBlZCBvZiB0aGUgWG1sIG9iamVjdCBtdXN0IGJlIGEgYm9vbGVhbicsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICB9LFxufTtcbiJdfQ==
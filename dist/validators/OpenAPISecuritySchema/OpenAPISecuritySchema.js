"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _error = _interopRequireWildcard(require("../../error"));

var _OpenAPIFlows = _interopRequireDefault(require("./OpenAPIFlows"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; if (obj != null) { var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

var _default = {
  validators: {
    type() {
      return (node, ctx) => {
        if (!node.type) return (0, _error.createErrorMissingRequiredField)('type', node, ctx);
        if (typeof node.type !== 'string') return (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx);
        if (!['apiKey', 'http', 'oauth2', 'openIdConnect'].includes(node.type)) return (0, _error.default)('The type value can only be one of the following "apiKey", "http", "oauth2", "openIdConnect" is required for the OpenAPI Security Scheme object', node, ctx);
        return null;
      };
    },

    description() {
      return (node, ctx) => {
        if (node.description && typeof node.description !== 'string') return (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx);
        return null;
      };
    },

    name() {
      return (node, ctx) => {
        if (node.type !== 'apiKey') return null;
        if (typeof node.name !== 'string') return (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx);
        return null;
      };
    },

    in() {
      return (node, ctx) => {
        if (node.type !== 'apiKey') return null;
        if (!node.in) return (0, _error.createErrorMissingRequiredField)('in', node, ctx);
        if (typeof node.in !== 'string') return (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx);
        if (!['query', 'header', 'cookie'].includes(node.in)) return (0, _error.default)('The in value can only be one of the following "query", "header" or "cookie" for the OpenAPI Security Scheme object', node, ctx);
        return null;
      };
    },

    scheme() {
      return (node, ctx) => {
        if (node.type !== 'http') return null;
        if (!node.scheme) return (0, _error.createErrorMissingRequiredField)('scheme', node, ctx);
        if (typeof node.scheme !== 'string') return (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx);
        return null;
      };
    },

    bearerFormat() {
      return (node, ctx) => {
        if (node.bearerFormat && node.type !== 'http') return (0, _error.default)('The bearerFormat field is applicable only for http', node, ctx);
        if (!node.bearerFormat && node.type === 'http') return (0, _error.createErrorMissingRequiredField)('bearerFormat', node, ctx);
        if (node.bearerFormat && typeof node.bearerFormat !== 'string') return (0, _error.createErrrorFieldTypeMismatch)('string', node, ctx);
        return null;
      };
    },

    flows() {
      return (node, ctx) => {
        if (node.type !== 'oauth2') return null;
        if (!node.flows) return (0, _error.createErrorMissingRequiredField)('flows', node, ctx);
        return null;
      };
    },

    openIdConnectUrl() {
      return (node, ctx) => {
        if (node.type !== 'openIdConnect') return null;
        if (!node.openIdConnectUrl) return (0, _error.createErrorMissingRequiredField)('openIdConnectUrl', node, ctx);
        if (typeof node.openIdConnectUrl !== 'string') return (0, _error.createErrrorFieldTypeMismatch)('openIdConnectUrl', node, ctx);
        return null;
      };
    }

  },
  properties: {
    flows: _OpenAPIFlows.default
  }
};
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElTZWN1cml0eVNjaGVtYS9PcGVuQVBJU2VjdXJpdHlTY2hlbWEuanMiXSwibmFtZXMiOlsidmFsaWRhdG9ycyIsInR5cGUiLCJub2RlIiwiY3R4IiwiaW5jbHVkZXMiLCJkZXNjcmlwdGlvbiIsIm5hbWUiLCJpbiIsInNjaGVtZSIsImJlYXJlckZvcm1hdCIsImZsb3dzIiwib3BlbklkQ29ubmVjdFVybCIsInByb3BlcnRpZXMiLCJPcGVuQVBJRmxvd3MiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7QUFFQTs7Ozs7Ozs7ZUFFZTtBQUNiQSxFQUFBQSxVQUFVLEVBQUU7QUFDVkMsSUFBQUEsSUFBSSxHQUFHO0FBQ0wsYUFBTyxDQUFDQyxJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJLENBQUNELElBQUksQ0FBQ0QsSUFBVixFQUFnQixPQUFPLDRDQUFnQyxNQUFoQyxFQUF3Q0MsSUFBeEMsRUFBOENDLEdBQTlDLENBQVA7QUFDaEIsWUFBSSxPQUFPRCxJQUFJLENBQUNELElBQVosS0FBcUIsUUFBekIsRUFBbUMsT0FBTywwQ0FBOEIsUUFBOUIsRUFBd0NDLElBQXhDLEVBQThDQyxHQUE5QyxDQUFQO0FBQ25DLFlBQUksQ0FBQyxDQUFDLFFBQUQsRUFBVyxNQUFYLEVBQW1CLFFBQW5CLEVBQTZCLGVBQTdCLEVBQThDQyxRQUE5QyxDQUF1REYsSUFBSSxDQUFDRCxJQUE1RCxDQUFMLEVBQXdFLE9BQU8sb0JBQVksZ0pBQVosRUFBOEpDLElBQTlKLEVBQW9LQyxHQUFwSyxDQUFQO0FBQ3hFLGVBQU8sSUFBUDtBQUNELE9BTEQ7QUFNRCxLQVJTOztBQVNWRSxJQUFBQSxXQUFXLEdBQUc7QUFDWixhQUFPLENBQUNILElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ3BCLFlBQUlELElBQUksQ0FBQ0csV0FBTCxJQUFvQixPQUFPSCxJQUFJLENBQUNHLFdBQVosS0FBNEIsUUFBcEQsRUFBOEQsT0FBTyww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RUFBK0NDLEdBQS9DLENBQVA7QUFDakIsZUFBTyxJQUFQO0FBQ0QsT0FKRDtBQUtELEtBckRTOztBQXNEVlEsSUFBQUEsZ0JBQWdCLEdBQUc7QUFDakIsYUFBTyxDQUFDVCxJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNwQixZQUFJRCxJQUFJLENBQUNELElBQUwsS0FBYyxlQUFsQixFQUFtQyxPQUFPLElBQVA7QUFDbkMsWUFBSSxDQUFDQyxJQUFJLENBQUNTLGdCQUFWLEVBQTRCLE9BQU8sNENBQWdDLGtCQUFoQyxFQUFvRFQsSUFBcEQsRUFBMERDLEdBQTFELENBQVA7QUFDNUIsWUFBSSxPQUFPRCxJQUFJLENBQUNTLGdCQUFaLEtBQWlDLFFBQXJDLEVBQStDLE9BQU8sMENBQThCLGtCQUE5QixFQUFrRFQsSUFBbEQsRUFBd0RDLEdBQXhELENBQVA7QUFDL0MsZUFBTyxJQUFQO0FBQ0QsT0FMRDtBQU1EOztBQTdEUyxHQURDO0FBZ0ViUyxFQUFBQSxVQUFVLEVBQUU7QUFDVkYsSUFBQUEsS0FBSyxFQUFFRztBQURHO0FBaEVDLEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY3JlYXRlRXJyb3IsIHsgY3JlYXRlRXJyb3JNaXNzaW5nUmVxdWlyZWRGaWVsZCwgY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2ggfSBmcm9tICcuLi8uLi9lcnJvcic7XG5cbmltcG9ydCBPcGVuQVBJRmxvd3MgZnJvbSAnLi9PcGVuQVBJRmxvd3MnO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIHZhbGlkYXRvcnM6IHtcbiAgICB0eXBlKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKCFub2RlLnR5cGUpIHJldHVybiBjcmVhdGVFcnJvck1pc3NpbmdSZXF1aXJlZEZpZWxkKCd0eXBlJywgbm9kZSwgY3R4KTtcbiAgICAgICAgaWYgKHR5cGVvZiBub2RlLnR5cGUgIT09ICdzdHJpbmcnKSByZXR1cm4gY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2goJ3N0cmluZycsIG5vZGUsIGN0eCk7XG4gICAgICAgIGlmICghWydhcGlLZXknLCAnaHR0cCcsICdvYXV0aDInLCAnb3BlbklkQ29ubmVjdCddLmluY2x1ZGVzKG5vZGUudHlwZSkpIHJldHVybiBjcmVhdGVFcnJvcignVGhlIHR5cGUgdmFsdWUgY2FuIG9ubHkgYmUgb25lIG9mIHRoZSBmb2xsb3dpbmcgXCJhcGlLZXlcIiwgXCJodHRwXCIsIFwib2F1dGgyXCIsIFwib3BlbklkQ29ubmVjdFwiIGlzIHJlcXVpcmVkIGZvciB0aGUgT3BlbkFQSSBTZWN1cml0eSBTY2hlbWUgb2JqZWN0Jywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgZGVzY3JpcHRpb24oKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZS5kZXNjcmlwdGlvbiAmJiB0eXBlb2Ygbm9kZS5kZXNjcmlwdGlvbiAhPT0gJ3N0cmluZycpIHJldHVybiBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCgnc3RyaW5nJywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgbmFtZSgpIHtcbiAgICAgIHJldHVybiAobm9kZSwgY3R4KSA9PiB7XG4gICAgICAgIGlmIChub2RlLnR5cGUgIT09ICdhcGlLZXknKSByZXR1cm4gbnVsbDtcbiAgICAgICAgaWYgKHR5cGVvZiBub2RlLm5hbWUgIT09ICdzdHJpbmcnKSByZXR1cm4gY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2goJ3N0cmluZycsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIGluKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUudHlwZSAhPT0gJ2FwaUtleScpIHJldHVybiBudWxsO1xuICAgICAgICBpZiAoIW5vZGUuaW4pIHJldHVybiBjcmVhdGVFcnJvck1pc3NpbmdSZXF1aXJlZEZpZWxkKCdpbicsIG5vZGUsIGN0eCk7XG4gICAgICAgIGlmICh0eXBlb2Ygbm9kZS5pbiAhPT0gJ3N0cmluZycpIHJldHVybiBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCgnc3RyaW5nJywgbm9kZSwgY3R4KTtcbiAgICAgICAgaWYgKCFbJ3F1ZXJ5JywgJ2hlYWRlcicsICdjb29raWUnXS5pbmNsdWRlcyhub2RlLmluKSkgcmV0dXJuIGNyZWF0ZUVycm9yKCdUaGUgaW4gdmFsdWUgY2FuIG9ubHkgYmUgb25lIG9mIHRoZSBmb2xsb3dpbmcgXCJxdWVyeVwiLCBcImhlYWRlclwiIG9yIFwiY29va2llXCIgZm9yIHRoZSBPcGVuQVBJIFNlY3VyaXR5IFNjaGVtZSBvYmplY3QnLCBub2RlLCBjdHgpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH07XG4gICAgfSxcbiAgICBzY2hlbWUoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZS50eXBlICE9PSAnaHR0cCcpIHJldHVybiBudWxsO1xuICAgICAgICBpZiAoIW5vZGUuc2NoZW1lKSByZXR1cm4gY3JlYXRlRXJyb3JNaXNzaW5nUmVxdWlyZWRGaWVsZCgnc2NoZW1lJywgbm9kZSwgY3R4KTtcbiAgICAgICAgaWYgKHR5cGVvZiBub2RlLnNjaGVtZSAhPT0gJ3N0cmluZycpIHJldHVybiBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCgnc3RyaW5nJywgbm9kZSwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9O1xuICAgIH0sXG4gICAgYmVhcmVyRm9ybWF0KCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUuYmVhcmVyRm9ybWF0ICYmIG5vZGUudHlwZSAhPT0gJ2h0dHAnKSByZXR1cm4gY3JlYXRlRXJyb3IoJ1RoZSBiZWFyZXJGb3JtYXQgZmllbGQgaXMgYXBwbGljYWJsZSBvbmx5IGZvciBodHRwJywgbm9kZSwgY3R4KTtcbiAgICAgICAgaWYgKCFub2RlLmJlYXJlckZvcm1hdCAmJiBub2RlLnR5cGUgPT09ICdodHRwJykgcmV0dXJuIGNyZWF0ZUVycm9yTWlzc2luZ1JlcXVpcmVkRmllbGQoJ2JlYXJlckZvcm1hdCcsIG5vZGUsIGN0eCk7XG4gICAgICAgIGlmIChub2RlLmJlYXJlckZvcm1hdCAmJiB0eXBlb2Ygbm9kZS5iZWFyZXJGb3JtYXQgIT09ICdzdHJpbmcnKSByZXR1cm4gY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2goJ3N0cmluZycsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIGZsb3dzKCkge1xuICAgICAgcmV0dXJuIChub2RlLCBjdHgpID0+IHtcbiAgICAgICAgaWYgKG5vZGUudHlwZSAhPT0gJ29hdXRoMicpIHJldHVybiBudWxsO1xuICAgICAgICBpZiAoIW5vZGUuZmxvd3MpIHJldHVybiBjcmVhdGVFcnJvck1pc3NpbmdSZXF1aXJlZEZpZWxkKCdmbG93cycsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICAgIG9wZW5JZENvbm5lY3RVcmwoKSB7XG4gICAgICByZXR1cm4gKG5vZGUsIGN0eCkgPT4ge1xuICAgICAgICBpZiAobm9kZS50eXBlICE9PSAnb3BlbklkQ29ubmVjdCcpIHJldHVybiBudWxsO1xuICAgICAgICBpZiAoIW5vZGUub3BlbklkQ29ubmVjdFVybCkgcmV0dXJuIGNyZWF0ZUVycm9yTWlzc2luZ1JlcXVpcmVkRmllbGQoJ29wZW5JZENvbm5lY3RVcmwnLCBub2RlLCBjdHgpO1xuICAgICAgICBpZiAodHlwZW9mIG5vZGUub3BlbklkQ29ubmVjdFVybCAhPT0gJ3N0cmluZycpIHJldHVybiBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCgnb3BlbklkQ29ubmVjdFVybCcsIG5vZGUsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfTtcbiAgICB9LFxuICB9LFxuICBwcm9wZXJ0aWVzOiB7XG4gICAgZmxvd3M6IE9wZW5BUElGbG93cyxcbiAgfSxcbn07XG4iXX0=
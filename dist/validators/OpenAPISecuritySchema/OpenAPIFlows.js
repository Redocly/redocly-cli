"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _ImplicitOpenAPIFlow = _interopRequireDefault(require("./ImplicitOpenAPIFlow"));

var _PasswordOpenAPIFlow = _interopRequireDefault(require("./PasswordOpenAPIFlow"));

var _ClientCredentialsOpenAPIFlow = _interopRequireDefault(require("./ClientCredentialsOpenAPIFlow"));

var _AuthorizationCodeOpenAPIFlow = _interopRequireDefault(require("./AuthorizationCodeOpenAPIFlow"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = {
  properties: {
    implicit() {
      return _ImplicitOpenAPIFlow.default;
    },

    password() {
      return _PasswordOpenAPIFlow.default;
    },

    clientCredentials() {
      return _ClientCredentialsOpenAPIFlow.default;
    },

    authorizationCode() {
      return _AuthorizationCodeOpenAPIFlow.default;
    }

  }
};
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy92YWxpZGF0b3JzL09wZW5BUElTZWN1cml0eVNjaGVtYS9PcGVuQVBJRmxvd3MuanMiXSwibmFtZXMiOlsicHJvcGVydGllcyIsImltcGxpY2l0IiwiSW1wbGljaXRPcGVuQVBJRmxvdyIsInBhc3N3b3JkIiwiUGFzc3dvcmRPcGVuQVBJRmxvdyIsImNsaWVudENyZWRlbnRpYWxzIiwiQ2xpZW50Q3JlZGVudGlhbHNPcGVuQVBJRmxvdyIsImF1dGhvcml6YXRpb25Db2RlIiwiQXV0aG9yaXphdGlvbkNvZGVPcGVuQVBJRmxvdyJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOztBQUNBOztBQUNBOztBQUNBOzs7O2VBRWU7QUFDYkEsRUFBQUEsVUFBVSxFQUFFO0FBQ1ZDLElBQUFBLFFBQVEsR0FBRztBQUNULGFBQU9DLDRCQUFQO0FBQ0QsS0FIUzs7QUFJVkMsSUFBQUEsUUFBUSxHQUFHO0FBQ1QsYUFBT0MsNEJBQVA7QUFDRCxLQU5TOztBQU9WQyxJQUFBQSxpQkFBaUIsR0FBRztBQUNsQixhQUFPQyxxQ0FBUDtBQUNELEtBVFM7O0FBVVZDLElBQUFBLGlCQUFpQixHQUFHO0FBQ2xCLGFBQU9DLHFDQUFQO0FBQ0Q7O0FBWlM7QUFEQyxDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IEltcGxpY2l0T3BlbkFQSUZsb3cgZnJvbSAnLi9JbXBsaWNpdE9wZW5BUElGbG93JztcbmltcG9ydCBQYXNzd29yZE9wZW5BUElGbG93IGZyb20gJy4vUGFzc3dvcmRPcGVuQVBJRmxvdyc7XG5pbXBvcnQgQ2xpZW50Q3JlZGVudGlhbHNPcGVuQVBJRmxvdyBmcm9tICcuL0NsaWVudENyZWRlbnRpYWxzT3BlbkFQSUZsb3cnO1xuaW1wb3J0IEF1dGhvcml6YXRpb25Db2RlT3BlbkFQSUZsb3cgZnJvbSAnLi9BdXRob3JpemF0aW9uQ29kZU9wZW5BUElGbG93JztcblxuZXhwb3J0IGRlZmF1bHQge1xuICBwcm9wZXJ0aWVzOiB7XG4gICAgaW1wbGljaXQoKSB7XG4gICAgICByZXR1cm4gSW1wbGljaXRPcGVuQVBJRmxvdztcbiAgICB9LFxuICAgIHBhc3N3b3JkKCkge1xuICAgICAgcmV0dXJuIFBhc3N3b3JkT3BlbkFQSUZsb3c7XG4gICAgfSxcbiAgICBjbGllbnRDcmVkZW50aWFscygpIHtcbiAgICAgIHJldHVybiBDbGllbnRDcmVkZW50aWFsc09wZW5BUElGbG93O1xuICAgIH0sXG4gICAgYXV0aG9yaXphdGlvbkNvZGUoKSB7XG4gICAgICByZXR1cm4gQXV0aG9yaXphdGlvbkNvZGVPcGVuQVBJRmxvdztcbiAgICB9LFxuICB9LFxufTtcbiJdfQ==
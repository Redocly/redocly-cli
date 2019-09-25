#!/usr/bin/env node
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "validate", {
  enumerable: true,
  get: function () {
    return _validate.validate;
  }
});
Object.defineProperty(exports, "validateFromFile", {
  enumerable: true,
  get: function () {
    return _validate.validateFromFile;
  }
});
exports.default = void 0;

var _validate = require("./validate");

var _cli = _interopRequireDefault(require("./cli"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = _validate.validateFromFile;
exports.default = _default;

if (require.main === module) {
  (0, _cli.default)();
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJ2YWxpZGF0ZUZyb21GaWxlIiwicmVxdWlyZSIsIm1haW4iLCJtb2R1bGUiXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBOztBQUNBOzs7O2VBR2VBLDBCOzs7QUFFZixJQUFJQyxPQUFPLENBQUNDLElBQVIsS0FBaUJDLE1BQXJCLEVBQTZCO0FBQzNCO0FBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG5pbXBvcnQgeyB2YWxpZGF0ZUZyb21GaWxlIH0gZnJvbSAnLi92YWxpZGF0ZSc7XG5pbXBvcnQgY2xpIGZyb20gJy4vY2xpJztcblxuZXhwb3J0IHsgdmFsaWRhdGUsIHZhbGlkYXRlRnJvbUZpbGUgfSBmcm9tICcuL3ZhbGlkYXRlJztcbmV4cG9ydCBkZWZhdWx0IHZhbGlkYXRlRnJvbUZpbGU7XG5cbmlmIChyZXF1aXJlLm1haW4gPT09IG1vZHVsZSkge1xuICBjbGkoKTtcbn1cbiJdfQ==
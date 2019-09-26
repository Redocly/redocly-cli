"use strict";

var _fs = _interopRequireDefault(require("fs"));

var _traverse = _interopRequireDefault(require("../traverse"));

var _error = require("../error");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const getSource = () => _fs.default.readFileSync('./test/specs/openapi/test-3.yaml', 'utf-8');

test('', () => {
  const node = {
    field: 12,
    b: 12,
    'x-allowed': true,
    child: {
      a: 'text'
    }
  };
  const resolver = {
    validators: {
      field() {
        return (targetNode, ctx) => typeof node.field === 'string' ? null : (0, _error.createErrrorFieldTypeMismatch)('string', targetNode, ctx);
      }

    },
    properties: {
      child: {
        validators: {
          a() {
            return () => null;
          }

        }
      }
    }
  };
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9fX3Rlc3RzX18vdHJhdmVyc2UudGVzdC5qcyJdLCJuYW1lcyI6WyJnZXRTb3VyY2UiLCJmcyIsInJlYWRGaWxlU3luYyIsInRlc3QiLCJub2RlIiwiZmllbGQiLCJiIiwiY2hpbGQiLCJhIiwicmVzb2x2ZXIiLCJ2YWxpZGF0b3JzIiwidGFyZ2V0Tm9kZSIsImN0eCIsInByb3BlcnRpZXMiXSwibWFwcGluZ3MiOiI7O0FBQUE7O0FBRUE7O0FBQ0E7Ozs7QUFFQSxNQUFNQSxTQUFTLEdBQUcsTUFBTUMsWUFBR0MsWUFBSCxDQUFnQixrQ0FBaEIsRUFBb0QsT0FBcEQsQ0FBeEI7O0FBR0FDLElBQUksQ0FBQyxFQUFELEVBQUssTUFBTTtBQUNiLFFBQU1DLElBQUksR0FBRztBQUNYQyxJQUFBQSxLQUFLLEVBQUUsRUFESTtBQUVYQyxJQUFBQSxDQUFDLEVBQUUsRUFGUTtBQUdYLGlCQUFhLElBSEY7QUFJWEMsSUFBQUEsS0FBSyxFQUFFO0FBQ0xDLE1BQUFBLENBQUMsRUFBRTtBQURFO0FBSkksR0FBYjtBQVFBLFFBQU1DLFFBQVEsR0FBRztBQUNmQyxJQUFBQSxVQUFVLEVBQUU7QUFDVkwsTUFBQUEsS0FBSyxHQUFHO0FBQ04sZUFBTyxDQUFDTSxVQUFELEVBQWFDLEdBQWIsS0FBc0IsT0FBT1IsSUFBSSxDQUFDQyxLQUFaLEtBQXNCLFFBQXRCLEdBQ3pCLElBRHlCLEdBRXpCLDBDQUE4QixRQUE5QixFQUF3Q00sVUFBeEMsRUFBb0RDLEdBQXBELENBRko7QUFHRDs7QUFMUyxLQURHO0FBUWZDLElBQUFBLFVBQVUsRUFBRTtBQUNWTixNQUFBQSxLQUFLLEVBQUU7QUFDTEcsUUFBQUEsVUFBVSxFQUFFO0FBQ1ZGLFVBQUFBLENBQUMsR0FBRztBQUNGLG1CQUFPLE1BQU0sSUFBYjtBQUNEOztBQUhTO0FBRFA7QUFERztBQVJHLEdBQWpCO0FBa0JELENBM0JHLENBQUoiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgZnJvbSAnZnMnO1xuXG5pbXBvcnQgdHJhdmVyc2UgZnJvbSAnLi4vdHJhdmVyc2UnO1xuaW1wb3J0IHsgY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2ggfSBmcm9tICcuLi9lcnJvcic7XG5cbmNvbnN0IGdldFNvdXJjZSA9ICgpID0+IGZzLnJlYWRGaWxlU3luYygnLi90ZXN0L3NwZWNzL29wZW5hcGkvdGVzdC0zLnlhbWwnLCAndXRmLTgnKTtcblxuXG50ZXN0KCcnLCAoKSA9PiB7XG4gIGNvbnN0IG5vZGUgPSB7XG4gICAgZmllbGQ6IDEyLFxuICAgIGI6IDEyLFxuICAgICd4LWFsbG93ZWQnOiB0cnVlLFxuICAgIGNoaWxkOiB7XG4gICAgICBhOiAndGV4dCcsXG4gICAgfSxcbiAgfTtcbiAgY29uc3QgcmVzb2x2ZXIgPSB7XG4gICAgdmFsaWRhdG9yczoge1xuICAgICAgZmllbGQoKSB7XG4gICAgICAgIHJldHVybiAodGFyZ2V0Tm9kZSwgY3R4KSA9PiAodHlwZW9mIG5vZGUuZmllbGQgPT09ICdzdHJpbmcnXG4gICAgICAgICAgPyBudWxsXG4gICAgICAgICAgOiBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCgnc3RyaW5nJywgdGFyZ2V0Tm9kZSwgY3R4KSk7XG4gICAgICB9LFxuICAgIH0sXG4gICAgcHJvcGVydGllczoge1xuICAgICAgY2hpbGQ6IHtcbiAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgIGEoKSB7XG4gICAgICAgICAgICByZXR1cm4gKCkgPT4gbnVsbDtcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xufSk7XG4iXX0=
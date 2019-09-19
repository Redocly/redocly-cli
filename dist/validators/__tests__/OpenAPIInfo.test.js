"use strict";

var _OpenAPIInfo = require("../OpenAPIInfo");

test('OpenAPIInfo resolver format', () => {
  expect(_OpenAPIInfo.OpenAPIInfo).toMatchInlineSnapshot(`
    Object {
      "properties": Object {
        "license": Object {
          "validators": Object {
            "name": [Function],
          },
        },
      },
      "validators": Object {
        "title": [Function],
      },
    }
  `);
});
test('OpenAPIInfo resover validation of undefined title', () => {
  expect(_OpenAPIInfo.OpenAPIInfo.validators.title()(undefined, {
    path: ['info'],
    pathStack: []
  })).toMatchInlineSnapshot(`
    Object {
      "message": "Info section must include title",
      "path": "/info",
      "pathStack": Array [],
      "severity": "ERROR",
      "value": undefined,
    }
  `);
});
test('OpenAPIInfo expect properties.license format', () => {
  expect(_OpenAPIInfo.OpenAPIInfo.properties.license).toMatchInlineSnapshot(`
    Object {
      "validators": Object {
        "name": [Function],
      },
    }
  `);
});
test('OpenAPILicense resolver format', () => {
  expect(_OpenAPIInfo.OpenAPILicense).toMatchInlineSnapshot(`
    Object {
      "validators": Object {
        "name": [Function],
      },
    }
  `);
});
test('OpenAPILicense check for undefined name', () => {
  expect(_OpenAPIInfo.OpenAPILicense.validators.name()(undefined, {
    path: ['info', 'license'],
    pathStack: []
  })).toMatchInlineSnapshot(`
    Object {
      "message": "Name is required for the license object",
      "path": "/info/license",
      "pathStack": Array [],
      "severity": "ERROR",
      "value": undefined,
    }
  `);
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy92YWxpZGF0b3JzL19fdGVzdHNfXy9PcGVuQVBJSW5mby50ZXN0LmpzIl0sIm5hbWVzIjpbInRlc3QiLCJleHBlY3QiLCJPcGVuQVBJSW5mbyIsInRvTWF0Y2hJbmxpbmVTbmFwc2hvdCIsInZhbGlkYXRvcnMiLCJ0aXRsZSIsInVuZGVmaW5lZCIsInBhdGgiLCJwYXRoU3RhY2siLCJwcm9wZXJ0aWVzIiwibGljZW5zZSIsIk9wZW5BUElMaWNlbnNlIiwibmFtZSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7QUFFQUEsSUFBSSxDQUFDLDZCQUFELEVBQWdDLE1BQU07QUFDeENDLEVBQUFBLE1BQU0sQ0FBQ0Msd0JBQUQsQ0FBTixDQUFvQkMscUJBQXBCLENBQTJDOzs7Ozs7Ozs7Ozs7O0dBQTNDO0FBY0QsQ0FmRyxDQUFKO0FBaUJBSCxJQUFJLENBQUMsbURBQUQsRUFBc0QsTUFBTTtBQUM5REMsRUFBQUEsTUFBTSxDQUNKQyx5QkFBWUUsVUFBWixDQUF1QkMsS0FBdkIsR0FBK0JDLFNBQS9CLEVBQTBDO0FBQUVDLElBQUFBLElBQUksRUFBRSxDQUFDLE1BQUQsQ0FBUjtBQUFrQkMsSUFBQUEsU0FBUyxFQUFFO0FBQTdCLEdBQTFDLENBREksQ0FBTixDQUVFTCxxQkFGRixDQUV5Qjs7Ozs7Ozs7R0FGekI7QUFXRCxDQVpHLENBQUo7QUFjQUgsSUFBSSxDQUFDLDhDQUFELEVBQWlELE1BQU07QUFDekRDLEVBQUFBLE1BQU0sQ0FBQ0MseUJBQVlPLFVBQVosQ0FBdUJDLE9BQXhCLENBQU4sQ0FBdUNQLHFCQUF2QyxDQUE4RDs7Ozs7O0dBQTlEO0FBT0QsQ0FSRyxDQUFKO0FBVUFILElBQUksQ0FBQyxnQ0FBRCxFQUFtQyxNQUFNO0FBQzNDQyxFQUFBQSxNQUFNLENBQUNVLDJCQUFELENBQU4sQ0FBdUJSLHFCQUF2QixDQUE4Qzs7Ozs7O0dBQTlDO0FBT0QsQ0FSRyxDQUFKO0FBVUFILElBQUksQ0FBQyx5Q0FBRCxFQUE0QyxNQUFNO0FBQ3BEQyxFQUFBQSxNQUFNLENBQ0pVLDRCQUFlUCxVQUFmLENBQTBCUSxJQUExQixHQUFpQ04sU0FBakMsRUFBNEM7QUFDMUNDLElBQUFBLElBQUksRUFBRSxDQUFDLE1BQUQsRUFBUyxTQUFULENBRG9DO0FBRTFDQyxJQUFBQSxTQUFTLEVBQUU7QUFGK0IsR0FBNUMsQ0FESSxDQUFOLENBS0VMLHFCQUxGLENBS3lCOzs7Ozs7OztHQUx6QjtBQWNELENBZkcsQ0FBSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE9wZW5BUElJbmZvLCBPcGVuQVBJTGljZW5zZSB9IGZyb20gJy4uL09wZW5BUElJbmZvJztcblxudGVzdCgnT3BlbkFQSUluZm8gcmVzb2x2ZXIgZm9ybWF0JywgKCkgPT4ge1xuICBleHBlY3QoT3BlbkFQSUluZm8pLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG4gICAgT2JqZWN0IHtcbiAgICAgIFwicHJvcGVydGllc1wiOiBPYmplY3Qge1xuICAgICAgICBcImxpY2Vuc2VcIjogT2JqZWN0IHtcbiAgICAgICAgICBcInZhbGlkYXRvcnNcIjogT2JqZWN0IHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBbRnVuY3Rpb25dLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgXCJ2YWxpZGF0b3JzXCI6IE9iamVjdCB7XG4gICAgICAgIFwidGl0bGVcIjogW0Z1bmN0aW9uXSxcbiAgICAgIH0sXG4gICAgfVxuICBgKTtcbn0pO1xuXG50ZXN0KCdPcGVuQVBJSW5mbyByZXNvdmVyIHZhbGlkYXRpb24gb2YgdW5kZWZpbmVkIHRpdGxlJywgKCkgPT4ge1xuICBleHBlY3QoXG4gICAgT3BlbkFQSUluZm8udmFsaWRhdG9ycy50aXRsZSgpKHVuZGVmaW5lZCwgeyBwYXRoOiBbJ2luZm8nXSwgcGF0aFN0YWNrOiBbXSB9KSxcbiAgKS50b01hdGNoSW5saW5lU25hcHNob3QoYFxuICAgIE9iamVjdCB7XG4gICAgICBcIm1lc3NhZ2VcIjogXCJJbmZvIHNlY3Rpb24gbXVzdCBpbmNsdWRlIHRpdGxlXCIsXG4gICAgICBcInBhdGhcIjogXCIvaW5mb1wiLFxuICAgICAgXCJwYXRoU3RhY2tcIjogQXJyYXkgW10sXG4gICAgICBcInNldmVyaXR5XCI6IFwiRVJST1JcIixcbiAgICAgIFwidmFsdWVcIjogdW5kZWZpbmVkLFxuICAgIH1cbiAgYCk7XG59KTtcblxudGVzdCgnT3BlbkFQSUluZm8gZXhwZWN0IHByb3BlcnRpZXMubGljZW5zZSBmb3JtYXQnLCAoKSA9PiB7XG4gIGV4cGVjdChPcGVuQVBJSW5mby5wcm9wZXJ0aWVzLmxpY2Vuc2UpLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG4gICAgT2JqZWN0IHtcbiAgICAgIFwidmFsaWRhdG9yc1wiOiBPYmplY3Qge1xuICAgICAgICBcIm5hbWVcIjogW0Z1bmN0aW9uXSxcbiAgICAgIH0sXG4gICAgfVxuICBgKTtcbn0pO1xuXG50ZXN0KCdPcGVuQVBJTGljZW5zZSByZXNvbHZlciBmb3JtYXQnLCAoKSA9PiB7XG4gIGV4cGVjdChPcGVuQVBJTGljZW5zZSkudG9NYXRjaElubGluZVNuYXBzaG90KGBcbiAgICBPYmplY3Qge1xuICAgICAgXCJ2YWxpZGF0b3JzXCI6IE9iamVjdCB7XG4gICAgICAgIFwibmFtZVwiOiBbRnVuY3Rpb25dLFxuICAgICAgfSxcbiAgICB9XG4gIGApO1xufSk7XG5cbnRlc3QoJ09wZW5BUElMaWNlbnNlIGNoZWNrIGZvciB1bmRlZmluZWQgbmFtZScsICgpID0+IHtcbiAgZXhwZWN0KFxuICAgIE9wZW5BUElMaWNlbnNlLnZhbGlkYXRvcnMubmFtZSgpKHVuZGVmaW5lZCwge1xuICAgICAgcGF0aDogWydpbmZvJywgJ2xpY2Vuc2UnXSxcbiAgICAgIHBhdGhTdGFjazogW10sXG4gICAgfSksXG4gICkudG9NYXRjaElubGluZVNuYXBzaG90KGBcbiAgICBPYmplY3Qge1xuICAgICAgXCJtZXNzYWdlXCI6IFwiTmFtZSBpcyByZXF1aXJlZCBmb3IgdGhlIGxpY2Vuc2Ugb2JqZWN0XCIsXG4gICAgICBcInBhdGhcIjogXCIvaW5mby9saWNlbnNlXCIsXG4gICAgICBcInBhdGhTdGFja1wiOiBBcnJheSBbXSxcbiAgICAgIFwic2V2ZXJpdHlcIjogXCJFUlJPUlwiLFxuICAgICAgXCJ2YWx1ZVwiOiB1bmRlZmluZWQsXG4gICAgfVxuICBgKTtcbn0pO1xuIl19
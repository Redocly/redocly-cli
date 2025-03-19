
{
  "type": "string",
  "default": null,
  "nullable": true
}{
  "type": "object",
  "properties": {
    "type": {
      "schemaType": "string",
      "const": "foo"
    },
    "foo": {
      "$ref": "./SchemaWithNull.json"
    }
  }
}{
  "discriminator": {
    "propertyName": "schemaType",
    "mapping": {
      "foo": "./SchemaWithRef.json",
      "bar": "./SchemaWithNull.json"
    }
  },
  "oneOf": [
    {
      "$ref": "./SchemaWithRef.json"
    },
    {
      "type": "object",
      "properties": {
        "schemaType": {
          "schemaType": "string",
          "const": "bar"
        },
        "bar": {
          "type": "string"
        }
      }
    }
  ]
}{
  "get": {
    "responses": {
      "200": {
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/SchemaWithDiscriminator"
            }
          }
        }
      }
    }
  }
}{
  "get": {
    "responses": {
      "200": {
        "content": {
          "application/json": {
            "schema": {
              "$ref": "../components/schemas/SchemaWithDiscriminator.json"
            }
          }
        }
      }
    }
  }
}{
  "openapi": "3.0.0",
  "info": {
    "title": "Test",
    "version": "<version>"
  },
  "servers": [
    {
      "url": "https://api.server.test/v1"
    }
  ],
  "paths": {
    "/test": {
      "$ref": "paths/test.json"
    }
  }
}🪓 Document: ../../../__tests__/split/discriminator-in-json/openapi.json is successfully split
    and all related files are saved to the directory: output 

../../../__tests__/split/discriminator-in-json/openapi.json: split processed in <test>ms


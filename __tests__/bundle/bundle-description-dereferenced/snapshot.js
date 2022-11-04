// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle bundle-description-dereferenced 1`] = `
openapi: 3.1.0
security: []
paths:
  /users:
    post:
      summary: user
      description: User.
      operationId: createUser
      responses:
        '200':
          description: OK
      requestBody:
        description: Updated user object
        content:
          application/json:
            schema:
              description: Names (specific)
              $ref: '#/components/schemas/Names'
        required: true
components:
  schemas:
    Name:
      type: string
      description: Generic Name.
    Names:
      type: object
      description: names description
      properties:
        oneName:
          $ref: '#/components/schemas/Name'
          description: One name (specific).
        otherName:
          $ref: '#/components/schemas/Name'
          description: Other name (specific).

test.yaml:
  1:1  error    spec  The field \`info\` must be present on this level.

< ... 2 more problems hidden > increase with \`--max-problems N\`
❌ Validation failed with 2 errors and 1 warning.
run \`openapi lint --generate-ignore-file\` to add all problems to the ignore file.

bundling ./test.yaml...
📦 Created a bundle for ./test.yaml at stdout <test>ms.

`;

exports[`E2E bundle with option: dereferenced description should not be from $ref 1`] = `
openapi: 3.1.0
security: []
paths:
  /users:
    post:
      summary: user
      description: User.
      operationId: createUser
      responses:
        '200':
          description: OK
      requestBody:
        description: Updated user object
        content:
          application/json:
            schema:
              description: Names (specific)
              type: object
              properties: &ref_0
                oneName:
                  description: One name (specific).
                  type: string
                otherName:
                  description: Other name (specific).
                  type: string
        required: true
components:
  schemas:
    Name:
      type: string
      description: Generic Name.
    Names:
      type: object
      description: names description
      properties: *ref_0

bundling test.yaml...
📦 Created a bundle for test.yaml at stdout <test>ms.

`;

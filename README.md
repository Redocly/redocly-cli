# REVALID. Custom OpenAPI validator

## Approach

- [x] Parse yaml to object
- [x] Define rules as a hierarchy of types
- [x] Implement validation operations as a pure functions over nodes in each of the hierarchical  types
- [x] Go over the object recursively and validate nodes
- [x] Implement $ref resolving
- [x] Implement map & array fields resolving
- [x] Implement 'already visited' check to avoid multiple validations of a single sub-tree AND infinite loops in recursive objects
- [x] Implement informative error format with path to error and descriptive info message
- [x] Create folder directory for each of the validators
- [x] Implement JSON Schema format as a tree of validators
- [x] Implement OpenAPI validation
- [x] Create tests for core functions 
- [x] Add AST-based error messages
- [x] Add codeframes for errors
- [ ] Add fix proposals (e.g. "Did you mean "type: number" instead of "type: nmber"?)
- [x] Create library ready for install
- [ ] Create tests for validators

## Features

## Limitations

## Contributing

## License
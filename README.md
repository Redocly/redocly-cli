# REVALID. Custom OpenAPI validator

## Approach

- [x] Parse yaml to object
- [x] Define rules as a hierarchy of types
- [x] Implement validation operations as a pure functions over nodes in each of the hierarchical  types
- [x] Go over the object recursively and validate nodes
- [x] Implement $ref resolving
- [x] Implement map & array fields resolving
- [ ] Implement 'already validated' check to avoid multiple validations of a single sub-tree AND infinite loops in recursive objects
- [ ] Implement informative error format with path to error and descriptive info message
- [ ] Implement JSON Schema format as a tree of validators
- [ ] Implement OpenAPI validation
- [ ] Create tests
- [ ] Create library ready for install

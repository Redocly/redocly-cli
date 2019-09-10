# REVALID. Custom OpenAPI validator

## Approach

[ ] Parse yaml to object
[ ] Load a set of rule-as-a-code functions, which form a ruleset for the schema
[ ] Go over the object recursively
[ ] 

## Rule example

Each rule is a class, which specifies:
- path
- field name
- validation function
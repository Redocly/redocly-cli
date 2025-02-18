// Entry point for the grammar, supporting logical combinations
Start
  = Expression

// Main expression rule that allows logical operations between comparisons
Expression
  = LogicalExpression

// Define a logical expression to support '||' and '&&' between comparisons
LogicalExpression
  = ComparisonExpression (_ LogicalOperator _ ComparisonExpression)*

// Logical operators for AND, OR, and NOT
LogicalOperator
  = "&&" / "||" / "!" 

// Operators and logical operators
Operator
  = "==" / "!=" / "<=" / "<" / ">=" / ">"

// Comparison expressions with basic or curly expressions
ComparisonExpression
  = (CurlyExpression / BasicExpression / Value) _ (Operator _ (CurlyExpression / BasicExpression / Value))*

// Curly brace expressions to allow nested structures
CurlyExpression
  = "{" _ BasicExpression _ "}"
  / "{" _ LogicalExpression _ "}" 

BasicExpression
  = "$url"
  / "$method"
  / "$statusCode"
  / "$request." Source
  / "$response." Source
  / "$inputs." PropertyNameChain
  / OutputsExpression
  / "$steps." StepsExpression
  / "$workflows." WorkflowsExpression
  / "$sourceDescriptions." PropertyNameChain
  / "$components." PropertyNameChain
  / "$components.parameters." PropertyNameChain

// New rules for outputs with optional JSON pointer
OutputsExpression
  = "$outputs." (PropertyNameChain jsonPointer? / PropertyNameWithPointer)

// Handle steps with outputs
StepsExpression
  = PropertyName "." ("outputs." PropertyNameWithPointer / PropertyNameChain)

// Handle workflows with outputs
WorkflowsExpression
  = PropertyName "." ("outputs." PropertyNameWithPointer / PropertyNameChain)

// Property name that must be followed by a JSON pointer
PropertyNameWithPointer
  = PropertyName jsonPointer

// Chaining multiple PropertyNames with a dot
PropertyNameChain
  = PropertyName (("." _ PropertyName)*) 

// Property names for chained access (limited to specific formats)
PropertyName
  = Name
  / Number

// Reference sources
Source
  = HeaderReference
  / QueryReference
  / PathReference
  / BodyReference

HeaderReference
  = "header." Token

QueryReference
  = "query." Name

PathReference
  = "path." Name

BodyReference
  = "body" jsonPointer?

// JSON pointer to refer to specific parts of the body
jsonPointer
  = "#" JsonPathSegment*

// JSON path segments can have unescaped or escaped characters
JsonPathSegment
  = "/" (Unescaped / Escaped)*

// Valid unescaped characters
Unescaped
  = [\x21-\x2E\x30-\x39\x41-\x5A\x5F\x61-\x7A]

// Escaped characters
Escaped
  = "~" ("0" / "1")  

// Names and tokens as defined by your ABNF rules
// Name can start with a letter followed by letters, digits, underscores, or hyphens
Name
  = [a-zA-Z][a-zA-Z0-9_-]* 

// Token with specific characters
Token
  = [!#$%&'*+\-.^_`|~a-zA-Z0-9-]+

// Supported values in comparisons
Value
  = Array / Number / String / Boolean / Null / Undefined

// Allows empty array only; expand if needed
Array
  = "[" _ "]"

Number
  = Integer ("." Digits)?

Integer
  = "0" / [1-9][0-9]*

Digits
  = [0-9]+

// String literals can be enclosed in single or double quotes
String
  = DoubleQuotedString / SingleQuotedString

// String literal enclosed in double quotes
DoubleQuotedString
  = '"' [^"]* '"'

// String literal enclosed in single quotes
SingleQuotedString
  = "'" [^']* "'"

// Boolean literals for true and false
Boolean
  = "true" / "false"

// Null literal
Null
  = "null"

Undefined
  = "undefined"

// Optional whitespace handling
_ = [ \t\r\n]*

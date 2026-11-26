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
  / "$inputs." PropertyNameChain jsonPointer?
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
// A number is a property name unless it only starts a name, as in `2fa`
PropertyName
  = Number ![a-zA-Z0-9_-]
  / Name

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
// Name is the `identifier-strict` rule of Arazzo 1.1: letters, digits, underscores, or hyphens
Name
  = [a-zA-Z0-9_-]+

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

// The rules below are the runtime expression ABNF of the Arazzo specification, for a field that
// holds a single expression. Each one is a start rule: pass its name as the `startRule` option.
// The rules above parse a condition, with the names and JSON Pointers that Respect evaluates.

// https://spec.openapis.org/arazzo/v1.0.1.html#runtime-expressions
Arazzo1Expression
  = "$url"
  / "$method"
  / "$statusCode"
  / ("$request." / "$response.") (HeaderReference / ("query." / "path.") AnyName / "body" Arazzo1Fragment?)
  / ("$inputs." / "$outputs." / "$steps." / "$workflows." / "$sourceDescriptions." / "$components.") AnyName

// https://spec.openapis.org/arazzo/v1.1.0.html#runtime-expressions
Arazzo1_1Expression
  = "$url"
  / "$method"
  / "$statusCode"
  / "$self"
  / ("$request." / "$response." / "$message.") (HeaderReference / ("query." / "path.") Char* / ("body" / "payload") Arazzo1_1Fragment?)
  / ("$inputs." / "$outputs.") Identifier Arazzo1_1Fragment?
  / "$steps." Name ".outputs." Identifier Arazzo1_1Fragment?
  / "$workflows." Name "." ("inputs" / "outputs") "." Identifier Arazzo1_1Fragment?
  / "$sourceDescriptions." Name "." Char+
  / "$components." ("parameters" / "successActions" / "failureActions") "." Identifier

// `name = *( CHAR )`, and Arazzo 1.0 does not define CHAR
AnyName
  = .*

// A JSON Pointer: every character except `/` and `~` is unescaped
Arazzo1Fragment
  = "#" ("/" ([^/~] / Escaped)*)*

// Arazzo 1.1 also excludes the curly braces
Arazzo1_1Fragment
  = "#" ("/" ([^/~{}] / Escaped)*)*

// The `identifier` rule of Arazzo 1.1: a name that can contain dots
Identifier
  = [a-zA-Z0-9._-]+

// The `CHAR` rule of Arazzo 1.1: a character of a JSON string, without the curly braces
Char
  = [\x20-\x21\x23-\x5B\x5D-\x7A\x7C\x7E-\uFFFF]
  / "\\" (["\\/bfnrt] / "u" [0-9A-Fa-f] [0-9A-Fa-f] [0-9A-Fa-f] [0-9A-Fa-f])

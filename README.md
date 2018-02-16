# Table of Contents

<!-- MarkdownTOC -->

- [Installation](#installation)
- [Available Fields](#available-fields)
- [Available Keys](#available-keys)
- [Todos](#todos)
- [Fields](#fields)
	- [Number](#number)
	- [Character](#character)
	- [Date/Time](#datetime)
	- [Logical](#logical)
	- [Array](#array)
		- [Available Aliases](#available-aliases)
			- [Array of Number](#array-of-number)
			- [Array of Character](#array-of-character)
			- [Array of Date/Time](#array-of-datetime)
			- [Array of Logical](#array-of-logical)
	- [Structure](#structure)
	- [Expression](#expression)
- [Keys](#keys)
	- [Unique](#unique)
	- [Primary](#primary)
	- [No Null](#no-null)
	- [No Duplicates](#no-duplicates)
	- [Nulls & Duplicates](#nulls--duplicates)
- [Helpers](#helpers)
	- [Sysmod Fields](#sysmod-fields)
- [Examples](#examples)
	- [Simple example](#simple-example)
	- [Complexe example](#complexe-example)
- [Credits](#credits)

<!-- /MarkdownTOC -->


<a name="installation"></a>
## Installation

Just create a new ScriptLibrary for each file and copy the file content inside the new created ScriptLibrary.
Currently there is no plan to deliver a unload file.

<a name="available-fields"></a>
## Available Fields

| Type       | SM Type |
|------------|---------|
| Number     | 1       |  
| Character  | 2       |
| Date/Time  | 3       |
| Logical    | 4       |
| Array      | 8       |
| Structure  | 9       |
| Expression | 11      |

<a name="available-keys"></a>
## Available Keys

* Unique
* Primary
* No Nulls
* No Duplicates
* Nulls & Duplicates

<a name="todos"></a>
## Todos

- [] more documentation for each field
- [] Add more options
- [] Add new method to modify/extend a existing table
- [] Make it easier to modify SQL field options

<a name="fields"></a>
## Fields

<a name="number"></a>
### Number

```js
builder.addNumber('fieldname');
```

<a name="character"></a>
### Character

```js
builder.addCharacter('fieldname');
```

<a name="datetime"></a>
### Date/Time

```js
builder.addDatetime('fieldname');
```

<a name="logical"></a>
### Logical

```js
builder.addLogical('fieldname');
```

<a name="array"></a>
### Array

```js
builder.addArray('fieldname', {}, function(item) {
	//all field types are allowed
});
```

<a name="available-aliases"></a>
#### Available Aliases

<a name="array-of-number"></a>
##### Array of Number

```js
builder.addArrayOfNumber('fieldname');
```

<a name="array-of-character"></a>
##### Array of Character

```js
builder.addArrayOfCharacter('fieldname');
```

<a name="array-of-datetime"></a>
##### Array of Date/Time

```js
builder.addArrayOfDatetime('fieldname');
```

<a name="array-of-logical"></a>
##### Array of Logical

```js
builder.addArrayOfLogical('fieldname');
```

<a name="structure"></a>
### Structure

```js
builder.addStructure("filter", {}, function(item) {
	item.addCharacter("filter.sql");
});
```

<a name="expression"></a>
### Expression 

```js
builder.addExpression('fieldname');
```

<a name="keys"></a>
## Keys

<a name="unique"></a>
### Unique

```js
builder.addUniqueKey(['fieldname']);
```

<a name="primary"></a>
### Primary

```js
builder.addPrimaryKey(['fieldname']);
```

<a name="no-null"></a>
### No Null

```js
builder.addNoNullKey(['fieldname']);
```

<a name="no-duplicates"></a>
### No Duplicates

```js
builder.addNoDuplicateKey(['fieldname']);
```

<a name="nulls--duplicates"></a>
### Nulls & Duplicates

```js
builder.addNullDuplicateKey(['fieldname']);
```

<a name="helpers"></a>
## Helpers

<a name="sysmod-fields"></a>
### Sysmod Fields

Instead of 

```js
builder.addCharacter('sysmoduser');
builder.addDatetime('sysmodtime');
builder.addNumber('sysmodcount');
```

in your definition, you can use this:
```js
builder.withSysmodFields();
```

<a name="examples"></a>
## Examples

<a name="simple-example"></a>
### Simple example

```js
var tableBuilder = system.library.tableBuilder.getClass();


var simpleTable = new tableBuilder();

tableClass.make('simpletable', function(builder) {
	
	builder.addNumber('id');
	builder.addLogical('is_active');
	builder.addCharacter('sysmoduser');
	builder.addDatetime('sysmodtime');
	builder.addNumber('sysmodcount');
	
	builder.addUniqueKey(['id']);
});

```

Expected result after running the code:

You should see a new entry in your `Messages` with something like:

```
Table simpletable has been created successfully.
```


<a name="complexe-example"></a>
### Complexe example

```js

var tableBuilder = system.library.tableBuilder.getClass();


var complex = new tableBuilder();

tableClass.make('complextable', function(builder) {
	
	builder.addNumber('id');
	builder.addLogical('is_active');

	builder.addArray("longdescription", {}, function(item) {
		item.addCharacter("longdescription");
	});
	
	builder.addStructure("filter", {}, function(item) {
		item.addCharacter("filter.sql");
	});
	
	builder.addArray("rule", {}, function(item) {
		item.addStructure("rule", {}, function(subitem) {
			subitem.addNumber("ruleId");
		});
	});

	builder.withSysmodFields();
	
	builder.addUniqueKey(['id']);

});

```

Expected result after running the code:

You should see a new entry in your `Messages` with something like:

```
Table complextable has been created successfully.
```


<a name="credits"></a>
## Credits

Special thanks goes to:

*  [yim OHG](https://www.y-im.de) - My old company :heart: My first version was built there and this version includes also some parts from Version 1 (see inline mentions ;) )
* [ironboy](https://github.com/ironboy) - He is the creator of the awesome [classier](https://github.com/ironboy/classier) package. I had to modify the class a bit to make it work inside the HPSM.

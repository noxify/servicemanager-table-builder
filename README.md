# Table of Contents

<!-- MarkdownTOC -->

- [Installation](#installation)
- [Supported Databases](#supported-databases)
- [Make a table](#make-a-table)
- [Update a table](#update-a-table)
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
- [Modify Methods](#modify-methods)
	- [renameField](#renamefield)
- [Field Options](#field-options)
	- [Set SQL Type](#set-sql-type)
	- [Set SQL Field Name](#set-sql-field-name)
	- [Set SQL Table](#set-sql-table)
- [Keys](#keys)
	- [Unique](#unique)
	- [Primary](#primary)
	- [No Null](#no-null)
	- [No Duplicates](#no-duplicates)
	- [Nulls & Duplicates](#nulls--duplicates)
- [Helpers](#helpers)
	- [Sysmod Fields](#sysmod-fields)
- [Examples](#examples)
	- [Simple create example](#simple-create-example)
	- [Complexe create example](#complexe-create-example)
	- [Modify table example](#modify-table-example)
- [Credits](#credits)

<!-- /MarkdownTOC -->


<a id="installation"></a>
## Installation

Just create a new ScriptLibrary for each file and copy the file content inside the new created ScriptLibrary.
Currently there is no plan to deliver a unload file.

<a id="supported-databases"></a>
## Supported Databases
* MSSQL - tested with SM 9.52 and SM9.60
* Postgres - tested with ITSMA ( SM9.52 )

<a id="make-a-table"></a>
## Make a table

To create a new dbdict table, you have to use the `make` method.

```js
var tableBuilder = system.library.tableBuilder.getClass();


var schema = new tableBuilder();

schema.make('complextable', function(builder) {

	/**
	 * Allowed methods are:
	 * * all methods to add a field
	 * * all methods to add a key
	 */

});
```


<a id="update-a-table"></a>
## Update a table

To update a existing dbdict table, you have to use the `modify` method.

```js
var tableBuilder = system.library.tableBuilder.getClass();


var schema = new tableBuilder();

schema.modify('complextable', function(builder) {

	/**
	 * Allowed methods are:
	 * * all methods to add a field
	 * * all methods to add a key
	 * * rename a field
	 */

});
```


<a id="available-fields"></a>
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

<a id="available-keys"></a>
## Available Keys

* Unique
* Primary
* No Nulls
* No Duplicates
* Nulls & Duplicates

<a id="todos"></a>
## Todos

- [] more documentation for each field
- [] Add more options

<a id="fields"></a>
## Fields

<a id="number"></a>
### Number

```js
builder.addNumber('fieldname');
```

<a id="character"></a>
### Character

```js
builder.addCharacter('fieldname');
```

<a id="datetime"></a>
### Date/Time

```js
builder.addDatetime('fieldname');
```

<a id="logical"></a>
### Logical

```js
builder.addLogical('fieldname');
```

<a id="array"></a>
### Array

```js
builder.addArray('fieldname', function(item) {
	//all field types are allowed
});
```


<a id="available-aliases"></a>
#### Available Aliases


<a id="array-of-number"></a>
##### Array of Number

```js
builder.addArrayOfNumber('fieldname');
```

<a id="array-of-character"></a>
##### Array of Character

```js
builder.addArrayOfCharacter('fieldname');
```

<a id="array-of-datetime"></a>
##### Array of Date/Time

```js
builder.addArrayOfDatetime('fieldname');
```

<a id="array-of-logical"></a>
##### Array of Logical

```js
builder.addArrayOfLogical('fieldname');
```

<a id="structure"></a>
### Structure

```js
builder.addStructure("filter", function(item) {
	item.addCharacter("filter.sql");
});
```

<a id="expression"></a>
### Expression 

```js
builder.addExpression('fieldname');
```

<a id="modify-methods"></a>
## Modify Methods

<a id="renamefield"></a>
### renameField

Currently, the rename works only for simple fields (`number`, `character`, `date/time`, `logical`).

Rename the field, but keep the SQL Name
```js
builder.renameField('is_active', 'isActive');
```

Rename the field and update the SQL Name.
```js
builder.renameField('is_active', 'isActive', true);
```

<a id="field-options"></a>
## Field Options

<a id="set-sql-type"></a>
### Set SQL Type

For common fields, you can change field SQL Type.

```js
builder.addCharacter("textfield").setSqlType("NVARCHAR(100)");
``` 

<a id="set-sql-field-name"></a>
### Set SQL Field Name

Overwrites the default sql field name with the defined value.

```js
builder.addCharacter("textfield").setSqlName("AWESOMETEXTFIELD");
```

<a id="set-sql-table"></a>
### Set SQL Table

If you want, you can move a field to another table alias (e.g. from M1 to M2).

> :exclamation: All following fields will be attached to `M2`. 
> If you want only one field in a new table, add the field at the end of your definition
> or add `.setSqlTable("M1")` to the next field. 
> 
> This is an HPSM problem - I have tested it with the dbdidct utilities and the result was the same!

```js
builder.addCharacter("textfield").setSqlTable("M2");
```

<a id="keys"></a>
## Keys

<a id="unique"></a>
### Unique

```js
builder.addUniqueKey(['fieldname']);
```

<a id="primary"></a>
### Primary

```js
builder.addPrimaryKey(['fieldname']);
```

<a id="no-null"></a>
### No Null

```js
builder.addNoNullKey(['fieldname']);
```

<a id="no-duplicates"></a>
### No Duplicates

```js
builder.addNoDuplicateKey(['fieldname']);
```

<a id="nulls--duplicates"></a>
### Nulls & Duplicates

```js
builder.addNullDuplicateKey(['fieldname']);
```

<a id="helpers"></a>
## Helpers

<a id="sysmod-fields"></a>
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

<a id="examples"></a>
## Examples

<a id="simple-create-example"></a>
### Simple create example

```js
var tableBuilder = system.library.tableBuilder.getClass();


var schema = new tableBuilder();

schema.make('simpletable', function(builder) {
	
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

<a id="complexe-create-example"></a>
### Complexe create example

```js

var tableBuilder = system.library.tableBuilder.getClass();


var schema = new tableBuilder();

schema.make('complextable', function(builder) {
	
	builder.addNumber('id');
	builder.addLogical('is_active');

	builder.addArray("longdescription", function(item) {
		item.addCharacter("longdescription");
	});
	
	builder.addStructure("filter", function(item) {
		item.addCharacter("filter.sql");
	});
	
	builder.addArray("rule", function(item) {
		item.addStructure("rule", function(subitem) {
			subitem.addNumber("ruleId");
		});
	});

	builder.withSysmodFields();
	
	builder.addUniqueKey(['id']);

});

```

<a id="modify-table-example"></a>
### Modify table example

```js

var tableBuilder = system.library.tableBuilder.getClass();


var schema = new tableBuilder();

schema.modify('complextable', function(builder) {
	//add a new field to the existing table
	builder.addNumber('reference.id');
	builder.renameField('is_active', 'isActive', true);	
});


```

Expected result after running the code:

You should see a new entry in your `Messages` with something like:

```
Table complextable has been created successfully.
```

<a id="credits"></a>
## Credits

Special thanks goes to:

*  [yim OHG](https://www.y-im.de) - My old company :heart: My first version was built there and this version includes also some parts from Version 1 (see inline mentions ;) )
* [ironboy](https://github.com/ironboy) - He is the creator of the awesome [classier](https://github.com/ironboy/classier) package. I had to modify the class a bit to make it work inside the HPSM.

# sm-table-creator

JS Library to create a new DBDICT via JS in HPSM

## Installation

Just create a new SL for each file and copy the file content inside the new created SLs :)

## Available Fields

| Type      | SM Type |
|-----------|---------|
| Number    | 1       |  
| Character | 2       |
| Date/Time | 3       |
| Logical   | 4       |
| Array     | 8       |
| Structure | 9       |

## Available Keys

* Unique
* Primary
* No Nulls
* No Duplicates
* Nulls & Duplicates

## Todos

- [ ] more documentation for each field
- [ ] Add more options
- [ ] Add more field types
- [ ] Add some aliases for Array fields 
- [ ] Add new method to modify/extend a existing table
- [ ] Make it easier to modify SQL field options

## Examples

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

	builder.addCharacter('sysmoduser');
	builder.addDatetime('sysmodtime');
	builder.addNumber('sysmodcount');

	builder.addUniqueKey(['id']);

});

```

Expected result after running the code:

You should see a new entry in your `Messages` with something like:

```
Table complextable has been created successfully.
```


## Credits

Special thanks goes to:

*  [yim OHG](https://www.y-im.de) - My old company :heart: My first version was built there and this version includes also some parts from Version 1 (see inline mentions ;) )
* [ironboy](https://github.com/ironboy) - He is the creator of the awesome [classier](https://github.com/ironboy/classier) package. I had to modify the class a bit to make it work inside the HPSM.

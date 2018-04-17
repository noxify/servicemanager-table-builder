var tableBuilderClass = system.library.tableBuilder.getClass();


var schema = new tableBuilderClass();

schema.make( "testtable001", function(builder) {
	
	builder.addNumber("field1");
	builder.addCharacter("field2");
	builder.addDatetime("field3");
	builder.addLogical("field4");
	
	builder.addArray("field5", function(item5) {
		item5.addNumber("field5");
	});
	
	builder.addArray("field6", function(item6) {
		item6.addCharacter("field6");
	});
	
	builder.addArray("field7", function(item7) {
		item7.addDatetime("field7");
	});
	
	builder.addArray("field8", function(item8) {
		item8.addLogical("field8");
	});
	
	builder.addArray("field9", function(item9) {
		item9.addExpression("field9");
	});
	
	builder.addArray("field10", function(item10) {
		item10.addArray("field10", function(subitem10) {
			subitem10.addArray("field10", function(subsubitem10) {
				subsubitem10.addCharacter("field10");		
			});
		});
	});
	
	builder.addArrayOfNumber("field11");	
	builder.addArrayOfCharacter("field12");
	builder.addArrayOfDatetime("field13");
	builder.addArrayOfLogical("field14");

	
	
	builder.addStructure("field15", function(item15) {
		item15.addCharacter("field16");
	});
	
	builder.addArray("field17", function(item17) {
		item17.addStructure("field17", function(subitem18) {
			subitem18.addNumber("field18");
			subitem18.addCharacter("field19");
			subitem18.addDatetime("field20");
			subitem18.addLogical("field21");
			
			subitem18.addArray("field22", function(subsubitem22) {
				subsubitem22.addNumber("field22");
			});
			
			subitem18.addArray("field23", function(subsubitem23) {
				subsubitem23.addCharacter("field23");
			});
			
			subitem18.addArray("field24", function(subsubitem24) {
				subsubitem24.addDatetime("field24");
			});
			
			subitem18.addArray("field25", function(subsubitem25) {
				subsubitem25.addLogical("field25");
			});
			
			subitem18.addArray("field26", function(subsubitem26) {
				subsubitem26.addExpression("field26");
			});
			
			subitem18.addArrayOfNumber("field27");	
			subitem18.addArrayOfCharacter("field28");
			subitem18.addArrayOfDatetime("field29");
			subitem18.addArrayOfLogical("field30");
					
		});
	});
	
	builder.withSysmodFields();
	
	builder.addUniqueKey(['field1']);
	builder.addPrimaryKey(['field2']);
	builder.addNoNullKey(['field2']);
	builder.addNoDuplicateKey(['field2', 'field3']);
	builder.addNullDuplicateKey(['field4']);
	
});

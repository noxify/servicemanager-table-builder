/**
 * MIT License
 * Copyright (c) 2018 Marcus Reinhardt <webstone@gmail.com>
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */ 

var $ = system.library.c.$;
var _ = system.library.Underscore.require();
var JSON = system.library.JSON.json();
var classier = system.library.classier.getClass();
var debugUtils = system.library.debugUtils;
var helper_nullsub = system.functions.nullsub;

var tableBuilder = classier.$extend({

    /**
     * Class name
     */
    _class : "tableBuilder",
    
    /**
     * init function
     */
    __init__ : function() {
        this.definedTables = {};
        this.convertedFields = [];
        this.convertedKeys = [];
        this.dbdictObject = {};
        this.isModify = false;
    },

    /**
     * Wrapper to create a new dbdict 
     * define the fields, keys and other stuff
     * 
     * It handles all other method calls to make the definition as easy as possible
     *
     * @param      {String}     name      The table name
     * @param      {Function}   callback  The callback
     */
    make : function(name, callback) {
        
        try {
            this.define(name, callback);
            var dbdict = this.prepareTable(name);
            this.createSQLTable(dbdict);
        } catch(e) {
            print(e);
        } finally {
            this.cleanup();
        }

        return;
    },

    /**
     * Wrapper to modify an existing dbdict 
     * define the fields, keys and other stuff
     * 
     * It handles all other method calls to make the definition as easy as possible
     *
     * @param      {String}     name      The table name
     * @param      {Function}   callback  The callback
     */
    modify : function(name, callback) {

        try {
            this.isModify = true;
            this.dbdictObject = this.getDbdictObject(name);

            this.define(name, callback);
            var dbdict = this.prepareExistingTable(name);

            this.modifyTable(dbdict);

            print("Table "+name+" has been updated successfully.");

        } catch(e) {
            print(e);
        } finally {
            this.cleanup();
        }

        return;    
    },

    /**
     * Internal function which calls the factory class
     * to create new fields, keys and other stuff inside
     * the make method.
     *
     * @param      {String}    name      The table name
     * @param      {Function}  callback  The callback
     *
     * @return     {Object} The Factory response
     */
    define : function(name, callback) { 
        var builder = new factoryClass(this.dbdictObject, this.isModify);

        this.definedTables[name] = builder;

        if( typeof callback === 'function') {
            return callback.call(this, builder);
        }
    },

    /**
     * Creates a new temporary dbdict file
     * with all given definitions
     *
     * @param      {string}  name    The table name
     *
     * @return     {SCFile}
     */
    prepareTable : function(name) {

        this.convertDefinition(name);

        var dbdict = $('dbdict').select('name="' + name + '"').uniqueResult();

        if( dbdict == null ) {
            dbdict = new SCFile('dbdict');
            dbdict['name'] = name;
        } else {
            throw "table already there!";
        }

        _.each(this['convertedFields'], function(field, index) {  

            dbdict['field'][index]['name'] = field['name'];
            dbdict['field'][index]['type'] = field['type'];
            dbdict['field'][index]['index'] = field['index'];
            dbdict['field'][index]['level'] = field['level'];
            
            if( field['sql.field.options'] ) {
                _.each( field['sql.field.options'], function(value, key) {
                    dbdict['field'][index]['sql.field.options'][key] = value;
                });
            }
            
        });
        
        _.each(this['convertedKeys'], function(key, index) {
            dbdict['key'][index]['name'] = key['name'];
            dbdict['key'][index]['flags'] = key['flags'];
        });
        
        return dbdict;
    },

    /**
     * Get the existing dbdict file and prepare it 
     * with all given definitions
     *
     * @param      {string}  name    The table name
     *
     * @return     {SCFile}
     */
    prepareExistingTable : function(name) {

        this.convertDefinition(name);

        var dbdict = $('dbdict').select('name="' + name + '"').uniqueResult();

        if( dbdict == null ) {
            throw "table does not exists. Please use the make method to create a new dbdict!";
        }

        var nLastFieldIndex = this.getLastFieldIndex()+1;

        _.each(this['convertedFields'], function(field) {  

            //TODO: find a better way for this
            if( field['useExistingIndex'] ) {

                dbdict['field'][field.getIndex()]['name'] = field['name'];
                dbdict['field'][field.getIndex()]['type'] = field['type'];
                dbdict['field'][field.getIndex()]['index'] = field['index'];
                dbdict['field'][field.getIndex()]['level'] = field['level'];
                
                if( field['sql.field.options'] ) {
                    _.each( field['sql.field.options'], function(value, key) {
                        dbdict['field'][field.getIndex()]['sql.field.options'][key] = value;
                    });
                }

            } else {

                dbdict['field'][nLastFieldIndex]['name'] = field['name'];
                dbdict['field'][nLastFieldIndex]['type'] = field['type'];
                dbdict['field'][nLastFieldIndex]['index'] = field['index'];
                dbdict['field'][nLastFieldIndex]['level'] = field['level'];
                
                if( field['sql.field.options'] ) {
                    _.each( field['sql.field.options'], function(value, key) {
                        dbdict['field'][nLastFieldIndex]['sql.field.options'][key] = value;
                    });
                }

                nLastFieldIndex++;
            }
            
        });
        
        
        var nLastKeyIndex = this.getLastKeyIndex()+1;

        _.each(this['convertedKeys'], function(key) {
            dbdict['key'][nLastKeyIndex]['name'] = key['name'];
            dbdict['key'][nLastKeyIndex]['flags'] = key['flags'];
            nLastKeyIndex++;
        });
        
        return dbdict;
    },

    /**
     * Creates a dbdict & sql table.
     * 
     * @author     yim OHG, info@y-im.de
     *
     * @param      {SCFile}   dbdict  The dbdict file
     *
     * @return     {boolean} 
     */
    createSQLTable : function(dbdict) {

        /*
         * it seems, that `callrad` is a hidden function
         * found it in the following ScriptLibraries 
         * - ContentPackHelper
         * - CITypeService
         */ 
        
        var rc = callrad("fcreate", ["record"], [dbdict]); 
    
        if (rc == RC_SUCCESS) {
            print("Table "+dbdict['name']+" has been created successfully.");
            return true;
        } else {
            print("Something went wrong while creating table "+dbdict['name']+".");
            print("Return Code: "+rc+" - "+RCtoString(rc));
            return false;
        }
    },

    /**
     * Saves the dbdict modifications and updates the SQL Table
     *
     * @param      {SCFile}  dbdict  The dbdict
     *
     * @return     {Boolean}
     */
    modifyTable : function(dbdict) {

        if (this.saveSqlChanges(dbdict) == true) {
            return this.saveChanges(dbdict);
        } else {
            throw "Unable to save the changes to SQL";
        }
    },

    /**
     * Saves changes into the dbdict.
     *
     * @param      {SCFile}   dbdict  The dbdict
     *
     * @return     {boolean}
     */
    saveChanges : function(dbdict) {
        var rcUpdate = dbdict.doUpdate();
            
        if ( rcUpdate == RC_SUCCESS) {
            return true;
        } else {
            throw "Unable to save Dbdict: "+rcUpdate;
        }
    },

    /**
     * Saves the sql changes.
     *
     * @param      {SCFile}  dbdict  The dbdict
     *
     * @return     {Boolean}
     */
    saveSqlChanges : function(dbdict) {
        
        var rteReturnValue ;
        var rteNames = new SCDatum();
        var rteValues = new SCDatum();      
        rteNames.push("record");          
        rteNames.push("all.null");
        rteNames.push("boolean1");
        rteValues.setType(8);
        
        rteValues.push(dbdict);
        rteValues.push(true);
        rteValues.push(true);
        
        var rteReturnValue = new SCDatum();
        
        //this rad app will have to run in the same thread
        var result = system.functions.rtecall("callrad", 
                                rteReturnValue, 
                                "dbdict.sql.changes", //RAD app name
                                rteNames, 
                                rteValues,
                                false); //false to run in same thread, true to run in new thread
        
        return  result;
    },

    /**
     * Converts the given Definition of fields and keys
     * and adds also the descriptor field
     *
     * @param      {String}  name    The table name
     */
    convertDefinition : function(name) {
        
        var objTable = this.getDefintion(name);
        
        this.convertFields( objTable['fields'] );
        this.convertKeys( objTable['keys'] );

        if( this.isModify ) {
            this.convertModifiedFields( objTable['modifyFields'] );
        }

        if( !this.hasDescriptor() && !this.isModify ) {
            this.addDescriptor();
        }

        return this;
    },

    /**
     * Converts the added fields for each key definition to a usable object for HPSM
     *
     * @param      {Object}  fields  The fields
     * @param      {Object}  parent  The parent
     * 
     * @return     {Object}
     */
    convertFields : function( fields, parent ) {

        var that = this;

        var level = (parent) ? parent.getLevel()+1 : 1;
        var index = (this.isModify && !parent) ? this.getLastFieldIndex()+1 : 1; 

        _.each(fields, function(field) {
            field.setLevel(level);
            field.setIndex(index);

            that.convertedFields.push(field);

            if( field.hasChildren() ) {
                that.convertFields(field['children'], field);
            }
            
            index++;

            delete field['children'];
            delete field['attributes'];
        });

        return that;
    },

    /**
     * Converts the modified fields for each key definition to a usable object for HPSM
     *
     * @param      {Object}  fields  The fields
     * @param      {Object}  parent  The parent
     * 
     * @return     {Object}
     */
    convertModifiedFields : function( fields, parent ) {

        var that = this;

        _.each(fields, function(field) {

            JSON.stringify(field, "", "    ");
            field.setLevel(field['attributes']['level']);
            field.setIndex(field['attributes']['index']);

            that.convertedFields.push(field);

            delete field['children'];
            delete field['attributes'];
        });

        return that;
    },

    /**
     * Converts each key definition to a usable object for HPSM
     *
     * @param      {Object}  keys    The keys
     *
     * @return     {Object}
     */
    convertKeys : function( keys ) {
        var that = this;

        _.each(keys, function(key) {
            delete key['attributes'];
            that.convertedKeys.push(key);
        });

        return this;
    },

    /**
     * Gets the defintion.
     *
     * @param      {String}  name    The tablename
     *
     * @return     {Object}  The defintion.
     */
    getDefintion : function(name) {
        return this['definedTables'][name];
    },

    /**
     * Determines if it has descriptor field.
     *
     * @author     yim OHG, info@y-im.de
     *
     * @return     {Boolean}  True if has descriptor, False otherwise.
     */
    hasDescriptor : function() {
        var findDescriptor = _.find(this.convertedFields, function(field){
            return field['name'] == "descriptor";
        });

        return !_.isUndefined(findDescriptor);
    },

    /**
     * Adds a descriptor.
     *
     * @author     yim OHG, info@y-im.de
     *
     * @return     {Object}
     */
    addDescriptor : function() {

        var objDescriptor = {
            'name' : 'descriptor',
            'type' : 9,
            'level' : 0,
            'index' : 1
        };

        this.convertedFields.unshift(objDescriptor);

        return this;
    },

    /**
     * Gets the dbdict as object.
     *
     * @param      {Character}  cTablename   The tablename
     *
     * @return     {Object}  The dbdict object.
     */
    getDbdictObject : function(cTablename) {
        var fDbdict = $('dbdict').select('name="'+cTablename+'"').uniqueResult();
        var xmlNode = fDbdict.getXML();
        var objFile = new Parser(xmlNode).toJSON();
        return objFile;
    },

    /**
     * Gets the last field index.
     *
     * @return     {Number}  The last field index.
     */
    getLastFieldIndex : function() {
        var objLastField = _.last(this['dbdictObject']['instance']['field']);
        return system.functions.val(objLastField['index'],1);
    },
    
    /**
     * Gets the last key index.
     *
     * @return     {Number}  The last key index.
     */
    getLastKeyIndex : function() {
        return system.functions.val(this['dbdictObject']['instance']['key'].length,1);
    },

    /**
     * Remove all temporary generated stuff
     * Without this, we will have some memory leaks ;)
     */
    cleanup : function() {
        this.definedTables = {};
        this.convertedFields = [];
        this.convertedKeys = [];
        this.dbdictObject = {};
        this.isModify = false;
    }
});

var factoryClass = classier.$extend({

    _class : "factoryClass",

    /**
     * Init Function
     */
    __init__ : function(dbdictObject, isModify) {
        this.fields = [];
        this.modifyFields = [];
        this.deleteFields = [];
        this.keys = [];
        this.dbdictObject = dbdictObject;
        this.isModify = isModify;
        this.sqlInfo = new sqlInfo();
    },

    /**
     * Adds a field.
     *
     * @param      {Object}       properties  The properties
     *
     * @return     {dbdictField}
     */
    addField : function(properties) {
        
        if( this.isModify ) {
            if( this.fieldExists(properties['name']) ) {
                print("Field "+properties['name']+" already exists.");
                return null;
            }
        } 

        properties['sql.field.options'] = {};
        var field = new dbdictField(properties);
        this.fields.push(field);
        return field;
    },

    /**
     * Renames a field
     *
     * @param      {Character}       currentField  The current field
     * @param      {Character}       newName       The new name
     * @param      {Boolean}         withSql       Rename also the SQL Name
     *
     * @return     {dbdictField} 
     */
    renameField : function(currentField, newName, withSql) {
        if( !this.isModify ) {
            return null;
        }

        var objField = _.findWhere(this.dbdictObject['instance']['field'], {'name': currentField});

        /**
         * currently only number, character, date/time and logical fields are allowed
         * TODO: check how we can implement all field types
         * We have to ensure, that all depths are renamed (e.g. array of array of array of array of character)
         */
        if( !objField || objField['level'] == 0 || objField['type'] == 8 || objField['type'] == 9 || objField['type'] == 11 ) {
            return null;
        }

        var properties = {
            'name' : newName,
            'type' :  system.functions.val(objField['type'], 1),
            'attributes' : {
                'level' : system.functions.val(objField['level'], 1),
                'index' : system.functions.val(objField['index'], 1),
                'useExistingIndex' : true
            },
            'sql.field.options' : {}
        };

        if( withSql ) {
            properties['sql.field.options']['sql.column.name'] = null;

        }

        var field = new dbdictField(properties);
        this.modifyFields.push(field);

        return field;
    },

    /**
     * Sets the length.
     *
     * @param      {string}       currentField  The current field
     * @param      {string}       newLength     The new length
     *
     * @return     {dbdictField}
     */
    setLength : function(currentField, newLength) {
        if( !this.isModify ) {
            return null;
        }

        var objField = _.findWhere(this.dbdictObject['instance']['field'], {'name': currentField});
        var hasSize = this.sqlInfo.hasSize(objField['type']);
        
        if( !objField || objField['level'] == 0 || !hasSize ) {
            return null;
        }

        var properties = {
            'name' : currentField,
            'type' :  system.functions.val(objField['type'], 1),
            'attributes' : {
                'level' : system.functions.val(objField['level'], 1),
                'index' : system.functions.val(objField['index'], 1),
                'useExistingIndex' : true
            },
            'sql.field.options' : {
                'sql.data.type' : this.sqlInfo.getSQLType(objField['type'])+'('+newLength+')'
            }
        };

        var field = new dbdictField(properties);
        this.modifyFields.push(field);

        return field;
    },

    /**
     * Adds a key.
     *
     * @param      {Object}     properties  The properties
     *
     * @return     {dbdictKey}
     */
    addKey : function(properties) {
        var key = new dbdictKey(properties);
        this.keys.push(key);
        return key;
    },

    /**
     * Adds a number field
     *
     * @param      {string}  fieldname   The fieldname
     * @param      {Object}  attributes  The attributes
     *
     * @return     {dbdictField}
     */
    addNumber : function(fieldname) {
        var type = 1;

        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : {}
        };
        return this.addField( properties ); 
    },

    /**
     * Adds a character field
     *
     * @param      {string}  fieldname   The fieldname
     * @param      {Object}  attributes  The attributes
     *
     * @return     {dbdictField}
     */
    addCharacter : function(fieldname) {
        var type = 2;

        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : {}
        };
        return this.addField( properties ); 
    },

    /**
     * Adds a date/time field
     *
     * @param      {string}  fieldname   The fieldname
     * @param      {Object}  attributes  The attributes
     *
     * @return     {dbdictField}
     */
    addDatetime : function(fieldname) {
        
        var type = 3;

        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : {}
        };

        return this.addField( properties ); 
    },

    /**
     * Adds a logical field
     *
     * @param      {string}  fieldname   The fieldname
     * @param      {Object}  attributes  The attributes
     *
     * @return     {dbdictField}
     */
    addLogical : function(fieldname) {
        
        var type = 4;

        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : {}
        };

        return this.addField( properties ); 
    },   

    /**
     * Adds an array field
     *
     * @param      {string}  fieldname   The fieldname
     * @param      {Object}  attributes  The attributes
     * @param      {Function}  callback    The callback
     *
     * @return     {dbdictField}
     */
    addArray : function(fieldname, callback) {
        
        var type = 8;

        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : {}
        };

        var field = this.addField( properties ); 

        if( typeof callback === 'function') {
            return callback.call(this, field);
        }

        return field;
    },

    /**
     * Adds a structure field
     *
     * @param      {string}  fieldname   The fieldname
     * @param      {Object}  attributes  The attributes
     * @param      {Function}  callback    The callback
     *
     * @return     {dbdictField}
     */
    addStructure : function(fieldname, callback) {
        
        var type = 9;

        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : {}
        };

        var field = this.addField( properties ); 

        if( typeof callback === 'function') {
            return callback.call(this, field);
        }

        return field;
    },

    /**
     * Adds an expression field.
     *
     * @param      {string}  fieldname   The fieldname
     * @param      {Object}  attributes  The attributes
     *
     * @return     {dbdictField}
     */
    addExpression : function(fieldname) {
        
        var type = 11;

        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : {}
        };

        return this.addField( properties ); 
    }, 

    /**
     * Adds an array of number.
     *
     * @param      {string}  fieldname   The fieldname
     * @param      {Object}  attributes  The attributes
     *
     * @return     {dbdictField}
     */
    addArrayOfNumber : function(fieldname) {
        return this.addArray(fieldname, function(item) {
            item.addNumber(fieldname);
        });
    },

    /**
     * Adds an array of character.
     *
     * @param      {string}  fieldname   The fieldname
     * @param      {Object}  attributes  The attributes
     *
     * @return     {dbdictField}
     */
    addArrayOfCharacter : function(fieldname) {
        return this.addArray(fieldname, function(item) {
            item.addCharacter(fieldname);
        });
    },

    /**
     * Adds an array of datetime.
     *
     * @param      {string}  fieldname   The fieldname
     * @param      {Object}  attributes  The attributes
     *
     * @return     {dbdictField}
     */
    addArrayOfDatetime : function(fieldname) {
        return this.addArray(fieldname, function(item) {
            item.addDatetime(fieldname);
        });
    },

    /**
     * Adds an array of logical.
     *
     * @param      {string}  fieldname   The fieldname
     * @param      {Object}  attributes  The attributes
     *
     * @return     {dbdictField}
     */
    addArrayOfLogical : function(fieldname) {
        return this.addArray(fieldname, function(item) {
            item.addLogical(fieldname);
        });
    },

    /**
     * Adds an unique key.
     *
     * @param      {Array}  fields  The fields
     *
     * @return     {dbdictKey}
     */
    addUniqueKey : function(fields) {
        
        var type = 12;

        var properties = {
            'name' : fields,
            'flags' : type,
            'attributes' : []
        };

        return this.addKey( properties ); 
    },

    /**
     * Adds no null key.
     *
     * @param      {Array}  fields  The fields
     *
     * @return     {dbdictKey}
     */
    addNoNullKey : function(fields) {
        
        var type = 4;

        var properties = {
            'name' : fields,
            'flags' : type,
            'attributes' : []
        };

        return this.addKey( properties ); 
    },

    /**
     * Adds a primary key.
     *
     * @param      {Array}  fields  The fields
     *
     * @return     {dbdictKey}
     */
    addPrimaryKey : function(fields) {
        
        var type = 28;

        var properties = {
            'name' : fields,
            'flags' : type,
            'attributes' : []
        };

        return this.addKey( properties ); 
    },

    /**
     * Adds no duplicate key.
     *
     * @param      {Array}  fields  The fields
     *
     * @return     {dbdictKey}
     */
    addNoDuplicateKey : function(fields) {
        
        var type = 8;

        var properties = {
            'name' : fields,
            'flags' : type,
            'attributes' : []
        };

        return this.addKey( properties ); 
    },

    /**
     * Adds a null duplicate key.
     *
     * @param      {Array}  fields  The fields
     *
     * @return     {dbdictKey}
     */
    addNullDuplicateKey : function(fields) {
        
        var type = 0;

        var properties = {
            'name' : fields,
            'flags' : type,
            'attributes' : []
        };

        return this.addKey( properties ); 
    },

    /**
     * Helper function to add the sysmod* fields
     * without defining each field 
     */
    withSysmodFields : function() {
        this.addNumber('sysmodcount');
        this.addCharacter('sysmoduser');
        this.addDatetime('sysmodtime');
    },

    /**
     * Gets the fields.
     *
     * @return     {Array}  The fields.
     */
    getFields : function() {
        return this.fields;
    },

    /**
     * Gets the keys.
     *
     * @return     {Array}  The keys.
     */
    getKeys : function() {
        return this.keys;
    },

    /**
     * Checks if a field already exists in the dbdict
     *
     * @param      {Character}  cName   The name
     *
     * @return     {boolean}
     */
    fieldExists : function(cName) {
        var objField = _.findWhere(this.dbdictObject['instance']['field'], {'name': cName});
        return (_.isUndefined(objField)) ? false : true;
    }
});

var dbdictField = classier.$extend({

    _class : "dbdictField",

    /**
     * Init Function
     *
     * @param      {Object}  properties  The properties
     */
    __init__ : function(properties) {
        this.children = [];
        this.level = 0;
        this.index = 0;
        this.useExistingIndex = (properties['attributes']['useExistingIndex']) ? properties['attributes']['useExistingIndex'] : false;
        this.sqlInfo = new sqlInfo();
    },

    /**
     * Adds a field.
     *
     * @param      {Object}  properties  The properties
     *
     * @return     {dbdictField}
     */
    addField : function(properties) {

        properties['sql.field.options'] = {};

        var field = new this.$class(properties);
        this.children.push(field);

        return field;
    },

    /**
     * Adds a number field
     *
     * @param      {string}  fieldname   The fieldname
     * @param      {Object}  attributes  The attributes
     *
     * @return     {dbdictField}
     */
    addNumber : function(fieldname) {

        var type = 1;

        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : {}
        };

        return this.addField( properties ); 
    },

    /**
     * Adds a character.
     *
     * @param      {string}  fieldname   The fieldname
     * @param      {Object}  attributes  The attributes
     *
     * @return     {dbdictField}
     */
    addCharacter : function(fieldname) {

        var type = 2;

        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : {}
        };

        return this.addField( properties ); 
    },

    /**
     * Adds a date/time field
     *
     * @param      {string}  fieldname   The fieldname
     * @param      {Object}  attributes  The attributes
     *
     * @return     {dbdictField}
     */
    addDatetime : function(fieldname) {
        
        var type = 3;

        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : {}
        };

        return this.addField( properties ); 
    },

    /**
     * Adds a logicla field
     *
     * @param      {string}  fieldname   The fieldname
     * @param      {Object}  attributes  The attributes
     *
     * @return     {dbdictField}
     */
    addLogical : function(fieldname) {
        
        var type = 4;

        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : {}
        };

        return this.addField( properties ); 
    },

    /**
     * Adds an array field
     *
     * @param      {string}  fieldname   The fieldname
     * @param      {Object}  attributes  The attributes
     * @param      {Function}  callback    The callback
     *
     * @return     {dbdictField}
     */
    addArray : function(fieldname, callback) {
        
        var type = 8;

        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : {}
        };

        var field = this.addField( properties ); 

        if( typeof callback === 'function') {
            return callback.call(this, field);
        }

        return field;
    },

    /**
     * Adds a structure field
     *
     * @param      {string}  fieldname   The fieldname
     * @param      {Object}  attributes  The attributes
     * @param      {Function}  callback    The callback
     *
     * @return     {dbdictField}
     */
    addStructure : function(fieldname, callback) {
        
        var type = 9;
        
        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : {}
        };

        var field = this.addField( properties ); 
        
        if( typeof callback === 'function') {
            return callback.call(this, field);
        }

        return field;
    },

    /**
     * Adds an expression field.
     *
     * @param      {string}  fieldname   The fieldname
     * @param      {Object}  attributes  The attributes
     *
     * @return     {dbdictField}
     */
    addExpression : function(fieldname) {
        
        var type = 11;

        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : {}
        };

        return this.addField( properties ); 
    }, 
    
    /**
     * Adds an array of number.
     *
     * @param      {string}  fieldname   The fieldname
     * @param      {Object}  attributes  The attributes
     *
     * @return     {dbdictField}
     */
    addArrayOfNumber : function(fieldname) {
        return this.addArray(fieldname, function(item) {
            item.addNumber(fieldname);
        });
    },

    /**
     * Adds an array of character.
     *
     * @param      {string}  fieldname   The fieldname
     * @param      {Object}  attributes  The attributes
     *
     * @return     {dbdictField}
     */
    addArrayOfCharacter : function(fieldname) {
        return this.addArray(fieldname, function(item) {
            item.addCharacter(fieldname);
        });
    },

    /**
     * Adds an array of datetime.
     *
     * @param      {string}  fieldname   The fieldname
     * @param      {Object}  attributes  The attributes
     *
     * @return     {dbdictField}
     */
    addArrayOfDatetime : function(fieldname) {
        return this.addArray(fieldname, function(item) {
            item.addDatetime(fieldname);
        });
    },

    /**
     * Adds an array of logical.
     *
     * @param      {string}  fieldname   The fieldname
     * @param      {Object}  attributes  The attributes
     *
     * @return     {dbdictField}
     */
    addArrayOfLogical : function(fieldname) {
        return this.addArray(fieldname, function(item) {
            item.addLogical(fieldname);
        });
    },

    /**
     * Sets the sql type.
     *
     * @param      {string}  sqltype  The sql type
     *
     * @return     {dbdictfield}
     */
    setSqlType : function(sqltype) {
        this['sql.field.options']['sql.data.type'] = sqltype;
        return this;
    },

    /**
     * Sets the sql field name.
     *
     * @param      {string}  sqlname  The sql field name
     *
     * @return     {dbdictfield}
     */
    setSqlName : function(sqlname) {
        this['sql.field.options']['sql.column.name'] = sqlname;
        return this;
    },

    /**
     * Sets the sql table.
     *
     * @param      {string}  sqltable  The sql table
     *
     * @return     {dbdictfield}
     */
    setSqlTable : function(sqltable) {
        this['sql.field.options']['sql.table.alias'] = sqltable;
        return this;
    },

    /**
     * Determines if it has children.
     *
     * @return     {Boolean}  True if has children, False otherwise.
     */
    hasChildren : function() {
        return !_.isEmpty(this.children);
    },

    /**
     * Sets the level.
     *
     * @param      {integer}  level   The level
     *
     * @return     {Object}
     */
    setLevel : function(level) {
        this.level = level;
        return this;
    },

    /**
     * Sets the index.
     *
     * @param      {integer}  index   The index
     *
     * @return     {Object}
     */
    setIndex : function(index) {
        this.index = index;
        return this;
    },

    /**
     * Gets the level.
     *
     * @return     {integer}  The level.
     */
    getLevel : function() {
        return this.level;
    },

    /**
     * Gets the index.
     *
     * @return     {integer}  The index.
     */
    getIndex : function() {
        return this.index;
    }
});

var dbdictKey = classier.$extend({

    _class : "dbdictKey",

    /**
     * Init Function
     *
     * @param      {Object}  properties  The properties
     */
    __init__ : function(properties) {
    }
});

var sqlInfo = classier.$extend({
    _class : "sqlInfo",

    /**
     * Init Function
     */
    __init__ : function() {
        this.sqlInfo = this.getSqlInfo();
    }, 

    /**
     * Gets the sql information.
     *
     * @return     {Object}  The sql information.
     */
    getSqlInfo : function() {
        var objDbInfo = $('sqldbinfo').select('sql.db.type="'+ system.functions.dbdict_helper("db.type") +'"');
        var objFile = {};

        if(objDbInfo.success) {
            var xmlNode = objDbInfo['scfile'].getXML();
            objFile = new Parser(xmlNode).toJSON();
        }

        return objFile['instance'];
    },

    /**
     * Gets the sql type.
     * 
     * @author     yim OHG, https://www.y-im.de, info@y-im.de
     *
     * @param      {integer}  type  The field type
     *
     * @return     {string}  The sql type.
     */
    getSQLType : function( nFieldType ) {

        var cSQLType = this.getFallbackSqlType();

        var objType = _.find(this.getSqlInfo['data.types'], function(type) { 
            return type['p4.type'] == nFieldType; 
        });

        if( objType ) {
            cSQLType = ( this.useUppercase() ) ? objType['sql.type'].toUpperCase() : objType['sql.type'];
        }
        
        return cSQLType;
    },

    /**
     * Gets the fallback sql type.
     *
     * @return     {string}  The fallback sql type.
     */
    getFallbackSqlType : function() {
        var objType = _.find(this.sqlInfo['data.types'], function(type) { 
            return type['p4.type'] == 2; 
        });

        var cSQLType = (this.useUppercase() ) ? objType['sql.type'].toUpperCase() : objType['sql.type'];

        return cSQLType;  
    },

    /**
     * Determines if the sql types should be uppercase
     *
     * @return     {Boolean}
     */
    useUppercase : function() {
        return system.functions.val(system.functions.nullsub(this.sqlInfo['uppercase.flg'], false),4) == true;
    },

    /**
     * Determines if the defined field type has the "Get Size" option.
     *
     * @param      {Number}   nFieldType  The field type
     *
     * @return     {Boolean}  True if has size, False otherwise.
     */
    hasSize : function(nFieldType) {

        var objType = _.find(this.sqlInfo['data.types'], function(type) { 
            return type['p4.type'] == nFieldType; 
        });

        return system.functions.val(system.functions.nullsub(objType['get.size'], false),4) == true;
    }
});

/**
 * Dbdict to Object Parser
 * Copied from SL debugUtils
 *
 * @param      {XML}  node    SCFile as XML 
 *
 * @return     {Object}  Converted SCFile
 */
var Parser = function(node) {
    this.toJSON = function() {
        var result = {};
        foreach(node, function(node) { processField(node, result); });
        return result;
    };

    function foreach(node, action) {
        var node = node.getFirstChildElement();
        while (node != null) {
            action(node);
            node = node.getNextSiblingElement();
        }
    }

    function processField(node, result) {
        var name = node.getNodeName();
        result[name] = processFieldValue(node);
    }

    function processFieldValue(node) {
        var result = null;
        switch (node.getAttributeValue("type") || node.getAttributeValue("sctype")) {
            case "":
            case "structure":
                result = {};
                foreach(node, function(node) { processField(node, result); });
                break;
            case "array":
                result = [];
                foreach(node, function(node) { result.push(processFieldValue(node)); });
                break;
            default:
                result = node.getNodeValue();
                break;
        }
        return result;
    }
};

function getClass() {
    return tableBuilder;
}
//
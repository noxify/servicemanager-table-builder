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
    },

    /**
     * Wrapper to define the fields, keys and other stuff
     * 
     * It handles all other method calls to make it as easy as possible
     *
     * @param      {String}     name      The table name
     * @param      {Function}   callback  The callback
     */
    make : function(name, callback) {
        
        try {
            this.define(name, callback);
            this.createTable(name);
        } catch(e) {
            print(e);
        } finally {
            this.cleanup();
        }

        return 
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
        var builder = new factoryClass();

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
            dbdict         = new SCFile('dbdict');
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
     * Converts the given Definition of fields and keys
     * and adds also the descriptor field
     *
     * @param      {String}  name    The table name
     */
    convertDefinition : function(name) {
        
        var objTable = this.getDefintion(name);
        
        this.convertFields( objTable['fields']);
        this.convertKeys( objTable['keys']);

        if( !this.hasDescriptor() ) {
            this.addDescriptor();
        }

        return this;
    },

    /**
     * Converts each key definition to a usable object for HPSM
     *
     * @param      {Object}  fields  The fields
     * @param      {Object}  parent  The parent
     * 
     * @return     {Object}
     */
    convertFields : function( fields, parent ) {
        var that = this;

        var level = (parent) ? parent.getLevel()+1 : 1;
        var index = 1; 

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
     * Remove all temporary generated stuff
     * Without this, we will have some memory leaks ;)
     */
    cleanup : function() {
        this.definedTables = {};
        this.convertedFields = [];
        this.convertedKeys = [];
    }
});

var factoryClass = classier.$extend({

    _class : "factoryClass",

    /**
     * Init Function
     */
    __init__ : function() {
        this.fields = [];
        this.keys = [];
    },

    /**
     * Adds a field.
     *
     * @param      {Object}       properties  The properties
     *
     * @return     {dbdictField}
     */
    addField : function(properties) {
        var field = new dbdictField(properties);
        this.fields.push(field);
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
    addNumber : function(fieldname, attributes) {
        var type = 1;

        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : (attributes) ? attributes : {}
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
    addCharacter : function(fieldname, attributes) {
        var type = 2;

        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : (attributes) ? attributes : {}
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
    addDatetime : function(fieldname, attributes) {
        var type = 3;

        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : (attributes) ? attributes : {}
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
    addLogical : function(fieldname, attributes) {
        var type = 4;

        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : (attributes) ? attributes : {}
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
    addArray : function(fieldname, attributes, callback) {
        var type = 8;

        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : (attributes) ? attributes : {}
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
    addStructure : function(fieldname, attributes, callback) {
        var type = 9;

        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : (attributes) ? attributes : {}
        };

        var field = this.addField( properties ); 

        if( typeof callback === 'function') {
            return callback.call(this, field);
        }

        return field;
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
     * Gets the sql type.
     * 
     * @author     yim OHG, https://www.y-im.de, info@y-im.de
     *
     * @param      {integer}  type  The field type
     *
     * @return     {string}  The sql type.
     */
    getSQLType : function( nFieldType ) {

        var cSQLType = "NVARCHAR";
        var objDbInfo = $('sqldbinfo').select('sql.db.type="'+ system.functions.dbdict_helper("db.type") +'"');

        if(objDbInfo.success) {

            var objType = _.find(objDbInfo['scfile']['data.types'], function(type){ return type['p4.type'] == nFieldType; });
            if( objType ) {
                cSQLType = objType['sql.type'].toUpperCase();
            }
            
        } 

        return cSQLType;
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
    },

    /**
     * Adds a field.
     *
     * @param      {Object}  properties  The properties
     *
     * @return     {dbdictField}
     */
    addField : function(properties) {
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
    addNumber : function(fieldname, attributes) {
        var type = 1;
        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : (attributes) ? attributes : {}
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
    addCharacter : function(fieldname, attributes) {
        var type = 2;
        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : (attributes) ? attributes : {},
            'sql.field.options': {
               'sql.data.type': this.getSQLType(type),
            },
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
    addDatetime : function(fieldname, attributes) {
        var type = 3;

        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : (attributes) ? attributes : {}
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
    addLogical : function(fieldname, attributes) {
        var type = 4;

        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : (attributes) ? attributes : {}
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
    addArray : function(fieldname, attributes, callback) {
        var type = 8;

        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : (attributes) ? attributes : {}
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
    addStructure : function(fieldname, attributes, callback) {
        var type = 9;
        var properties = {
            'name' : fieldname,
            'type' : type,
            'attributes' : (attributes) ? attributes : {}
        };

        var field = this.addField( properties ); 
        
        if( typeof callback === 'function') {
            return callback.call(this, field);
        }

        return field;
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
    getSQLType : function( type ) {

        var sqltype = "NVARCHAR";
        var objDbInfo = $('sqldbinfo').select('sql.db.type="'+ system.functions.dbdict_helper("db.type") +'"');

        if(objDbInfo.success) {

            var objType = _.find(objDbInfo['scfile']['data.types'], function(dataType){ return dataType['p4.type'] == type; });
            if( objType ) {
                sqltype = objType['sql.type'].toUpperCase();
            }
            
        } 

        return sqltype;
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


function getClass() {
    return tableBuilder;
}
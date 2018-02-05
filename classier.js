/*
  classier v 1.5
  © 2014 Thomas Frank, Nodebite AB
  
  Redistribution and use in source and binary forms, with or without
  modification, are permitted free of charge. MIT licensed:
  http://opensource.org/licenses/MIT

  This library is similar in functionality to (but not sharing code from): 
  Classy - http://classy.pocoo.org/

  No code is is shared between the libraries, but none the less a comparison:
    - Classy's syntax (v 1.4) can be used from v. 1.5 of createClass
      (optional instead of createClass original syntax)
  but createClass is:
    - using a slightly more modern inheritance system based on Object.create
      (in practice this does not make it neither faster nor slower...)
  and is also allows for:
    - named class constructors (facilitating debugging - your objects 
      will show up with class names in the console)
    - private and protected properties in all modern browsers supporting the 
      Object.defineProperty (degrading smoothly to public properties elsewhere)
      (this comes at a slight speed penalty when used, not otherwise)
*/

/* jshint 
  evil: true,
  regexdash: true,
  browser: true,
  wsh: true,
  trailing: true,
  sub: true,
  expr: true,
  noarg: false,
  forin: false
*/
var JSON 				= system.library.JSON.json();

var instance = {};
(function(){

  // Settings
  var settingsGetterSetter, settings = (function(){
    
    var defaultSettings = {
      extendObjectWithHelpers : false,
      originalSyntaxCompatible: true,
      ClassyCompatible: true,
      automaticClassNaming: true,
      privateAndProtectedProperties: true,
      lastArgToInitIsObjProps: true,
      privatePropertyPrefix: '__',
      protectedPropertyPrefix: '_',
      optimizeInitIfOnlyPublicProps: true
    };

    // Extend default settings with initial user settings
    var userSettings = (Object.createClass || this.Class || {}).settings;
    for(var i in userSettings){defaultSettings[i] = userSettings[i];}

    // A getter/setter for settings
    settingsGetterSetter = function(x){
      x && (settings = Obj.extend(settings,x));
      return settings;
    };

    return defaultSettings;
  })();
 
  // Obj will be an alias for Object if extendObjectWithHelpers
  // otherwise it will just be a new generic object
  var Obj = settings.extendObjectWithHelpers ? Object : {};

  // Define Object.create if it is not implemented natively
  // (regardless of settings)
  Object.create  ||  (Object.create = function (o) {
    function F() {}
    F.prototype = o;
    return new F();
  });

  // Deep copy using Object.create and JSON.stringify
  Obj.createDeep = function(org){
    _friendly = true;
    var a, o = Object.create(org);
    for(var i in o){
      if(typeof o[i] == "object"){
        !a && (a = JSON.parse(JSON.stringify(org)));
        o[i] = a[i];
      }
    }
    _friendly = false;
    return o;
  };

  // Extend an object with new properties
  Obj.extend = function(obj,props){
    for(var i in props){
      obj[i] = props[i];
    }
    return obj;
  };

  // Create a class
  Obj.createClass = function(props){
    var obj = {}, className = props._class || '_', empty_obj = {};
    var ccsettings = props._settings, addToStatic = {}, noInit = {}, deep = false;
    var mixins = props.__include__;
    // Be forgiving with the data type for mixins
    (mixins && mixins.constructor === Array) || (mixins = mixins ? [mixins] : []);
    // If no classname is set try to get it from source code
    settings.automaticClassNaming && (className = _getClassName(className));
    // Inheritance, statics and mixins
    obj = _setupInheritance(props,obj,addToStatic,mixins);
    // Handle private and protected properties
    _handlePrivateAndProtected(obj);
    // Precheck if createDeep is needed
    deep = _createDeepNeeded(obj);
    // Generic constructor
    var func = function(){
      var lastArg = arguments[arguments.length-1];
      // Use Object.create for fast prototypical inheritance
      var o = deep ? Obj.createDeep(obj) : Object.create(obj);
      // Run init method if it exists and not bypassad by noInit
      if(lastArg === noInit){return o;}
      settings.originalSyntaxCompatible &&
        typeof o.init == "function" && o.init.apply(o,arguments);
      settings.ClassyCompatible &&
        typeof o.__init__ == "function" && o.__init__.apply(o,arguments);
      // Implement setting properties through a settings object (if _settings is not false)
      if(settings.lastArgToInitIsObjProps && ccsettings!==false &&
         lastArg && lastArg.constructor === empty_obj.constructor){
        _restrictedExtend(o,lastArg);
      }
      // return a new instance
      return o;
    };
    // Named constructor
    eval("obj.constructor = function " + className + "(){return func.apply(this,arguments)}");
    obj.constructor.toString = function(){ return "class " + className; };
    // Remember the class properties (that we need to create instances with Object.create)
    obj.constructor._obj = func._obj = obj;
    // Add Classy stuff
    _classyStuff(obj,func,noInit);
    // Add static properties
    _restrictedExtend(obj.constructor,addToStatic);
    // Fix the constructor.prototype.chain, make instanceof work
    obj.constructor.prototype = func._obj;
    // Return the named constructor
    return obj.constructor;
  };

  // make compatible with original syntax that is using Object.createClass
  settings.originalSyntaxCompatible &&
    (Object.createClass = Obj.createClass) &&
    (Obj.createClass._settings = settingsGetterSetter);

  // Create $extend, $withData methods for classes
  // as well as a alias for the constructor $class
  var _classyStuff = function(obj,func,noInit){
    if(settings.ClassyCompatible){
       obj.constructor.$extend = func.$extend = function(objx){
         objx._extends = obj.constructor;
         return Obj.createClass(objx);
       };
       obj.constructor.$withData = function(objx){
         var o = _restrictedExtend(obj.constructor(noInit),objx);
         _clean(o);
         return o;
       };
       obj.$class = obj.constructor;
    }
  };

  // precheck if createDeep is needed on instantiation
  var _createDeepNeeded = function(obj){
    var i, deep;
    _friendly = true;
    for(i in obj){
      if(
        i == "constructor" || i == "init" || i == "__init__" ||
        i == "_super" || i == "$super" || i == "__classvars__"
      ){continue;}
      if (typeof obj[i] == "object"){
        deep = true;
      }
    }
    _friendly = false;
  };

  // Inheritance - setup inheritance, static properties and mixins
  var _setupInheritance = function(props,obj,addToStatic,mixins){
    var i, extendObj;
    // If no explicit inheritance and not a _baseClass then inherit base class
    !props._extends && !props._baseClass && (props._extends = Class);
    // Extend
    if(props._extends){
      extendObj = props._extends._obj;
      obj = Obj.createDeep(extendObj);
    }
    // Static properties (can not be private/protected)
    for(i in props._extends){
      !Class.hasOwnProperty(i) && (addToStatic[i] = props._extends[i]);
    }
    settings.originalSyntaxCompatible && Obj.extend(addToStatic,props._static);
    settings.ClassyCompatible && Obj.extend(addToStatic,props.__classvars__);
    // Delete special properties (only intended to control Object.create Class)
    delete props._class;
    delete props._extends;
    delete props._settings;
    delete props._baseClass;
    delete props.__include__;
    // Check if init needs cleaning
    i  = props.init || props.__init__ || {};
    i._skipCleaning = !_checkIfInitNeedsCleaning(props.init||props.__init__);
    // Wrap all functions
    for(i in props){
      if(typeof props[i] == "function" && i!="_super" && i!="$super"){
        props[i] = _wrap(props[i]);
        // remember $super
        typeof extendObj[i] == "function" && (props[i].__super__ = extendObj[i]);
      }
    }
    // Add class specific properties
    obj = Obj.extend(obj,props);
    // Add mixins
    for(i = 0; i < mixins.length; i++){
      _restrictedExtend(obj,mixins[i]);
    }
    return obj;
  };
 
  // handle private and protected properties
  var _handlePrivateAndProtected = function(obj){
    if(Object.defineProperty &&  settings.privateAndProtectedProperties){
      for(var i in obj){
        if(i.substring(i.length-2) == "__"){continue;}
        if(!obj.hasOwnProperty(i) && i.indexOf(settings.privatePropertyPrefix) === 0){
          // private properties only - make them no inheritable
          try {
            Object.defineProperty(obj,i,{value:undefined,writable:true});
          }
          catch(e){
            // Old IE's die hard ;)
          }
          continue;
        }
        if(!obj.hasOwnProperty(i)){continue;}
        // private and protected properties
        if((i.indexOf(settings.protectedPropertyPrefix) === 0 ||
            i.indexOf(settings.privatePropertyPrefix) === 0) &&
            i!='__init__' && i!="_super"){
          _definePrivateProp(obj,i,obj[i]);
        }
      }
    }
  };

  // this keeps private and protected properties under a shield
  var _friendly = false;
  var _definePrivateProp = function(obj,propName,propVal){
    try {
      Object.defineProperty(obj, propName, {
        get: function() {
          if(_friendly || _protector(this,propName)){return propVal;}
        },
        set: function(x) {
          if(_friendly || _protector(this,propName)){
            this.hasOwnProperty(propName) ?
              (propVal = x) : _definePrivateProp(this,propName,x);
          }
        }
      });
    } catch(e){
      // Old IE:s die hard ;)
    }
  };
  var _protector = function(obj,propName){
    _friendly = true;
    var a = arguments.callee.caller;
    while(a){
      for(var i in obj){
        if(obj[i] === a){_friendly = false; return true;}
      }
      a = a.caller;
    }
    _friendly = false;
    throw(new ReferenceError(
      'You can not access the ' +
      (propName.indexOf(settings.privatePropertyPrefix) === 0 ?
        'private' : 'protected'
      ) +
      ' property ' + propName
    ));
  };

  // _wrap - wrap all functions 
  // primarily to catch private/protected props not in prototype
  var _wrap = function(func){
    var f = function(){
      var x = func.apply(this,arguments);
      !func._skipCleaning && _clean(this);
      return x;
    };
    f.toString = function(){return func+'';};
    return f;
  };

  // Clean away private/protected properties defined
  // in methods - so that they really become private/protected
  var _clean = function(obj){
    for(var i in obj){
      var val;
      if(!obj.hasOwnProperty(i)){continue;}
      if(
        (i.indexOf(settings.privatePropertyPrefix) === 0 ||
        i.indexOf(settings.protectedPropertyPrefix) === 0) &&
        i.substring(i.length-2) != "__"
      ){
        val = obj[i];
        delete obj[i];
        _definePrivateProp(obj,i,val);
      }
    }
  };

  // Cleaning takes time (specially when in init-method
  // and creating >10000 objects...) - so check if we can do without
  // in init
  var _checkIfInitNeedsCleaning = function(initFunc){
    if(!settings.optimizeInitIfOnlyPublicProps){return true;}
    var s = initFunc + '';
    // regexp check
    // (to dangerous to actually run init - might change other states)
    var s1 = settings.privatePropertyPrefix;
    var s2 = settings.protectedPropertyPrefix;
    var r1 = new RegExp("this." + s1,"g");
    var r2 = new RegExp("this." + s2,"g");
    var r3 = new RegExp("this\\s*\\[\\s*(\"|')" + s1,"g");
    var r4 = new RegExp("this\\s*\\[\\s*(\"|')" + s2,"g");
    var needed = s.match(r1) || s.match(r2) || s.match(r3) || s.match(r4);
    return !!needed;
  };

  // Restricted extend (without "magic methods") - so that we
  // can safely use mixins etc with class instances as input
  var _restrictedExtend = function(obj,props){
    for(var i in props){
      if(
        i == "constructor" || i == "init" || i == "__init__" ||
        i == "_super" || i == "$super" || i == "__classvars__"
      ){continue;}
      try {obj[i] = props[i];} catch(e){}
    }
    return obj;
  };

  // get classname from source code
  var _getClassName = function(classNameIn){
    // if we have a name from _class property then use it
    if(classNameIn != "_"){ return classNameIn; }
    // use the error stack to find the right script and line
    var stack;
    try{
       throw new Error();
    }
    catch(e){
      stack = e.stack;
      if(!stack){return "_";}
      var l = (stack+'').split(/at|\@/).pop().split(':');
      if(!isNaN(parseInt(l[l.length-2],10))){l.pop();}
      // extract url and approximate line
      var line = l.pop();
      var url = l.join(':');
      print("url: "+e.stack);
      url = url.substring(url.indexOf('(') + 1);
      // get the source code
      var src = _getFile(url).split('\n');
      // find the correct line
      for(var i = line; i >= 0; i--){
        if(!src[i]){ continue; }
        src[i] = src[i].split(/Object[^\n]*createClass/).join('.$extend');
        if(src[i].indexOf('$extend')>=0){
          break;
        }
      }
      return _extractClassName(src,i);
    }
  };

  // extract a class name from code (helper to _getClassName)
  var _extractClassName = function(src,i){
    // find the correct variable/property to use as class name
    while(src.length > i+1){src.pop();}
    src = src.join().split(':').join('=').split('');
    while(src.length && src.pop() != '='){}
    while(src.length && !(i = src.pop()).replace(/\W/g,'')){}
    src.push(i);
    i = "";
    while(src.length && !(i += src.pop()).replace(/\w/g,'')){}
    i = i.split('').reverse().join('').substring(1);
    i = i.replace(/\W/g,'') || '_';
    return i || '_';
  };

  // synchronous ajax - _getFile
  var fileMem = {};
  
  /*var _getFile = function (url) {
    if(fileMem[url]){ return fileMem[url]; }
    var AJAX;
    if (window.XMLHttpRequest) {
      AJAX=new XMLHttpRequest();
    } else {
      AJAX=new window.ActiveXObject("Microsoft.XMLHTTP");
    }
    if (AJAX) {
       AJAX.open("GET", url, false);
       AJAX.send(null);
       fileMem[url] = AJAX.responseText;
       return fileMem[url];
    } else {
       return false;
    }
  };*/
  _getFile = function(url) {
    return false;
  }

  // _super - lets us adress super class methods 
  // even though they are overridden
  var _super = function $super(){
    return arguments.callee.caller.caller.
      __super__.apply(this,arguments);
  };

  // Base class
  var Class = Obj.createClass({
    _class: "Class",
    _baseClass: true,
    _super: settings.originalSyntaxCompatible && _super,
    $super : settings.ClassyCompatible && _super
  });

  // Make compatible with Classy:s global
  settings.ClassyCompatible && (function(){
    this.Class = Class;
    Class.$noConflict = function(){
      delete window.Class;
      return Class;
    };
    Class.$classyVersion = "1.4";
    Class.$classierVersion = "1.5";
    Class.$settings = settingsGetterSetter;
  })();

}).call(instance);

function getClass() {
	return Class;
}